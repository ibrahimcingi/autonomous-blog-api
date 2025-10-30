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
    minlength: [6, "Password must be at least 6 characters long"]
  },
  googleId: { type: String,required:false },
  
  wordpressUrl: { type: String, required: false },
  wordpressPassword: { type: String, required: false },
  categories: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  
},{timestamps:true})

UserSchema.pre("save", async  function (next) {
  if (!this.isModified("password")) return next(); 
  this.password = await bcrypt.hash(String(this.password), 10);
  next();
});

UserSchema.pre("save", async  function (next) {
  if (!this.isModified("wordpressPassword")) return next(); 
  this.wordpressPassword = await bcrypt.hash(String(this.wordpressPassword), 10);
  next();
});

export default mongoose.model("User", UserSchema);