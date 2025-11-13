import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

export async function generateBlogPost(category,title) {
  const apiKey = process.env.GEMINI_API_KEY;
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";

  const prompt = `
  Sen deneyimli bir SEO içerik editörüsün. 
Görevin: “${category}” kategorisinde, “${title}” başlıklı, detaylı ve özgün bir Türkçe blog yazısı oluşturmak.

Aşağıdaki yapıya MUTLAKA uy:

# Başlık: ${title ? title : "Konuyla uyumlu ilgi çekici bir başlık"}

## Giriş
- Konunun genel çerçevesini anlat.
- Okuyucuyu yazıya hazırla.
- Görsel placeholder ekle: {image:Giriş}

## Alt Başlık 1: [ilk önemli alt konu]
- Bu konuyu açıklayıcı şekilde anlat.
- Örnekler, ipuçları, kısa listeler ekle.
- Yeni alt konuya geçerken görsel placeholder ekle:  
  {image:[ilk önemli alt konu]}

### Alt Alt Başlık 1
- Bu başlık altında daha spesifik teknik bir detay ver.
- Madde işaretleri veya kısa paragraflar ekle.
- Görsel placeholder ekle: {image:[Alt Alt Başlık 1]}

## Alt Başlık 2: [ikinci önemli alt konu]
- Konuya farklı bir perspektif veya ek bilgi ekle.
- Akıcı, bilgilendirici bir ton kullan.
- Görsel placeholder ekle: {image:[ikinci önemli alt konu]}

### Alt Alt Başlık 2
- Gerçek hayat senaryosu veya örneklerle açıklama yap.
- Madde madde veya paragraf şeklinde olabilir.
- Görsel placeholder ekle: {image:[Alt Alt Başlık 2]}

## Sonuç
- Yazının ana mesajlarını toparla.
- Okuyucuyu düşünmeye veya aksiyon almaya yönlendir.

---

### Zorunlu Kurallar:
- Dil: Türkçe
- Görsel placeholder’ları formatı: {image:konu_etiketi}
- Ortalama her 250 kelimede 1 placeholder olmalı (alt başlık geçişlerinde eklemek serbesttir).
- Minimum uzunluk: 500 kelime
- Tüm başlık hiyerarşisi korunacak (Başlık → Alt Başlık → Alt Alt Başlık → Sonuç).
- İçerik doğal, öğretici ve akıcı olmalı.
- Her bölüm konuya uygun bilgiler içermeli.

Bu formatı *kesinlikle* koruyarak içeriği oluştur.

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
  return text;
}