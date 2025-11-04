import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import sharp from 'sharp';
import sleep from 'sleep-promise';
import { uploadImageToWordPress } from "./wordpress.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateImage(prompt,retries) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

  for (let i = 0; i < retries; i++) {
    console.log(`🌀 Görsel üretiliyor... (deneme ${i + 1}/${retries})`);
    await sleep(2000);

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          response_modalities: ["IMAGE"],
        },
      });

      const candidate = result.response.candidates?.[0]?.content;
      if (!candidate) {
        console.warn(`⚠️ Görsel adayı bulunamadı (deneme ${i + 1})`);
        continue; // diğer denemeye geç
      }

      const imagePart = candidate.parts.find(
        (p) => p.inlineData && p.inlineData.mimeType.startsWith("image/")
      );
      if (!imagePart) {
        console.warn(`⚠️ Görsel verisi yok (deneme ${i + 1})`);
        continue; // diğer denemeye geç
      }

      // Görsel bulunduysa işle
      const imageBase64 = imagePart.inlineData.data;
      const buffer = Buffer.from(imageBase64, "base64");

      const resizedBuffer = await sharp(buffer)
        .resize(1024, 576, {
          fit: "cover",
          position: "centre",
        })
        .toBuffer();

      const finalBase64 = resizedBuffer.toString("base64");
      const imageUrl = `data:image/png;base64,${finalBase64}`;

      console.log(`✅ Görsel başarıyla üretildi (deneme ${i + 1})`);
      return imageUrl; // sadece başarı durumunda return et
    } catch (err) {
      console.error(`❌ Görsel üretimi hata verdi (deneme ${i + 1}):`, err.message);
      await sleep(2000);
      // sonra yeniden dene
    }
  }

  console.error(`🚫 ${retries} denemeye rağmen görsel üretilemedi.`);
  return null;
}




export async function replaceImagePlaceholders(content, title, category,retries) {
  // 1. İçerikteki tüm {imageX} placeholder'larını bul
  const placeholders = content.match(/\{image\d+\}/g);
  if (!placeholders) return content; // hiç görsel yoksa direkt döndür

  // 2. Her placeholder için paralel olarak görsel üret
  const imagePromises = placeholders.map(async (placeholder, index) => {
    await sleep(3000);
    try {
      const imagePrompt = `"${title}" başlıklı ${category} kategorisindeki blog yazısının ${index + 1}. bölümüne uygun, modern, estetik bir görsel oluştur.Olabildiğince az yazı kullan.Eğer kullanırsan da yazım yanlışı yapma.`;
      
      // Görseli üret
      const imageUrl = await generateImage(imagePrompt,retries);

      if (!imageUrl) {
        console.warn(`⚠️ ${placeholder} için model görsel üretmedi.`);
        await new Promise(r => setTimeout(r, 2000));
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

  let finalContent = content;
  images.forEach(({ placeholder, html }) => {
    finalContent = finalContent.replace(placeholder, html);
  });

  

  return finalContent;
}

export async function generateFeaturedImage(prompt,retries) {
  for (let i = 0; i < retries; i++) {
    await sleep(1500)
    const img = await generateImage(prompt,retries);
    if (img && img !== "no_image") return img;
    console.warn(`⚠️ Featured image üretilemedi (deneme ${i + 1}/${retries})`);
    await new Promise(r => setTimeout(r, 2000));
  }
  return null;
}
