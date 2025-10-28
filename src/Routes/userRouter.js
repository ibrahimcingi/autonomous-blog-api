import express from 'express'
import UserSchema from '../models/UserSchema.js'
import transporter from '../config/nodeMailer.js'
import dotenv from 'dotenv'

dotenv.config()

export const UserRouter=express.Router()

UserRouter.post('/registration',async (req,res)=>{
  const {name,password,email}=req.body
  if(!name || !password || !email){
    return res.json({'message':' Register failed due to Missing properties'})
  }
  const existingUser = await UserSchema.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Bu email zaten kayıtlı." });
    }


  const emailOptions={
    from: process.env.SENDER_EMAIL,
    to: email,
    subject: "Welcome to Our App",
    text: `Hello ${name}! your account has been created.`, 
  }

  UserSchema.create(req.body)
  .then(user => {
    res.status(200).json(user); // kullanıcıyı hemen gönder
    transporter.sendMail(emailOptions)
      .then(() => console.log('Welcome mail sent'))
      .catch(err => console.log('Mail error:', err.message));
  })
  .catch(err => res.status(500).json({ message: err.message }));

})


UserRouter.delete('/deleteAll', async (req, res) => {
  try {
    const result = await UserSchema.deleteMany({}); // tüm kullanıcıları siler
    res.status(200).json({
      message: `✅ ${result.deletedCount} kullanıcı silindi.`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


