import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db/mongo.js";
import { generateBlogPost } from "./gemini.js";
import { parseContent } from "./parse.js";
import { Authrouter } from "./auth/authentication.js";
import { UserRouter } from "./Routes/userRouter.js";
import { AuthMiddleWare } from "./auth/middleware.js";
import cookieParser from "cookie-parser";
import { generateImage } from "./geminiGenerateImage.js";
import { uploadImageToWordPress } from "./wordpress.js";
import UserSchema from "./models/UserSchema.js";
import passport from "passport";
import { replaceImagePlaceholders } from "./geminiGenerateImage.js";
import sleep from "sleep-promise";
import { generateFeaturedImage } from "./geminiGenerateImage.js";
import WordpressRouter from "./wordpress.js";
import { decryptText } from "../utils/crypto.js";
import { getOrCreateCategory } from "./wordpress.js";
import transporter from "./config/nodeMailer.js";
import redisClient from "./config/redis.js";
import { getCategoryName } from "./wordpress.js";
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import csurf from 'csurf';
import sanitizeHtml from 'sanitize-html';




dotenv.config();

const app = express();
app.enable("trust proxy");

const apiLimiter = rateLimit({
  windowMs: 15*60*1000, // 15 min
  max: 100, // IP başına 100 istek
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      
    }
  }
}));

app.use(csurf({ cookie: true }));


app.use(cors({
  origin: [
    "https://autonomous-blog-app-9oron.ondigitalocean.app",
    "http://autonomous-blog-app-9oron.ondigitalocean.app",
    "http://localhost:5173", 
  ],
  credentials: true,
}));

app.use(express.json());

app.use(cookieParser());

app.use(passport.initialize());

app.use('/api/users',UserRouter)
app.use('/api/auth',Authrouter)
app.use('/api/wordpress',WordpressRouter)


connectDB()


app.get("/", (req, res) => {
  res.send("Otonom Blog Servisi Çalışıyor 🚀");
 
});



