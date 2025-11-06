import UserSchema from "../models/UserSchema.js"
import jwt from 'jsonwebtoken'
import express from 'express'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import passport from "passport";
import "../config/passport.js";
import { AuthMiddleWare } from "./middleware.js"
import transporter from "../config/nodeMailer.js"



dotenv.config()


export const Authrouter=express.Router()


Authrouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"],prompt: "select_account" })
);

// Callback route
Authrouter.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const { user, token } = req.user;
    res.cookie('token',token,{
      httpOnly:true,
      secure:process.env.NODE_ENV==='production',
      sameSite:process.env.NODE_ENV==='production' ? 'none':'strict',
      maxAge:7*24*60*60*1000
    })
    if(user.wordpressUrl){
      res.redirect('http://localhost:5173')
    }
    res.redirect('http://localhost:5173/wordpressConnection')
  }
);


Authrouter.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    console.log(password)

    if (!email) {
      return res.status(400).json({ message: 'email is required' });
    }

    const user = await UserSchema.findOne({ email });
    console.log(user.password)
    if (!user) {
      return res.status(401).json({ message: 'invalid email' });
    }

    const isMatch = await bcrypt.compare(String(password), String(user.password));
    if (!isMatch) {
      return res.status(401).json({ message: 'invalid password' });
    }

    const expiresIn = rememberMe ? '7d' : '1h';
    const cookieAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000;

    const token = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: cookieAge,
    });

    return res.status(200).json({ message: 'successful login', token:token,user:user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'internal server error' });
  }
});

Authrouter.post('/logout',(req,res)=>{
  res.clearCookie('token',{
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    //maxAge: cookieAge,
  })
  return res.status(200).json({ message: 'Logout successful' })
})



