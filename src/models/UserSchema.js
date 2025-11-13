import mongoose from "mongoose";
import bcrypt from 'bcrypt'

const UserSchema=new mongoose.Schema({
  name:{
    type:String,
    required:true
  },
  email:{
    type:String,
    required:true,
    unique: true,
    match: [/.+\@.+\..+/, "Please enter a valid email address"],
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; 
    },
    minlength: [8, "Password must be at least 6 characters long"]
  },
  googleId: { type: String,required:false },
  
  resetOTP:{
    type:String,
    default:''
  },
  resetOTPExpiresIn:{
    type:Number,
    default:0
  },
  
  wordpressUrl: { type: String, required: false },
  wordpressPassword: { type: String, required: false },
  wordpressUser:{type: String, required: false},
  categories: [{ type: String }],
  createdAt: { type: Date, default: Date.now },

  currentPlan:{type:Object,enum:[
    {
      name: 'Free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        '5 Blog/Ay',
        '2 Kategori',
        'Temel AI Özellikleri',
        'Email Desteği',
        'WordPress Entegrasyonu'
      ]
    },
    {
      name: 'Pro',
      monthlyPrice: 29,
      yearlyPrice: 290,
      features: [
        'Sınırsız Blog',
        'Sınırsız Kategori',
        'Gelişmiş AI Özellikleri',
        'Öncelikli Destek',
        'WordPress Entegrasyonu',
        'SEO Optimizasyonu',
        'Analitik Dashboard'
      ]
    },
    {
      name: 'Enterprise',
      monthlyPrice: 99,
      yearlyPrice: 990,
      features: [
        'Sınırsız Blog',
        'Sınırsız Kategori',
        'Özel AI Modeli',
        '7/24 Destek',
        'Çoklu WordPress Siteleri',
        'Özel SEO Stratejileri',
        'Gelişmiş Analitik',
        'API Erişimi',
        'Özel Eğitim'
      ]}],default:{
        name: 'Pro',
        monthlyPrice: 29,
        yearlyPrice: 290,
        features: [
          'Sınırsız Blog',
          'Sınırsız Kategori',
          'Gelişmiş AI Özellikleri',
          'Öncelikli Destek',
          'WordPress Entegrasyonu',
          'SEO Optimizasyonu',
          'Analitik Dashboard'
        ]
      } },
  billingCycle:{type:String,enum: ['monthly', 'yearly'],default:'monthly'},

  notifications: {
    emailOnPublish: { type: Boolean, default: true },
    weeklyReport: { type: Boolean, default: false },
    systemUpdates: { type: Boolean, default: false }
  },


},{timestamps:true})

UserSchema.pre("save", async  function (next) {
  if (!this.isModified("password")) return next(); 
  this.password = await bcrypt.hash(String(this.password), 10);
  next();
});




export default mongoose.model("User", UserSchema);