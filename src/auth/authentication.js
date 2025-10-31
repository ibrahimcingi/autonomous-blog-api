import UserSchema from "../models/UserSchema.js"
import jwt from 'jsonwebtoken'
import express from 'express'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import passport from "passport";
import "../config/passport.js";



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