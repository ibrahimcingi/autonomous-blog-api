import FormData from "form-data";
import fetch from "node-fetch";
import dotenv from 'dotenv'
import express from 'express'
import { AuthMiddleWare } from "./auth/middleware.js";
import bcrypt from 'bcrypt'
import UserSchema from "./models/UserSchema.js";
import { encryptText,decryptText } from "../utils/crypto.js";

import sleep from "sleep-promise";
import { formatDateReadable } from "./config/dateConfig.js";
import redisClient from "./config/redis.js";


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


WordpressRouter.get('/summary',AuthMiddleWare,async (req, res) => {
  const { wordpressUrl } = req.query;
  const userId=req.user.id
  const cacheKey = `summary:${wordpressUrl}`;

  try {
    if (!userId) {
      console.log('not authorized')
      return res.status(401).json({ message: "Not Authorized" });
    }
    const user = await UserSchema.findById(userId);
    if (!user) {
      console.log('user not found')
      return res.status(401).json({ message: "user not authenticated " });
      
    }


    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log("✅ Redis cache hit");
      return res.json(JSON.parse(cached));
    }

    console.log("🌀 Cache miss → WordPress'ten veri çekiliyor...");

    const siteInfoRes = await fetch(`${wordpressUrl}/wp-json`);
    const siteInfo = await siteInfoRes.json();

    const postsRes = await fetch(`${wordpressUrl}/wp-json/wp/v2/posts?per_page=1`);
    const totalPosts = postsRes.headers.get('X-WP-Total');

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    const monthlyRes = await fetch(`${wordpressUrl}/wp-json/wp/v2/posts?after=${firstDay}&before=${lastDay}`);
    const monthlyPosts = await monthlyRes.json();

    const categories = user.categories;

    const recentPostsRes = await fetch(`${wordpressUrl}/wp-json/wp/v2/posts?per_page=3&orderby=date&order=desc`);
    const recentPosts = await recentPostsRes.json();

    await redisClient.setEx(cacheKey, 90, JSON.stringify({
      site: {
        name: siteInfo.name,
        url: siteInfo.url,
      },
      stats: {
        totalPosts,
        monthlyPosts: monthlyPosts.length,
        activeCategories: categories.length,
      },
      recentPosts: recentPosts.map(p => ({
        id: p.id,
        title: p.title.rendered,
        date: formatDateReadable(p.date),
        category: p.categories[0],
        status: p.status,
      })),
      
    }));

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
        date: formatDateReadable(p.date),
        category: p.categories[0],
        status: p.status,
      })),
    });
  } catch (err) {
    console.error('WordPress summary fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch summary', message: err.message });
  }
});


WordpressRouter.get('/BlogPosts',AuthMiddleWare,async (req,res)=>{
  const { wordpressUrl } = req.query;
  const userId=req.user.id
  const cacheKey=`BlogPosts:${wordpressUrl}`;
  try{
    if (!userId) {
      console.log('not authorized')
      return res.status(401).json({ message: "Not Authorized" });
    }
    const userDoc = await UserSchema.findById(userId);
    if (!userDoc) {
      console.log('user not found')
      return res.status(401).json({ message: "user not authenticated " });
      
    }


    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log("✅ Redis cache hit");
      return res.json(JSON.parse(cached));
    }


  const postsRes = await fetch(`${wordpressUrl}/wp-json/wp/v2/posts?per_page=20`);
  const posts=await postsRes.json()

  const BlogPosts = await Promise.all(
    posts.map(async (p) => {
      const categoryName = await getCategoryName(p.categories[0],userDoc.wordpressUser,userDoc.wordpressPassword,userDoc.wordpressUrl);
  
      return {
        id: p.id,
        title: p.title.rendered,
        date: formatDateReadable(p.date),
        category: categoryName,
        status: p.status,
        url: p.link,
        views: 1000
      };
    })
  );

  await redisClient.setEx(cacheKey, 90, JSON.stringify({BlogPosts}))
  
  res.json({ BlogPosts });
  


  }catch(error){
    console.error('WordPress posts fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch posts', message: error.message });

  }
})

WordpressRouter.post('/getCategoryName',async (req,res)=>{
  const {categoryId}=req.body
  res.json({
    name:await getCategoryName(categoryId,"ibrahim","iVt9l0JqDtCS7ydmDmM2xQ==:SFw6gdhE5XIGIdiCoergFREM5fR1TRSp6j3bMvOcn6o=","https://tamirbilgi.online")
  })
})




export default WordpressRouter;




export async function uploadImageToWordPress(imageUrl,wordpressUrl,wordpressPassword,wordpressUser) {
  let buffer;
  console.log(wordpressPassword)
  console.log(wordpressUser)
  console.log(wordpressUrl)
  

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

  const upload = await fetch(`${wordpressUrl}/wp-json/wp/v2/media`, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${wordpressUser}:${wordpressPassword}`).toString("base64"),
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


export async function getOrCreateCategory(categoryName,wordpressUsername,wordpressPassword,wordpressUrl) {
  
  const wpAuth = "Basic " + Buffer.from(`${wordpressUsername}:${decryptText(wordpressPassword)}`).toString("base64");
  //console.log(decryptText(wordpressPassword))
  //console.log(wordpressPassword)

  // 1️⃣ Var mı diye kontrol et
  const existing = await fetch(`${wordpressUrl}/wp-json/wp/v2/categories?search=${encodeURIComponent(categoryName)}`, {
    headers: { Authorization: wpAuth },
  });
  const existingData = await existing.json();

  await sleep(1000)

  if (Array.isArray(existingData) && existingData.length > 0) {
    console.log(`✅ Kategori zaten var: ${existingData[0].id} (${existingData[0].name})`);
    return existingData[0].id;
  }

  // 2️⃣ Yoksa oluştur
  const created = await fetch(`${wordpressUrl}/wp-json/wp/v2/categories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: wpAuth,
    },
    body: JSON.stringify({ name: categoryName }),
  });

  if (!created.ok) {
    const errText = await created.text();
    console.error("❌ Kategori oluşturulamadı:", errText);
    throw new Error("Kategori oluşturulamadı");
  }

  const createdData = await created.json();
  console.log(`🆕 Yeni kategori oluşturuldu: ${createdData.id} (${createdData.name})`);
  return createdData.id;
}



export async function getCategoryName(categoryId,wordpressUsername,wordpressPassword,wordpressUrl){
  await sleep(500)
  const wpAuth = "Basic " + Buffer.from(`${wordpressUsername}:${decryptText(wordpressPassword)}`).toString("base64");

  const response = await fetch(`${wordpressUrl}/wp-json/wp/v2/categories/${categoryId}`, {
    headers: {
      Authorization: wpAuth, 
    },
  });

  if (!response.ok) {
    throw new Error(`Kategori alınamadı: ${response.statusText}`);
  }

  const categoryData = await response.json();
  return categoryData.name

}




