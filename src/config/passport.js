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

          const emailOptions={
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: "Welcome to Our App",
            text: `Hello ${profile.displayName}! your account has been created.`, 
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
