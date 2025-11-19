import Stripe from "stripe";
import transporter from "../src/config/nodeMailer.js";

console.log("🔥 SUBSCRIPTION ENDPOINT HIT");
console.log("Stripe key length:", process.env.STRIPE_SECRET_KEY?.length);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


export const createSubscription = async (req, res) => {
  try {
    const { plan,paymentMethodId, priceId,billingInfo} = req.body;

    const price=billingInfo.cycle==='monthly' ? plan.monthlyPrice : plan.yearlyPrice


    if (!billingInfo || !paymentMethodId || !priceId || !plan) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // 1. Customer oluştur
    const customer = await stripe.customers.create({
      email:billingInfo.email,
      payment_method: paymentMethodId,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // 2. Subscription oluştur
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      expand: [
        "latest_invoice.payment_intent",
        "customer.invoice_settings.default_payment_method"
      ]
    });

    const paymentIntent = subscription.latest_invoice.payment_intent;
    const card = subscription.customer.invoice_settings.default_payment_method.card;
    const transactionId = paymentIntent.id; 


    const emailOptions = {
      from: process.env.SENDER_EMAIL,
      to: billingInfo.email,
      subject: "🎉 AutoBlog Aboneliğiniz Başladı!",
      text: `Merhaba ${billingInfo.name}! AutoBlog ${plan.name} planına abone olduğunuz için teşekkür ederiz. Aboneliğiniz aktif ve kullanmaya hazır.`,
      html: `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Abonelik Başarılı</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #0f172a;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #1e293b 0%, #312e81 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);">
                  
                  <!-- Celebration Header -->
                  <tr>
                    <td style="padding: 50px 40px 40px; text-align: center; background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%); position: relative;">
                      <!-- Confetti -->
                      <div style="position: absolute; top: 20px; left: 30px; font-size: 30px;">🎊</div>
                      <div style="position: absolute; top: 25px; right: 25px; font-size: 28px;">🎉</div>
                      <div style="position: absolute; bottom: 25px; left: 20px; font-size: 24px;">✨</div>
                      <div style="position: absolute; bottom: 20px; right: 35px; font-size: 26px;">🎈</div>
                      
                      <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 50%; margin-bottom: 20px;">
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                      </div>
                      <h1 style="margin: 0 0 10px; color: #ffffff; font-size: 34px; font-weight: 700; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);">
                        Ödeme Başarılı!
                      </h1>
                      <p style="margin: 0; color: rgba(255, 255, 255, 0.95); font-size: 16px;">
                        AutoBlog'a hoş geldiniz
                      </p>
                    </td>
                  </tr>
  
                  <!-- Thank You Message -->
                  <tr>
                    <td style="padding: 40px 40px 30px;">
                      <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 26px; font-weight: 700;">
                        Teşekkür Ederiz, ${billingInfo.name}! 🙏
                      </h2>
                      <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 16px; line-height: 1.7;">
                        AutoBlog <strong style="color: #a855f7;">${plan.name}</strong> planına abone olduğunuz için teşekkür ederiz. Ödemeniz başarıyla alındı ve hesabınız aktif edildi.
                      </p>
                      <p style="margin: 0; color: #cbd5e1; font-size: 15px; line-height: 1.7;">
                        Artık AI destekli blog otomasyonunun tüm özelliklerinden yararlanabilir, WordPress siteniz için sınırsız içerik üretmeye başlayabilirsiniz!
                      </p>
                    </td>
                  </tr>
  
                  <!-- Subscription Details -->
                  <tr>
                    <td style="padding: 0 40px 30px;">
                      <table role="presentation" style="width: 100%; border-collapse: collapse; background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 12px;">
                        <tr>
                          <td style="padding: 25px;">
                            <h3 style="margin: 0 0 20px; color: #ffffff; font-size: 18px; font-weight: 600;">
                              📋 Abonelik Detayları
                            </h3>
                            
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                              <tr>
                                <td style="padding: 10px 0; color: #94a3b8; font-size: 14px; width: 40%;">Plan:</td>
                                <td style="padding: 10px 0; color: #ffffff; font-size: 14px; font-weight: 600;">
                                
                                  ${plan.name} - $${price}/${billingInfo.cycle}
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 10px 0; color: #94a3b8; font-size: 14px;">Başlangıç Tarihi:</td>
                                <td style="padding: 10px 0; color: #ffffff; font-size: 14px; font-weight: 600;">
                                  ${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 10px 0; color: #94a3b8; font-size: 14px;">Sonraki Ödeme:</td>
                                <td style="padding: 10px 0; color: #ffffff; font-size: 14px; font-weight: 600;">
                                  ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 10px 0; color: #94a3b8; font-size: 14px;">İşlem No:</td>
                                <td style="padding: 10px 0; color: #e2e8f0; font-size: 12px; font-family: monospace;">
                                  ${transactionId || 'TXN-' + Date.now()}
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
  
                  <!-- Payment Details -->}
                  <tr>
                    <td style="padding: 0 40px 30px;">
                      <table role="presentation" style="width: 100%; border-collapse: collapse; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px;">
                        <tr>
                          <td style="padding: 25px;">
                            <h3 style="margin: 0 0 20px; color: #ffffff; font-size: 18px; font-weight: 600;">
                              💳 Ödeme Bilgileri
                            </h3>
                            
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                              <tr>
                                <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Fatura Adı:</td>
                                <td style="padding: 8px 0; color: #ffffff; font-size: 14px;">${billingInfo.name}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">E-posta:</td>
                                <td style="padding: 8px 0; color: #ffffff; font-size: 14px;">${billingInfo.email}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Adres:</td>
                                <td style="padding: 8px 0; color: #ffffff; font-size: 14px;">
                                  ${billingInfo.address}<br/>
                                  ${billingInfo.city}, ${billingInfo.zip}<br/>
                                  Türkiye
                                </td>
                              </tr>
                              
                              <tr>
                                <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Ödeme Yöntemi:</td>
                                <td style="padding: 8px 0; color: #ffffff; font-size: 14px;">
                                  •••• •••• •••• ${cardFromIntent.slice(-4)}
                                </td>
                              </tr>
                              
                              <tr>
                                <td style="padding: 8px 0; border-top: 1px solid rgba(255, 255, 255, 0.1); color: #94a3b8; font-size: 14px; padding-top: 15px;">
                                  <strong>Toplam Tutar:</strong>
                                </td>
                                <td style="padding: 8px 0; border-top: 1px solid rgba(255, 255, 255, 0.1); color: #ffffff; font-size: 18px; font-weight: 700; padding-top: 15px;">
                                  $${(price * 1.2).toFixed(2)}
                                </td>
                              </tr>
                            </table>
                            
                            <p style="margin: 15px 0 0; color: #94a3b8; font-size: 12px;">
                              * KDV dahil fiyattır
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
  
                  <!-- Next Steps -->}
                  <tr>
                    <td style="padding: 0 40px 30px;">
                      <table role="presentation" style="width: 100%; border-collapse: collapse; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px;">
                        <tr>
                          <td style="padding: 25px;">
                            <h3 style="margin: 0 0 20px; color: #ffffff; font-size: 18px; font-weight: 600;">
                              🚀 Sonraki Adımlar
                            </h3>
                            
                            <div style="margin-bottom: 15px;">
                              <div style="display: inline-block; width: 28px; height: 28px; background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%); border-radius: 50%; color: white; font-size: 14px; font-weight: bold; text-align: center; line-height: 28px; margin-right: 12px; vertical-align: middle;">1</div>
                              <span style="color: #e2e8f0; font-size: 14px; vertical-align: middle;">
                                <strong style="color: #ffffff;">Dashboard'a gidin</strong> ve WordPress sitenizi bağlayın
                              </span>
                            </div>
  
                            <div style="margin-bottom: 15px;">
                              <div style="display: inline-block; width: 28px; height: 28px; background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%); border-radius: 50%; color: white; font-size: 14px; font-weight: bold; text-align: center; line-height: 28px; margin-right: 12px; vertical-align: middle;">2</div>
                              <span style="color: #e2e8f0; font-size: 14px; vertical-align: middle;">
                                <strong style="color: #ffffff;">Kategorilerinizi seçin</strong> ve blog üretmeye başlayın
                              </span>
                            </div>
  
                            <div style="margin-bottom: 0;">
                              <div style="display: inline-block; width: 28px; height: 28px; background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%); border-radius: 50%; color: white; font-size: 14px; font-weight: bold; text-align: center; line-height: 28px; margin-right: 12px; vertical-align: middle;">3</div>
                              <span style="color: #e2e8f0; font-size: 14px; vertical-align: middle;">
                                <strong style="color: #ffffff;">AI'ın sizin için çalışmasını izleyin!</strong>
                              </span>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
  
                  <!-- CTA Button -->}
                  <tr>
                    <td style="padding: 0 40px 40px;" align="center">
                      <a href= "https://haveai.online/Dashboard" style="display: inline-block; background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 10px 25px rgba(168, 85, 247, 0.4);">
                        Dashboard'a Git →
                      </a>
                    </td>
                  </tr>
  
                  <!-- Plan Features -->}
                  <tr>
                    <td style="padding: 30px 40px; background: rgba(0, 0, 0, 0.2); border-top: 1px solid rgba(255, 255, 255, 0.1);">
                      <h3 style="margin: 0 0 20px; color: #ffffff; font-size: 18px; font-weight: 600; text-align: center;">
                        ${plan.name} Planınızın Özellikleri
                      </h3>
                      
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        ${plan.features.map((feature, index) => `
                          <tr>
                            <td style="padding: 8px 0; vertical-align: top;">
                              <span style="color: #22c55e; font-size: 18px; margin-right: 10px;">✓</span>
                              <span style="color: #cbd5e1; font-size: 14px;">${feature}</span>
                            </td>
                          </tr>
                        `).join('')}
                      </table>
                    </td>
                  </tr>
  
                  <!-- Support Section -->}
                  <tr>
                    <td style="padding: 30px 40px; background: rgba(59, 130, 246, 0.1); border-top: 1px solid rgba(59, 130, 246, 0.3);">
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="vertical-align: middle; padding-right: 15px;" width="60">
                            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                              <span style="font-size: 30px;">💬</span>
                            </div>
                          </td>
                          <td style="vertical-align: middle;">
                            <h4 style="margin: 0 0 5px; color: #ffffff; font-size: 16px; font-weight: 600;">Yardıma mı ihtiyacınız var?</h4>
                            <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                              Destek ekibimiz size yardımcı olmak için burada.<br/>
                              <a href="mailto:support@autoblog.com" style="color: #60a5fa; text-decoration: none;">support@autoblog.com</a>
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
  
                  <!-- Important Info -->}
                  <tr>
                    <td style="padding: 25px 40px; background: rgba(251, 191, 36, 0.1); border-top: 1px solid rgba(251, 191, 36, 0.3);">
                      <div style="display: flex; align-items: start;">
                        <div style="margin-right: 12px;">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                          </svg>
                        </div>
                        <div>
                          <h4 style="margin: 0 0 8px; color: #fbbf24; font-size: 15px; font-weight: 600;">Önemli Bilgiler</h4>
                          <ul style="margin: 0; padding-left: 20px; color: #fbbf24; font-size: 13px; line-height: 1.7;">
                            <li>Aboneliğiniz otomatik olarak yenilenir</li>
                            <li>İstediğiniz zaman iptal edebilirsiniz</li>
                            <li>İlk 14 gün para iade garantisi geçerlidir</li>
                            <li>Fatura ayda bir e-posta adresinize gönderilir</li>
                          </ul>
                        </div>
                      </div>
                    </td>
                  </tr>
  
                  <!-- Footer -->}
                  <tr>
                    <td style="padding: 30px 40px; background: rgba(0, 0, 0, 0.3); text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                      <p style="margin: 0 0 15px; color: #94a3b8; font-size: 13px;">
                        AutoBlog'u tercih ettiğiniz için teşekkürler! 🚀
                      </p>
                      <p style="margin: 0 0 10px; color: #64748b; font-size: 12px;">
                        © 2025 AutoBlog. Tüm hakları saklıdır.
                      </p>
                      <div style="margin-top: 15px;">
                        <a href="#" style="color: #a855f7; text-decoration: none; font-size: 12px; margin: 0 10px;">Faturalar</a>
                        <span style="color: #475569;">•</span>
                        <a href="#" style="color: #a855f7; text-decoration: none; font-size: 12px; margin: 0 10px;">Aboneliği Yönet</a>
                        <span style="color: #475569;">•</span>
                        <a href="#" style="color: #a855f7; text-decoration: none; font-size: 12px; margin: 0 10px;">Destek</a>
                      </div>
                    </td>
                  </tr>
  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    await transporter.sendMail(emailOptions)

    return res.status(200).json({
      success: true,
      subscription,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message,
    });
  }
};
