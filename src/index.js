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




dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use(cookieParser());

app.use(passport.initialize());

app.use('/api/users',UserRouter)
app.use('/api/auth',Authrouter)


connectDB()


app.get("/", (req, res) => {
  res.send("Otonom Blog Servisi Çalışıyor 🚀");
 
});

app.post("/generate-and-post", AuthMiddleWare,async (req, res) => {

  /*

  const user = await UserSchema.findById(req.body.user_id);

  if (!user.wordpressUrl || !user.wordpressPassword) {
    return res.status(400).json({
      message: "WordPress hesabı bağlanmamış. Lütfen önce ayarlardan ekleyin."
    });
  }
    this part is for the stage when users can connect their wordpress account with app.
    */

  
  try {
    const {categoryId,category } = req.body;

    const content = await generateBlogPost(category);
    const parsed= parseContent(content)

    let contentWithImages = await replaceImagePlaceholders(content, parsed.title, category);

    const finalParsed=parseContent(contentWithImages)

    await sleep(1500)
    
    const FeaturedPrompt = `${finalParsed.title} başlıklı ${category} kategorisinde yer alan bir blog yazısı için estetik, modern ve profesyonel bir featured image oluştur.`;

    const featuredImageUrl = await generateFeaturedImage(FeaturedPrompt,3)
    
    let featuredResponse=null

    if (featuredImageUrl) {
      featuredResponse = await uploadImageToWordPress(featuredImageUrl);
      console.log(`featuredId: ${featuredResponse.id}`);
    
      // Bu çok kritik:
      await new Promise(resolve => setTimeout(resolve, 2500)); 
    }

    
    
       
      
    
      const postContent = `
      <img src="${featuredImageUrl}" alt="Featured Image" style="width:100%; height:auto; padding:15px"/>
      ${finalParsed.sections.map(s => `<h2 style="margin:10px">${s.subtitle}</h2>${s.content}`).join("")}
      <h2 style="margin:10px" >Sonuç</h2>
      ${finalParsed.conclusion}
    `;

    const postBody = {
      title: finalParsed.title || "Başlıksız Yazı",
      content: postContent,
      status: "publish",
      categories: [categoryId],
      slug: `auto-post-${Date.now()}` // cache kırmak için
    };
    //if (featuredResponse?.id) postBody.featured_media = featuredResponse.id;
    

   

    const wpResponse = await fetch(`${process.env.WP_URL}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization":
          "Basic " + Buffer.from(`${process.env.WP_USER}:${process.env.WP_APP_PASS}`).toString("base64"),
      },
      body: JSON.stringify(postBody),
    });

    const data = await wpResponse.json();
    res.json({ success: true, data });

  } catch (error) {
    console.error("❌ Hata:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Sunucu ${PORT} portunda çalışıyor`));