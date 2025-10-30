import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import sharp from 'sharp';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateImage(category, title) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

  const prompt = `Türkçe ${category} kategorisinde "${title}" başlıklı blog için etkileyici, profesyonel, yüksek kaliteli bir kapak görseli oluştur. 16:9 oran, modern, estetik.`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      response_modalities: ["IMAGE"], 
    },
  });

  const candidate = result.response.candidates?.[0]?.content?.[0];

if (!candidate) {
  throw new Error("Görsel üretilemedi, model yanıtı boş.");
}

let imageBase64;

if (candidate.inlineData && candidate.inlineData.mimeType.startsWith("image/")) {
  imageBase64 = candidate.inlineData.data;
} else if (candidate.imageUrl) {
  // Eğer model URL verdiyse, onu fetch edip buffer alabiliriz
  const response = await fetch(candidate.imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  imageBase64 = Buffer.from(arrayBuffer).toString('base64');
} else {
  throw new Error("Görsel üretilemedi, model yalnızca metin döndürdü.");
}

const buffer = Buffer.from(imageBase64, 'base64');

const resizedBuffer = await sharp(buffer)
  .resize(1024, 576)  // 16:9 kesin piksel
  .toBuffer();

const finalBase64 = resizedBuffer.toString('base64');
const imageUrl = `data:image/png;base64,${finalBase64}`;

return imageUrl;

}
