import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

// 32 byte key gerekiyor AES-256 için
// ENCRYPTION_KEY .env dosyasında 32 karakterlik basit bir string olmalı
const KEY = crypto
  .createHash("sha256")
  .update(String(process.env.ENCRYPTION_KEY))
  .digest()
  .subarray(0, 32); // 32-byte kesin

// 🔐 Şifreleme fonksiyonu
export function encryptText(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(16); // her şifreleme için farklı IV
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");

  // IV ve şifreli veriyi ":" ile birleştirip geri döndür
  return `${iv.toString("base64")}:${encrypted}`;
}

// 🔓 Şifre çözme fonksiyonu
export function decryptText(encryptedText) {
  if (!encryptedText) return null;
  try {
    const [ivBase64, encrypted] = encryptedText.split(":");
    const iv = Buffer.from(ivBase64, "base64");
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("❌ Decrypt error:", err.message);
    return null;
  }
}