Authrouter.post('/SendResetPasswordEmail',async (req,res)=>{
  //const user = await UserSchema.findById(req.user.id);

  const {email}=req.body
  if(!email){
    return res.json({'message':'email is required'})
  }
  const user=await UserSchema.findOne({email})
  

  if(!user){
    return res.json({'message':'user not found'})
  }

  const OTP = String(Math.floor(100000 + Math.random() * 900000));
  const OTPExpiresIn=Date.now()+15*60*1000

  user.resetOTP= OTP
  user.resetOTPExpiresIn= OTPExpiresIn

  await user.save()

  const emailOptions = {
    from: process.env.SENDER_EMAIL,
    to: user.email,
    subject: "Şifre Sıfırlama Kodu",
    text: `Merhaba ${user.name}, Şifre sıfırlama kodunuz: ${OTP}. Bu kod 15 dakika geçerlidir.`,
    html: `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Şifre Sıfırlama</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 45px 30px; text-align: center;">
                    <div style="background-color: rgba(255, 255, 255, 0.2); width: 85px; height: 85px; margin: 0 auto 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid rgba(255, 255, 255, 0.3);">
                      <span style="font-size: 42px;">🔐</span>
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 0.3px;">Şifre Sıfırlama</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 35px;">
                    <h2 style="margin: 0 0 22px 0; color: #2c3e50; font-size: 22px; font-weight: 600;">Merhaba ${user.name}! 👋</h2>
                    <p style="margin: 0 0 28px 0; color: #555555; font-size: 16px; line-height: 1.7;">
                      Şifrenizi sıfırlamak için bir talepte bulundunuz. Aşağıdaki doğrulama kodunu kullanarak işleme devam edebilirsiniz.
                    </p>
                    
                    <!-- OTP Box -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
                      <tr>
                        <td align="center" style="padding: 32px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 12px; box-shadow: 0 5px 20px rgba(245, 87, 108, 0.35);">
                          <p style="margin: 0 0 12px 0; color: #ffffff; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.95;">Doğrulama Kodunuz</p>
                          <p style="margin: 0; color: #ffffff; font-size: 38px; font-weight: 700; letter-spacing: 10px; font-family: 'Courier New', monospace;">
                            ${OTP}
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Timer Warning -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
                      <tr>
                        <td style="padding: 20px 22px; background-color: #fff8e1; border-left: 4px solid #ffa726; border-radius: 8px;">
                          <p style="margin: 0; color: #e65100; font-size: 14px; line-height: 1.7;">
                            ⏱️ <strong>Önemli:</strong> Bu kod güvenlik nedeniyle <strong>15 dakika</strong> sonra geçerliliğini yitirecektir.
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
                      <tr>
                        <td align="center">
                          <a href="https://tamirbilgi.online" style="display: inline-block; padding: 17px 45px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 5px 15px rgba(102, 126, 234, 0.35); letter-spacing: 0.3px;">
                            Şifremi Sıfırla
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Security Notice -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 22px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 10px; border: 1px solid #dee2e6;">
                          <p style="margin: 0 0 12px 0; color: #2c3e50; font-size: 14px; font-weight: 600;">
                            🛡️ Güvenlik Hatırlatması
                          </p>
                          <p style="margin: 0; color: #555555; font-size: 13px; line-height: 1.7;">
                            Eğer bu işlemi siz yapmadıysanız, lütfen bu e-postayı dikkate almayın veya derhal destek ekibimizle iletişime geçin. Hesap güvenliğiniz bizim için önemlidir.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 32px 35px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #dee2e6;">
                    <p style="margin: 0 0 12px 0; color: #6c757d; font-size: 14px; line-height: 1.6;">
                      Yardıma mı ihtiyacınız var? Bize ulaşın:
                    </p>
                    <p style="margin: 0 0 20px 0; color: #6c757d; font-size: 14px;">
                      <a href="mailto:${process.env.SENDER_EMAIL}" style="color: #667eea; text-decoration: none; font-weight: 600;">${process.env.SENDER_EMAIL}e</a>
                    </p>
                    <div style="height: 1px; background-color: #dee2e6; margin: 18px auto; width: 80px;"></div>
                    <p style="margin: 0; color: #adb5bd; font-size: 12px;">
                      © 2024 Tamir Bilgi. Tüm hakları saklıdır.
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

  
  
      try{
        await transporter.sendMail(emailOptions)
        console.log('message sent')
        return res.json({'message':'Eğer bu email adresi sistemimizde kayıtlıysa, şifre sıfırlama talimatı gönderildi.'})
      }catch(error){
        return res.json({'message':error.message})
      }

})

Authrouter.post('/verifyOTP',async (req,res)=>{
  const {email,OTP}=req.body
  if(!email||!OTP){
    return res.json({'message':'email and OTP are required'})
  }
  const user=await UserSchema.findOne({email})
  if(!user){
    res.status(404).json({'message':'user not found'})
  }
  if(!String(user.resetOTP)===String(OTP) || user.resetOTP===''){
    return res.json({'message':'account could not be verified'})
  }else{
    if(user.verificationOTPExpiresIn<Date.now()){
      return res.json({'message':'OTP is expired'})
    }

    return res.json({'message':'OTP verified succesfully.'})
  }
})

Authrouter.post('/resetPassword', async (req, res) => {
  const { OTP, new_password, email } = req.body;

  const user = await UserSchema.findOne({ email });
  if (!user) {
    return res.json({ message: 'user not found' });
  }

  if (String(user.resetOTP) !== String(OTP) || user.resetOTP === '') {
    return res.json({ message: 'account could not be verified' });
  }

  if (user.resetOTPExpiresIn < Date.now()) {
    user.resetOTP = '';
    user.resetOTPExpiresIn = 0;
    await user.save();
    return res.json({ message: 'OTP is expired' });
  }

  
  user.password = new_password;
  user.resetOTP = '';
  user.resetOTPExpiresIn = 0;

  await user.save(); 

  return res.json({ message: 'password reseted and updated successfully.' });
});
