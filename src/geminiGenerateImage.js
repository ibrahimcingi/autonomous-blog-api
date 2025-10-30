import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateImage(category, title) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

  const prompt = `Türkçe ${category} kategorisinde "${title}" başlıklı blog için etkileyici, profesyonel, yüksek kaliteli bir kapak görseli oluştur. 16:9 oran, modern, estetik.`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      response_modalities: ["IMAGE"], // ✅ Görsel üretim için doğru parametre
    },
  });

  // Görsel verisi base64 olarak gelir:
  const imagePart = result.response.candidates[0].content.parts.find(
    (p) => p.inlineData && p.inlineData.mimeType.startsWith("image/")
  );

  if (!imagePart) {
    throw new Error("Görsel üretilemedi, model yalnızca metin döndürdü.");
  }

  const imageBase64 = imagePart.inlineData.data;
  const imageUrl = `data:image/png;base64,${imageBase64}`;

  return imageUrl;
}
