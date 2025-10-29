import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

export async function generateBlogPost(category) {
  const apiKey = process.env.GEMINI_API_KEY;
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent";



  const prompt = `
Sen profesyonel bir teknoloji blog yazarı gibi davran.
Kategori: ${category}.
Başlık, giriş paragrafı, 2 alt başlık ve sonuç içeren Türkçe bir blog yazısı oluştur.
`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();


  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Boş içerik döndü 😅";
  console.log(text)
  return text;
}
