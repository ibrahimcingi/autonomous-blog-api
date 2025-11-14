import express from 'express'
import UserSchema from '../models/UserSchema.js'
import transporter from '../config/nodeMailer.js'
import dotenv from 'dotenv'
import { AuthMiddleWare } from '../auth/middleware.js'
import bcrypt from 'bcrypt'
import { encryptText } from '../../utils/crypto.js'
import redisClient from '../config/redis.js'


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


    

  UserSchema.create(req.body)
  .then(user => {
    res.status(200).json(user); 
    transporter.sendMail(emailOptions)
      .then(() => console.log('Welcome mail sent'))
      .catch(err => console.log('Mail error:', err.message));
  })
  .catch(err => res.status(500).json({ message: err.message }));

})

UserRouter.get('/getAll', async (req, res) => {
  try {
    const users = await UserSchema.find({});

    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'not found' });
    }

    // Başarılı durum
    return res.status(200).json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

UserRouter.get('/me',AuthMiddleWare, async (req,res)=>{
  try{
    const userId = req.user.id;
      if (!userId) {
        console.log('not authorized')
        return res.status(401).json({ message: "Not Authorized" });
      }
      const cacheKey = `users:${userId}`;
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log("✅ Redis cache hit");
        return res.json(JSON.parse(cached));
      }
      const userDoc = await UserSchema.findById(userId);
      if (!userDoc) {
        console.log('user not found')
        return res.status(401).json({ message: "user not authenticated " });
      }
      if(userDoc.wordpressUrl){
        await redisClient.setEx(cacheKey, 120, JSON.stringify({user:userDoc}));
      }

      

      return res.json({user:userDoc})
  }catch(error){
    res.status(500).json({ message: error.message });

  }
})


UserRouter.post('/testEmail',(req,res)=>{
  try{
    const emailOptions={
      from:process.env.SENDER_EMAIL,
      to:'cingiibrahim76@gmail.com',
      subject:'hello this is a test mail'
    }
  
    transporter.sendMail(emailOptions)

    res.send({'success':'true'})

  }catch(error){
    res.send({"error":error.message})
  }
  

})




