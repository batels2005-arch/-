const mongoose=require('mongoose');
const schema=new mongoose.Schema({name:{type:String,required:true,trim:true},price:{type:Number,required:true,min:0},category:{type:String,required:true},description:{type:String,default:''},image:{type:String,default:''},inStock:{type:Number,default:0,min:0}},{timestamps:true});module.exports=mongoose.model('Product',schema);
