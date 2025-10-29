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
import { generateImage } from "./openAI.js";
import { uploadImageToWordPress } from "./wordpress.js";
import UserSchema from "./models/UserSchema.js";


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use(cookieParser());

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

    let imageUrl=''

    try {
      imageUrl = await generateImage(category,parsed.title);
    } catch (err) {
      if (err.code === "billing_hard_limit_reached") {
        console.log("⚠️ OpenAI limit doldu, placeholder kullanılacak.");
        imageUrl = "https://placehold.co/1024x1024?text=Blog+Image";
      } else {
        throw err;
      }
    }

    const featuredMediaId = await uploadImageToWordPress(imageUrl);

    
    const wpResponse = await fetch(`${process.env.WP_URL}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization":
          "Basic " + Buffer.from(`${process.env.WP_USER}:${process.env.WP_APP_PASS}`).toString("base64"),
      },
      body: JSON.stringify({
        title:parsed.title,
        content: parsed.sections.map(s => `<h2>${s.subtitle}</h2>${s.content}`).join("") +
           `<h2>Sonuç</h2><p>${parsed.conclusion}</p>`,
        status: "publish",
        featured_media: featuredMediaId,
        categories: [categoryId],

      }),
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
