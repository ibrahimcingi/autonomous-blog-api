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




dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "https://autonomous-blog-app-9oron.ondigitalocean.app",
    "http://autonomous-blog-app-9oron.ondigitalocean.app",
    "http://localhost:5173", // (local test için)
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

      const categoryId = await getOrCreateCategory(category);

  
      const content = await generateBlogPost(category,title);
      await sleep(500)
      const parsed = parseContent(content);
      await sleep(500)
      let contentWithImages = await replaceImagePlaceholders(content, parsed.title, category,3);
      await sleep(500)
      const finalParsed = parseContent(contentWithImages);
  
     
      const FeaturedPrompt = `${finalParsed.title} başlıklı ${category} kategorisinde yer alan bir blog yazısı için estetik, modern ve profesyonel bir featured image oluştur.Olabildiğince yazı kullanma.Eğer kullanırsan da yazım yanlışı yapma.`;
  
      const featuredImageUrl = await generateFeaturedImage(FeaturedPrompt, 3);
      let featuredResponse = null;
      if (featuredImageUrl) {
        featuredResponse = await uploadImageToWordPress(featuredImageUrl);
        console.log(`✅ Featured image yüklendi: ${featuredResponse.id}`);
        await new Promise(r => setTimeout(r, 2000)); // WP'nin meta işlemini beklet
      }
  
     
      const postContent = `
        ${finalParsed.sections.map(s => `<h2 style="margin:10px">${s.subtitle}</h2>${s.content}`).join("")}
        <h2 style="margin:10px">Sonuç</h2>
        ${finalParsed.conclusion}
      `;
  
      const wpResponse = await fetch(`${user.wordpressUrl}/wp-json/wp/v2/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization":
            "Basic " + Buffer.from(`${user.wordpressUser}:${DecryptedPassword}`).toString("base64"),
        },
        body: JSON.stringify({
          title: finalParsed.title || "Başlıksız Yazı",
          content: postContent,
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
          subject: "Post Paylaşıldı",
          text: `Merhaba ${user.name}! ${postData.name} adlı postunuz başarıyla paylaşıldı ✅ .`,
        }
        try{
          transporter.sendMail(emailOptions)

        }catch(error){
          console.log(error.message)
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