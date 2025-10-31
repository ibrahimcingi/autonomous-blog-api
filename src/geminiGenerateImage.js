import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import sharp from 'sharp';
import sleep from 'sleep-promise';
import { uploadImageToWordPress } from "./wordpress.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateImage(prompt) {
  await sleep(1000)
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

  

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      response_modalities: ["IMAGE"], 
    },
  });

  //console.dir(result.response.candidates, { depth: null });

  const candidate = result.response.candidates?.[0]?.content;
    if (!candidate) {
      console.warn("⚠️ Görsel üretilemedi (NO_IMAGE). Prompt:", prompt);
      return null;
    }

  const imagePart = candidate.parts.find(
    (p) => p.inlineData && p.inlineData.mimeType.startsWith("image/")
  );
  
  if (!imagePart) {
    console.warn("⚠️ Görsel üretilemedi (text only). Prompt:", prompt);
    return null;
  }
  
  const imageBase64 = imagePart.inlineData.data;
  
  const buffer = Buffer.from(imageBase64, 'base64');
  
  const resizedBuffer = await sharp(buffer)
  .resize(1024, 576, {
    fit: 'cover',
    position: 'centre'
  })
  .toBuffer();

  
  const finalBase64 = resizedBuffer.toString('base64');
  const imageUrl = `data:image/png;base64,${finalBase64}`;
  
  return imageUrl;
  
}



export async function replaceImagePlaceholders(content, title, category) {
  // 1. İçerikteki tüm {imageX} placeholder'larını bul
  const placeholders = content.match(/\{image\d+\}/g);
  if (!placeholders) return content; // hiç görsel yoksa direkt döndür

  // 2. Her placeholder için paralel olarak görsel üret
  const imagePromises = placeholders.map(async (placeholder, index) => {
    await sleep(3000);
    try {
      const imagePrompt = `"${title}" başlıklı ${category} kategorisindeki blog yazısının ${index + 1}. bölümüne uygun, modern, estetik bir görsel oluştur.`;
      
      // Görseli üret
      const imageUrl = await generateImage(imagePrompt);

      if (!imageUrl) {
        console.warn(`⚠️ ${placeholder} için model görsel üretmedi.`);
        return { placeholder, html: "" };
      }else{

        const { id: uploadedImageId, url: uploadedImageUrl } = await uploadImageToWordPress(imageUrl);

        
      // <img> etiketi hazırla
      return {
        placeholder,
        html: `<img src="${uploadedImageUrl}" alt="Blog görseli ${index + 1}" style="width:100%;height:auto;margin:20px 0;"/>`,
      };
      }

     
    } catch (err) {
      console.error(`❌ ${placeholder} için görsel oluşturulamadı:`, err.message);
      return { placeholder, html: "" }; // hata olursa boş bırak
    }
  });

  const images = await Promise.all(imagePromises);
  //console.log(images)

  // 3. Görselleri içerikte sırayla değiştir
  let finalContent = content;
  images.forEach(({ placeholder, html }) => {
    finalContent = finalContent.replace(placeholder, html);
  });

  //console.log(finalContent)

  return finalContent;
}

export async function generateFeaturedImage(prompt,retries) {
  for (let i = 0; i < retries; i++) {
    const img = await generateImage(prompt);
    if (img && img !== "no_image") return img;
    console.warn(`⚠️ Featured image üretilemedi (deneme ${i + 1}/${retries})`);
    await new Promise(r => setTimeout(r, 2000));
  }
  return null;
}
