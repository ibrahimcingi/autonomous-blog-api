import mongoose from "mongoose";

const blogCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  textQuantity: Number,//we can restraint by some max quantity
  
},{timestamps:true});

export default mongoose.model("BlogCategory", blogCategorySchema);