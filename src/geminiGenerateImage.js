import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import sharp from 'sharp';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateImage(category, title) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

  const prompt = `Türkçe ${category} kategorisinde "${title}" başlıklı blog için etkileyici, profesyonel, yüksek kaliteli bir kapak görseli oluştur. 16:9 oranında, Görsel yalnızca image modalitesinde olsun, metin içermez`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      response_modalities: ["IMAGE"], 
    },
  });

  console.dir(result, { depth: null });

  const candidate = result.response.candidates?.[0]?.content;
    if (!candidate) {
      throw new Error("Görsel üretilemedi, model yanıtı boş.");
    }

  const imagePart = candidate.parts.find(
    (p) => p.inlineData && p.inlineData.mimeType.startsWith("image/")
  );
  
  if (!imagePart) {
    throw new Error("Görsel üretilemedi, model yalnızca metin döndürdü.");
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
