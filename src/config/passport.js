import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import UserSchema from "../models/UserSchema.js";
import jwt from "jsonwebtoken";
import transporter from "./nodeMailer.js";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "https://autonomous-blog-app-9oron.ondigitalocean.app/api/auth/google/callback",

    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        let user = await UserSchema.findOne({ email });

        
        if (!user) {
          user = await UserSchema.create({
            name: profile.displayName,
            email,
            password:null,
            googleId: profile.id

          });

          const emailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: "Hesabınız Başarıyla Oluşturuldu",
            text: `Merhaba ${name}! Hesabınız başarıyla oluşturuldu.`,
            html: `
              <!DOCTYPE html>
              <html lang="tr">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Hoş Geldiniz</title>
              </head>
              <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td align="center" style="padding: 40px 0;">
                      <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                        
                        <!-- Header -->
                        <tr>
                          <td style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 50px 30px; text-align: center;">
                            <div style="background-color: rgba(255, 255, 255, 0.15); width: 90px; height: 90px; margin: 0 auto 25px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid rgba(255, 255, 255, 0.3);">
                              <span style="font-size: 45px;">✓</span>
                            </div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: 0.5px;">Hoş Geldiniz</h1>
                          </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                          <td style="padding: 45px 40px;">
                            <h2 style="margin: 0 0 25px 0; color: #2c3e50; font-size: 24px; font-weight: 600;">Merhaba! ${name},</h2>
                            <p style="margin: 0 0 25px 0; color: #555555; font-size: 16px; line-height: 1.8;">
                              Hesabınız başarıyla oluşturulmuştur. Platformumuza katıldığınız için teşekkür ederiz. 
                              Şimdi tüm özelliklerimizden yararlanmaya başlayabilirsiniz.
                            </p>
                            
                            <!-- Divider -->
                            <div style="height: 2px; background: linear-gradient(to right, #1e3c72, #2a5298, #1e3c72); margin: 30px 0; opacity: 0.3;"></div>
                            
                            <p style="margin: 0 0 30px 0; color: #555555; font-size: 16px; line-height: 1.8; font-weight: 500;">
                              Hemen başlamak için aşağıdaki adımları takip edebilirsiniz:
                            </p>
                            
                            <!-- Features -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 35px;">
                              <tr>
                                <td style="padding: 18px 20px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-left: 4px solid #1e3c72; border-radius: 8px; margin-bottom: 12px;">
                                  <table role="presentation" style="width: 100%;">
                                    <tr>
                                      <td style="width: 40px; vertical-align: top;">
                                        <span style="font-size: 24px;">📊</span>
                                      </td>
                                      <td style="vertical-align: middle;">
                                        <span style="color: #2c3e50; font-size: 15px; font-weight: 600;">Hesap bilgilerinizi tamamlayın</span>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                              <tr><td style="height: 12px;"></td></tr>
                              <tr>
                                <td style="padding: 18px 20px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-left: 4px solid #2a5298; border-radius: 8px;">
                                  <table role="presentation" style="width: 100%;">
                                    <tr>
                                      <td style="width: 40px; vertical-align: top;">
                                        <span style="font-size: 24px;">🔍</span>
                                      </td>
                                      <td style="vertical-align: middle;">
                                        <span style="color: #2c3e50; font-size: 15px; font-weight: 600;">Platform özelliklerini keşfedin</span>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                              <tr><td style="height: 12px;"></td></tr>
                              <tr>
                                <td style="padding: 18px 20px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-left: 4px solid #1e3c72; border-radius: 8px;">
                                  <table role="presentation" style="width: 100%;">
                                    <tr>
                                      <td style="width: 40px; vertical-align: top;">
                                        <span style="font-size: 24px;">🎯</span>
                                      </td>
                                      <td style="vertical-align: middle;">
                                        <span style="color: #2c3e50; font-size: 15px; font-weight: 600;">İlk projenizi oluşturun</span>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                            
                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                              <tr>
                                <td align="center" style="padding: 10px 0;">
                                  <a href="https://tamirbilgi.online" style="display: inline-block; padding: 18px 50px; background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 6px 12px rgba(30, 60, 114, 0.3); letter-spacing: 0.5px; transition: all 0.3s;">
                                    Hemen Başlayın
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                          <td style="padding: 35px 40px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #dee2e6;">
                            <p style="margin: 0 0 12px 0; color: #6c757d; font-size: 14px; line-height: 1.6;">
                              Herhangi bir sorunuz mu var? Destek ekibimiz size yardımcı olmaktan mutluluk duyacaktır.
                            </p>
                            <p style="margin: 0 0 20px 0; color: #6c757d; font-size: 14px;">
                              <a href="mailto:${process.env.SENDER_EMAIL}" style="color: #1e3c72; text-decoration: none; font-weight: 600;">${process.env.SENDER_EMAIL}</a>
                            </p>
                            <div style="height: 1px; background-color: #dee2e6; margin: 20px auto; width: 60px;"></div>
                            <p style="margin: 0; color: #adb5bd; font-size: 12px; line-height: 1.6;">
                              © 2024 haveAI. Tüm hakları saklıdır.
                            </p>
                          </td>
                        </tr>
                        
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
              </html>
            `
          }
      

          transporter.sendMail(emailOptions)

          
        }

        
        const token = jwt.sign(
          { id: user._id, email: user.email },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "7d" }
        );

        return done(null, { user, token });
      } catch (error) {
        done(error, null);
      }
    }
  )
);

export default passport;