app.post("/generate-and-post", AuthMiddleWare,async (req, res) => {

  const user = await UserSchema.findById(req.user.id);
  if (!user.wordpressUrl || !user.wordpressPassword || !user.wordpressUser) {
    return res.status(400).json({
      message: "WordPress hesabı bağlanmamış. Lütfen önce ayarlardan ekleyin."
    });
  }

  const DecryptedPassword=decryptText(user.wordpressPassword)
  
    try {
      const {category,title } = req.body;

      const categoryId = await getOrCreateCategory(category,user.wordpressUser,user.wordpressPassword,user.wordpressUrl);
      console.log("category created succesfully",categoryId)

  
      const content = await generateBlogPost(category,title);
      await sleep(500)
      const parsed = parseContent(content);
      await sleep(500)
      let contentWithImages = await replaceImagePlaceholders(content, parsed.title, category,3,user);
      await sleep(500)
      const finalParsed = parseContent(contentWithImages);
  
     
      const FeaturedPrompt = `${finalParsed.title} başlıklı ${category} kategorisinde yer alan bir blog yazısı için estetik, modern ve profesyonel bir featured image oluştur.Olabildiğince yazı kullanma.Eğer kullanırsan da yazım yanlışı yapma.`;
  
      const featuredImageUrl = await generateFeaturedImage(FeaturedPrompt, 3);
      let featuredResponse = null;
      if (featuredImageUrl) {
        featuredResponse = await uploadImageToWordPress(featuredImageUrl,user.wordpressUrl,DecryptedPassword,user.wordpressUser);
        console.log(`✅ Featured image yüklendi: ${featuredResponse.id}`);
        await new Promise(r => setTimeout(r, 2000)); // WP'nin meta işlemini beklet
      }
  
     
      const postContent = `
        ${finalParsed.sections.map(s => `<h2 style="margin:10px">${s.subtitle}</h2>${s.content}`).join("")}
        <h2 style="margin:10px">Sonuç</h2>
        ${finalParsed.conclusion}
      `;

      const safePostContent = sanitizeHtml(postContent, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img','h1','h2']),
        allowedAttributes: {
          '*': ['class','id','style'],
          'img': ['src','alt']
        }
      });
  
      const wpResponse = await fetch(`${user.wordpressUrl}/wp-json/wp/v2/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization":
            "Basic " + Buffer.from(`${user.wordpressUser}:${DecryptedPassword}`).toString("base64"),
        },
        body: JSON.stringify({
          title: finalParsed.title || "Başlıksız Yazı",
          content: safePostContent,
          status: "publish",
          categories: [categoryId],

        }),
      });

      if (!wpResponse.ok) {
        const errText = await wpResponse.text();
        console.error("❌ WP Error:", wpResponse.status, errText.slice(0, 500));
        throw new Error(`WP POST failed (${wpResponse.status})`);
      }
  
      const postData = await wpResponse.json();
      const postId = postData.id;
      const postUrl = postData.link;        // 🆕 Post linki
      const publishDate = postData.date;    // 🆕 Yayın tarihi
      console.log(`✅ Post oluşturuldu: ${postId}`);
  
      if (featuredResponse && featuredResponse.id && postId) {
        await fetch(`${user.wordpressUrl}/wp-json/wp/v2/posts/${postId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization":
              "Basic " + Buffer.from(`${user.wordpressUser}:${DecryptedPassword}`).toString("base64"),
          },
          body: JSON.stringify({
            featured_media: featuredResponse.id,
          }),
        });
        console.log(`✅ Featured image (${featuredResponse.id}) post #${postId} için eklendi`);
      }

      await redisClient.del(`summary:${user.wordpressUrl}`);
      await redisClient.del(`BlogPosts:${user.wordpressUrl}`);



      if(user.notifications.emailOnPublish){

        const emailOptions = {
          from: process.env.SENDER_EMAIL,
          to: user.email,
          subject: "🎉 Yeni Blogunuz Yayınlandı!",
          html: `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Blog Yayınlandı</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #0f172a;">
                <tr>
                  <td align="center" style="padding: 40px 20px;">
                    <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #1e293b 0%, #312e81 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);">
                      
                      <!-- Header -->
                      <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%);">
                          <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                            </svg>
                          </div>
                          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);">
                            AutoBlog
                          </h1>
                        </td>
                      </tr>
        
                      <!-- Success Icon -->
                      <tr>
                        <td style="padding: 40px 40px 20px; text-align: center;">
                          <div style="display: inline-block; background: rgba(34, 197, 94, 0.2); padding: 20px; border-radius: 50%; margin-bottom: 20px;">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                              <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                          </div>
                          <h2 style="margin: 0 0 10px; color: #ffffff; font-size: 32px; font-weight: 700;">
                            Tebrikler! 🎉
                          </h2>
                          <p style="margin: 0; color: #94a3b8; font-size: 16px; line-height: 1.6;">
                            Blogunuz başarıyla yayınlandı
                          </p>
                        </td>
                      </tr>
        
                      <!-- Content -->
                      <tr>
                        <td style="padding: 20px 40px;">
                          <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 16px; line-height: 1.6;">
                            Merhaba <strong style="color: #ffffff;">${user.name}</strong>,
                          </p>
                          <p style="margin: 0 0 30px; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                            <strong style="color: #a855f7; font-size: 18px;">"${postData.title.rendered}"</strong> başlıklı blogunuz WordPress sitenizde başarıyla yayınlandı!
                          </p>
        
                          <!-- Post Info Card -->
                          <table role="presentation" style="width: 100%; border-collapse: collapse; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; margin-bottom: 30px;">
                            <tr>
                              <td style="padding: 20px;">
                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                  <tr>
                                    <td style="padding: 8px 0; color: #94a3b8; font-size: 13px; width: 100px;">
                                      📝 Başlık:
                                    </td>
                                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 600;">
                                      ${postData.title.rendered}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">
                                      🏷️ Kategori:
                                    </td>
                                    <td style="padding: 8px 0;">
                                      <span style="display: inline-block; background: rgba(168, 85, 247, 0.2); color: #c084fc; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 600;">
                                        ${await getCategoryName(postData.categories[0],user.wordpressUser,user.wordpressPassword,user.wordpressUrl) || 'Genel'}
                                      </span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">
                                      📅 Tarih:
                                    </td>
                                    <td style="padding: 8px 0; color: #e2e8f0; font-size: 14px;">
                                      ${new Date().toLocaleDateString('tr-TR', { 
                                        day: 'numeric', 
                                        month: 'long', 
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
        
                          <!-- CTA Button -->
                          <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                            <tr>
                              <td align="center">
                                <a href="${postData.link || '#'}" style="display: inline-block; background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 10px 25px rgba(168, 85, 247, 0.3);">
                                  🌐 Blogu Görüntüle
                                </a>
                              </td>
                            </tr>
                          </table>
        
                          <p style="margin: 0; color: #94a3b8; font-size: 14px; line-height: 1.6; text-align: center;">
                            Blog otomatik olarak AI tarafından oluşturuldu ve yayınlandı
                          </p>
                        </td>
                      </tr>
        
                      <!-- Footer -->
                      <tr>
                        <td style="padding: 30px 40px; background: rgba(0, 0, 0, 0.2); text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                          <p style="margin: 0 0 10px; color: #94a3b8; font-size: 13px;">
                            Bu e-posta AutoBlog tarafından otomatik olarak gönderilmiştir
                          </p>
                          <p style="margin: 0; color: #64748b; font-size: 12px;">
                            © 2025 AutoBlog. Tüm hakları saklıdır.
                          </p>
                          <div style="margin-top: 15px;">
                            <a href="#" style="color: #a855f7; text-decoration: none; font-size: 12px; margin: 0 10px;">Ayarlar</a>
                            <span style="color: #475569;">•</span>
                            <a href="#" style="color: #a855f7; text-decoration: none; font-size: 12px; margin: 0 10px;">Bildirimler</a>
                          </div>
                        </td>
                      </tr>
        
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
          text: `Merhaba ${user.name}! ${postData.title.rendered} adlı postunuz başarıyla paylaşıldı ✅ .`
        };
        
        try {
          await transporter.sendMail(emailOptions);
          console.log('✅ Email başarıyla gönderildi');
        } catch (error) {
          console.log('❌ Email gönderme hatası:', error.message);
        }
      }
      res.json({
        success: true,
        postId,
        featuredId: featuredResponse?.id,
        title: finalParsed.title,
        postUrl,         // 🆕 link
        publishDate      // 🆕 tarih
      });
      
  
    } catch (error) {
      console.error("❌ Hata:", error);
      res.status(500).json({ success: false, error: error.message });
    }

});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`✅ Sunucu ${PORT} portunda çalışıyor`));