UserRouter.delete('/deleteAll', async (req, res) => {
  try {
    const result = await UserSchema.deleteMany(); // tüm kullanıcıları siler
    res.status(200).json({
      message: `✅ ${result.deletedCount} kullanıcı silindi.`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


UserRouter.delete('/deleteOne', async (req, res) => {
  const {email}=req.body
  try {
    await UserSchema.findOneAndDelete({email}); 
    res.status(200).json({
      message: `kullanıcı silindi.`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

UserRouter.put('/UpdateAccount',AuthMiddleWare,async (req,res)=>{
  const {name,email}=req.body

  const userId=req.user?.id
  try{
    if(userId){
      const user=await UserSchema.findById(userId);

      if(user.name!==name || user.email!==email){
        await redisClient.del(`users:${userId}`);
      }
      user.name=name;
      user.email=email

      await user.save()

      return res.json({
        success:'true',
        message:'successfully saved'
      })

    }else{
      res.status(401).json({ message: 'Not Authorized' });

    }
  }catch(error){
    return res.json({
      success:'false',
      message:error.message
    })

  }
})

UserRouter.put('/ChangePassword',AuthMiddleWare,async (req,res)=>{
  const userId=req.user?.id
  const {currentPassword,newPassword}=req.body
  try{
    if(userId){
      const user=await UserSchema.findById(userId);

    const isMatch = await bcrypt.compare(String(currentPassword), String(user.password));
    if (!isMatch) {
      return res.status(401).json({ message: 'invalid password' });
    }
      user.password=newPassword

      await user.save() 

      return res.json({
        success:'true',
        message:'successfully changed password'
      })

    }else{
      res.status(401).json({ message: 'Not Authorized' });

    }
  }catch(error){
    return res.json({
      success:'false',
      message:error.message
    })

  }
})

UserRouter.put('/WordpressUpdate',AuthMiddleWare,async (req,res)=>{
  const userId=req.user?.id
  const {wordpressUrl,wordpressUsername,wordpressPassword,categories}=req.body

  try{
    if(userId){
      const user=await UserSchema.findById(userId)

      if(user.wordpressUrl!==wordpressUrl || user.wordpressUser!==wordpressUsername || user.wordpressPassword!==encryptText(wordpressPassword || user.categories!==categories)){

        await redisClient.del(`summary:${user.wordpressUrl}`);

      }
  
      user.wordpressUrl=wordpressUrl
      user.wordpressUser=wordpressUsername
      user.wordpressPassword=encryptText(wordpressPassword)
      
      user.categories=categories
      await user.save()

      

  
    }else{
      res.status(401).json({ message: 'Not Authorized' });
  
    }

    return res.json({
      success:'true',
      message:'successfully updated wordpress settings'
    })

  }catch(error){
    return res.json({
      success:'false',
      message:error.message
    })

  }
})

UserRouter.put('/NotificationsUpdate',AuthMiddleWare,async (req,res)=>{
  const userId=req.user?.id
  const {emailOnPublish,weeklyReport,systemUpdates}=req.body

  try{
    if(userId){
      const user=await UserSchema.findById(userId)

      if(user.notifications.emailOnPublish!==emailOnPublish|| user.notifications.weeklyReport!==weeklyReport || user.notifications.systemUpdates!==systemUpdates){
        await redisClient.del(`users:${userId}`);
      }
      

      user.notifications.emailOnPublish=emailOnPublish
      user.notifications.weeklyReport=weeklyReport
      user.notifications.systemUpdates=systemUpdates
  
      await user.save()
    }else{
      res.status(401).json({ message: 'Not Authorized' });

    }
   
    return res.json({
      success:'true',
      message:'successfully updated notification settings'
    })



  }catch(error){
    return res.json({
      success:'false',
      message:error.message
    })

  }

})

UserRouter.put('/PlanUpdate',AuthMiddleWare,async (req,res)=>{
  const userId=req.user?.id
  const {SelectedPlan,billingCycle} = req.body
  try{
    if(userId){
      const user=await UserSchema.findById(userId)
      if(SelectedPlan!==user.currentPlan || billingCycle!==user.billingCycle){
        await redisClient.del(`users:${userId}`);
      }
      user.currentPlan=SelectedPlan
      user.billingCycle=billingCycle

      await user.save()

      return res.json({
        success:'true',
        message:'successfully updated plan'
      })
    }else{
      return res.status(401).json({
        success:'false',
        message:'Not Authorized'
      })
    }
  }catch(error){
    return res.json({
      success:'false',
      message:error.message
    })

  }
})

UserRouter.delete("/deleteLoginHistory", AuthMiddleWare, async (req, res) => {
  const userId = req.user.id;
  const { historyId } = req.body;

  try {
    if (!userId) {
      return res.json({
        success: false,
        message: "Not Authorized",
      });
    }

    const user = await UserSchema.findById(userId);

    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    // ObjectId karşılaştırmak için .equals kullan
    user.loginHistory = user.loginHistory.filter(
      (item) => !item._id.equals(historyId)
    );

    await user.save();

    return res.json({
      success: true,
      message: "History item removed",
      loginHistory: user.loginHistory,
    });

  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
});


UserRouter.put('/ClearLoginHistory',AuthMiddleWare,async (req,res)=>{
  const userId=req.user.id

  try{
    if(userId){
      const user=await UserSchema.findById(userId)

      user.loginHistory=[]

      await user.save()

      await redisClient.del(`users:${userId}`);

      return res.json({
        success:'true',
        message:'successfully cleared Login History'
      })

    }else{
      return res.json({
        success:'false',
        message:'Not Authorized'
      })

    }
  }catch(error){
    return res.json({
      success:'false',
      message:error.message
    })
  }

})

UserRouter.delete('/DeleteAccount',AuthMiddleWare,async (req,res)=>{
  const userId=req.user?.id
  try{
    if(userId){
      await UserSchema.findByIdAndDelete(userId)

      await redisClient.del(`users:${userId}`);

      return res.json({
        success:'true',
        message:'successfully deleted account'
      })

    }
  }catch(error){
    return res.json({
      success:'false',
      message:error.message
    })
  }
})



