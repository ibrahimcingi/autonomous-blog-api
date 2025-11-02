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
    //res.redirect(`${process.env.WP_URL}`);
    res.redirect('http://localhost:5173')
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

    return res.status(200).json({ message: 'successful login', token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'internal server error' });
  }
});



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
    subject: "Password Reset OTP",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #4CAF50;">Password Reset</h2>
        <p>Hello <b>${user.name}</b>,</p>
        <p>Your OTP is: <span style="font-size: 20px; color: red;">${OTP}</span></p>
        <p>This code is valid for <b>15 minutes</b>.</p>
        <a href="https://tamirbilgi.online" 
           style="display:inline-block; padding:10px 20px; background:#4CAF50; color:#fff; text-decoration:none; border-radius:5px;">
          Reset Password
        </a>
      </div>
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

  // ✅ Burayı düzelttik
  if (String(user.resetOTP) !== String(OTP) || user.resetOTP === '') {
    return res.json({ message: 'account could not be verified' });
  }

  if (user.resetOTPExpiresIn < Date.now()) {
    user.resetOTP = '';
    user.resetOTPExpiresIn = 0;
    await user.save();
    return res.json({ message: 'OTP is expired' });
  }

  // ✅ Şifreyi güncelle
  user.password = new_password;
  user.resetOTP = '';
  user.resetOTPExpiresIn = 0;

  await user.save(); // pre('save') hook burada devreye girer

  return res.json({ message: 'password reseted and updated successfully.' });
});
