import FormData from "form-data";
import fetch from "node-fetch";
import dotenv from 'dotenv'

dotenv.config()

export async function uploadImageToWordPress(imageUrl) {
  let buffer;

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

  const upload = await fetch(`${process.env.WP_URL}/wp-json/wp/v2/media`, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${process.env.WP_USER}:${process.env.WP_APP_PASS}`).toString("base64"),
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
