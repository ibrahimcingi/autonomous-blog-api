import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db/mongo.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

connectDB()


app.get("/", (req, res) => {
  res.send("Otonom Blog Servisi Çalışıyor 🚀");
 
});

app.post("/publish",async (req,res)=>{
  const postData = {
    title: "Test Postu - API Üzerinden Gönderildi",
    content: "Bu yazı Node.js servisi üzerinden WordPress REST API'ye gönderildi.",
    status: "publish"
  };
  
  try {
    const response = await fetch("https://tamirbilgi.online/wp-json/wp/v2/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization":
          "Basic " + Buffer.from(`${process.env.WP_USER}:${process.env.WP_APP_PASS}`).toString("base64"),
      },
      body: JSON.stringify(postData),
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Post atılırken hata:", error);
    res.status(500).json({ error: "Post gönderilemedi" });
  }

})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Sunucu ${PORT} portunda çalışıyor`));
