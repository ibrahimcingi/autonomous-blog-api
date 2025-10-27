import mongoose from "mongoose";

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
  wordpressUrl: { type: String, required: true },
  wordpressPassword: { type: String, required: true },
  categories: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  
},{timestamps:true})

export default mongoose.model("User", UserSchema);