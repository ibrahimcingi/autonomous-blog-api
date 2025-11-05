import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

export async function generateBlogPost(category,title) {
  const apiKey = process.env.GEMINI_API_KEY;
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent";

  const prompt = `
  Sen bir uzman içerik editörüsün. 
${category} kategorisinde, ${title} başlıklı SEO uyumlu, özgün, uzun ve detaylı bir blog yazısı oluştur.
### **Başlık: ${title ? title:'konuya uygun, ilgi çekici bir başlık'}**

#### **Giriş**
Konuya genel bir giriş yap. Okuyucuyu içeriğe hazırla.  
Görsel placeholder ekle: {image:Giriş}

#### **Alt Başlık 1: [ilk önemli alt konu]**
Bu alt başlık altında detaylı açıklama yap.  
Örnekler, veriler ve ipuçları ekle.  
Görsel placeholder ekle: {image:[ilk önemli alt konu]}


##### [Alt Alt Başlık 1]
Bu alt alt başlık altında daha teknik veya özel bir detay anlat.  
Kısa paragraflar ve madde işaretleri kullan.  
Görsel placeholder ekle: {image:[Alt Alt Başlık 1]}

#### **Alt Başlık 2: [ikinci önemli alt konu]**
Bu bölümde başka bir bakış açısı veya stratejik bilgi sun.  
Kullanıcıyı bilgilendirici ve akıcı bir anlatım tarzı koru.  
Görsel placeholder ekle: {image:[ikinci önemli alt konu]}

##### [Alt Alt Başlık 2]
Bu alt alt başlıkta konuya örnekler veya gerçek hayat senaryoları ekle.  
Liste veya paragraf biçiminde olabilir.  
Görsel placeholder ekle: {image:[Alt Alt Başlık 2]}

#### **Sonuç**
Yazıyı güçlü bir özet ve çağrı ile bitir.  
Okuyucuya aksiyon aldıracak veya düşündürecek şekilde bitir.

---

Kurallar:
- Dil: Türkçe
- Her görsel placeholder’ında alt başlıkla ilişkili kısa bir konu etiketi bulunacak. Örnek: {image:sağlıklı beslenme}, {image:yapay zeka teknolojisi}
- En az 500 kelime yaz.
- Format yukarıdaki gibi olacak.
- Görsel placeholder’larını yalnızca yeni bir alt konuya geçerken ekle.
- Uzunluk: en az 500 kelime
- Alt Başlık ve Alt Alt başlık sayısı yazıdan yazıya değişebilir ama format yukardaki gibi olacak.
- Her bölümde açıklayıcı, öğretici ve doğal bir anlatım kullan.
- Ortalamada her 250 kelime için 1 image placeholder'ı kullan.Ancak yeni bir konuya vesaire geçiyorsa yazı kullanabilirsin.
- Başlık, alt başlık, alt-alt başlık ve sonuç formatını **mutlaka koru**.

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