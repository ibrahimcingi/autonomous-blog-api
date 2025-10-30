import fetch from "node-fetch";
import dotenv from 'dotenv'
import FormData from "form-data"; 

dotenv.config()

export async function uploadImageToWordPress(imageUrl) {
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();

  const form = new FormData();
  form.append("file", Buffer.from(buffer), {
    filename: "featured-image.jpg",
    contentType: "image/jpeg",
  });

  const upload = await fetch(`${process.env.WP_URL}/wp-json/wp/v2/media`, {
    method: "POST",
    headers: {
      Authorization: Buffer.from(`${process.env.WP_USER}:${process.env.WP_APP_PASS}`).toString('base64')
    },
    body: form,
  });

  const uploadData = await upload.json();
  return uploadData.id;
}