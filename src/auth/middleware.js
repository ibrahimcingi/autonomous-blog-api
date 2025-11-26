import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import UserSchema from '../models/UserSchema.js';


dotenv.config()

export const AuthMiddleWare = async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ message: "Not Authorized" });
  }

  try {
    // TOKEN DECODE
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    if (!decoded.id) {
      return res.status(401).json({ message: "Not Authorized" });
    }

    // DB'DEN KULLANICIYI ÇEK
    const user = await UserSchema.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "Not Authorized" });
    }

    // TOKEN VERSION KONTROL — kritik! 🔥
    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ message: "Token expired or invalid" });
    }

    // Kullanıcı bilgisini req içine koy
    req.user = {
      id: user._id,
      tokenVersion: user.tokenVersion
    };

    return next();

  } catch (error) {
    return res.status(401).json({ message: error.message });
  }
};


