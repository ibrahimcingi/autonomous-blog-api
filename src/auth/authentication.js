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
    res.redirect(`${process.env.WP_URL}`);
  }
);


Authrouter.post('/login',async (req,res)=>{
  const {email,password}=req.body
  if(!email){
    res.json({'message':'email is required'})
  }
  const user= await UserSchema.findOne({email})
  if(!user){
    res.json({'message':'invalid email'})
  }
  const isMatch= await bcrypt.compare(String(password),String(user.password))
  if(!isMatch){
    res.json({'message':'invalid password'})
  }
  const token= jwt.sign({id:user._id},process.env.ACCESS_TOKEN_SECRET,{expiresIn:'7d'})
  res.cookie('token',token,{
    httpOnly:true,
    secure:process.env.NODE_ENV==='production',
    sameSite:process.env.NODE_ENV==='production' ? 'none':'strict',
    maxAge:7*24*60*60*1000
  })
  res.json({'message':'succesful login','token':token})

})



Authrouter.post('/SendResetPasswordEmail',AuthMiddleWare,async (req,res)=>{
  const user = await UserSchema.findById(req.user.id);

  /*
  const {email}=req.body
  if(!email){
    return res.json({'message':'email is required'})
  }
  const user=await UserSchema.findOne({email})
  */

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
        return res.json({'message':'password reset OTP sent successfully'})
      }catch(error){
        return res.json({'message':error.message})
      }

})