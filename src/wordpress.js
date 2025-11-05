import FormData from "form-data";
import fetch from "node-fetch";
import dotenv from 'dotenv'
import express from 'express'
import { AuthMiddleWare } from "./auth/middleware.js";
import bcrypt from 'bcrypt'
import UserSchema from "./models/UserSchema.js";
import { encryptText } from "../utils/crypto.js";

dotenv.config()

export const WordpressRouter=express.Router()


WordpressRouter.post("/testConnection",async (req, res) => {
  const { wordpressUrl, wordpressUser, wordpressPassword } = req.body;


  if (!wordpressUrl || !wordpressUser || !wordpressPassword) {
    return res.status(400).json({ success: false, message: "Missing credentials" });
  }

  try {
    const response = await fetch(`${wordpressUrl}/wp-json/wp/v2/users/me`, {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${wordpressUser}:${wordpressPassword}`).toString("base64"),
      },
    });

    if (response.ok) {

      return res.status(200).json({
        success: true,
        message: "Connection successful ✅",
      });
    } else {
      const errorText = await response.text();
      return res.status(response.status).json({
        success: false,
        message: `Connection failed ❌`,
        error: errorText,
      });
    }
  } catch (err) {
    console.error("WordPress connection error:", err.message);
    res.status(500).json({ success: false, message: "Connection error", error: err.message });
  }
});

WordpressRouter.post('/save',AuthMiddleWare,async (req,res)=>{
  const { wordpressUrl, wordpressUsername,applicationPassword,categories } = req.body;
  
  const userId = req.user.id;
      if (!userId) {
        console.log('not authorized')
        return res.status(401).json({ message: "Not Authorized" });
      }
      const userDoc = await UserSchema.findById(userId);
      if (!userDoc) {
        console.log('user not found')
        return res.status(401).json({ message: "user not authenticated " });
        
      }

      try{
        userDoc.wordpressUrl = wordpressUrl;
        userDoc.wordpressUser = wordpressUsername;
        userDoc.wordpressPassword =  encryptText(applicationPassword)
        userDoc.categories=categories

        await userDoc.save();

        return res.json({
          success:'true',
          message:'successfully saved'
        })


      }catch(error){
        return res.json({
          success:'false',
          message:error.message
        })
      
      }
})


WordpressRouter.get('/summary', async (req, res) => {
  const { wordpressUrl } = req.query;

  try {
    const siteInfoRes = await fetch(`${wordpressUrl}/wp-json`);
    const siteInfo = await siteInfoRes.json();

    const postsRes = await fetch(`${wordpressUrl}/wp-json/wp/v2/posts?per_page=1`);
    const totalPosts = postsRes.headers.get('X-WP-Total');

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    const monthlyRes = await fetch(`${wordpressUrl}/wp-json/wp/v2/posts?after=${firstDay}&before=${lastDay}`);
    const monthlyPosts = await monthlyRes.json();

    const categoriesRes = await fetch(`${wordpressUrl}/wp-json/wp/v2/categories`);
    const categories = await categoriesRes.json();

    const recentPostsRes = await fetch(`${wordpressUrl}/wp-json/wp/v2/posts?per_page=3&orderby=date&order=desc`);
    const recentPosts = await recentPostsRes.json();

    res.json({
      site: {
        name: siteInfo.name,
        url: siteInfo.url,
      },
      stats: {
        totalPosts,
        monthlyPosts: monthlyPosts.length,
        activeCategories: categories.filter(c => c.count > 0).length,
      },
      recentPosts: recentPosts.map(p => ({
        id: p.id,
        title: p.title.rendered,
        date: p.date,
        category: p.categories[0],
        status: p.status,
      })),
    });
  } catch (err) {
    console.error('WordPress summary fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch summary', message: err.message });
  }
});


export default WordpressRouter;




export async function uploadImageToWordPress(imageUrl) {
  let buffer;

  if (imageUrl.startsWith("data:image")) {
    const base64Data = imageUrl.split(",")[1];
    buffer = Buffer.from(base64Data, "base64");
  } else {
    const response = await fetch(imageUrl);
    buffer = Buffer.from(await response.arrayBuffer());
  }

  const form = new FormData();
  form.append("file", buffer, {
    filename: `featured-image-${Date.now()}.png`,
    contentType: "image/png",
  });

  const upload = await fetch(`${process.env.WP_URL}/wp-json/wp/v2/media`, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${process.env.WP_USER}:${process.env.WP_APP_PASS}`).toString("base64"),
    },
    body: form,
  });

  const text = await upload.text();
  let uploadData;
  try {
    uploadData = JSON.parse(text);
  } catch {
    console.error("❌ WordPress JSON parse hatası:", text);
    throw new Error("WordPress beklenmeyen yanıt döndürdü.");
  }

  if (!upload.ok) {
    console.error("❌ WP upload başarısız:", uploadData);
    throw new Error(uploadData.message || "WordPress upload hatası.");
  }

  console.log("🔍 WP upload yanıtı:", uploadData);

  return {
    id: uploadData.id,
    url: uploadData.guid?.rendered || uploadData.source_url,
  };
}


