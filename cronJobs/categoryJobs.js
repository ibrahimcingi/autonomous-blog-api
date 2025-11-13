import cron from "node-cron";
import UserSchema from "../models/UserSchema.js";
import redisClient from "../src/config/redis.js";

async function syncCategoriesForUser(user) {
  try {
    const response = await fetch(`${user.wordpressUrl}/wp-json/wp/v2/categories?per_page=100`);
    const data = await response.json();
    if (!Array.isArray(data)) {
      console.warn(`⚠️ ${user.email} için geçersiz WP yanıtı:`, data);
      return;
    }

    const categoryNames = data.map(cat => cat.name);
    user.categories = categoryNames;
    user.lastCategorySync = new Date();
    await user.save();

    await redisClient.del(`users:${user._id}`);
    console.log(`✅ ${user.email} kategorileri güncellendi.`);
  } catch (err) {
    console.error(`❌ ${user.email} kategori senkronizasyon hatası:`, err.message);
  }
}

export function startCategorySyncJob() {
  cron.schedule("0 3 * * *", async () => {
    console.log("🕒 Günlük kategori senkronizasyonu başlatıldı...");
    const users = await UserSchema.find({ wordpressUrl: { $exists: true } });
    for (const user of users) {
      await syncCategoriesForUser(user);
    }
    console.log("✅ Günlük kategori senkronizasyonu tamamlandı.");
  });
}
