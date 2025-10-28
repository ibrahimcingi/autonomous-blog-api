import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

export const AuthMiddleWare=async (req,res,next)=>{
  const {token} = req.cookies
  if(!token){
    return res.json({'message':'Not Authorized'})
  }

  try{
    const decoded= jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    if(decoded.id){
      req.body.user_id=decoded.id
    }else{
      return res.json({'message':'Not Authorized'})
    }
    next()

  }catch(error){
    return res.json({'message':error.message})

  }
}
