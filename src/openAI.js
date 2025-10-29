import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config()

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateImage(category,title) {
  const image = await openai.images.generate({
    model: "gpt-image-1",
    prompt: ` Türkçe ${category} kategorisinde ${title}  başlığındaki blog için etkileyici kapak görseli, yüksek kalite, 16:9 oran`,
    size: "1024x1024",
  });
  return image.data[0].url;
}

