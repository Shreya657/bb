import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async(userId)=>{
  try{
    const user= await User.findById(userId); //fetch user from db by id
    const accessToken= user.generateAccessToken()  //generate short-lived tokens,generally for 15 mins..   //they are methods to find user id from User
    const refreshToken= user.generateRefreshToken()//generate long lived refresh token

    user.refreshToken=refreshToken //saving refresh token in db and keeping a reference to user
    await user.save({validateBeforeSave: false })  // ✅ Save updated user without running validation checks
    console.log("token: ",refreshToken)

    return {accessToken,refreshToken}

  }catch(error){
    throw new ApiError(500,"something went wrong while generating refresh and access token")
  }
}




const registerUser=asyncHandler(async(req,res)=>{
    //  res.status(200).json({
    //     message:"ok"
    // })

      // 1) get user details
        const {fullname,email,username,password}=req.body
         console.log("email: ",email);

   

//2) check validation check

// if(fullname===""){
//     throw new ApiError(400,"all fields are required");
// }  //you can also write for all like this

// using method for multiple entries
    if(
            [fullname,email,username,password].some((field)=>
                    field ?.trim()==="")

    ){
        throw new ApiError(400,"all fields are required");
    }


    if(!email.includes("@")){ //check if valid email check
                throw new ApiError(400,"all fields are required")

    }



    //3) check user if already exist
    const existedUser=await User.findOne({    //method call for User
        $or: [ {username},  {email}]  //if username or email --any of them found
    })

    if(existedUser){    // if username or  email found existed then throw an error
        throw new ApiError(409,"User with email or username already exist")
    }

    console.log(req.files)


  




  //7) create an user object to store on db.as it takes times so await 
 const user= await User.create({
    fullname,
    email,
    password,
    username:username.toLowerCase()
  })
  

  //when an object entered mongodb always creates a _id name by default
  //8) remove password and refresh token field from response
  // Step 8: Remove sensitive fields before sending response
  const createdUser= await User.findById(user._id).select(
    "-password -refreshToken"

  )


//9) check for created user
  if(!createdUser){
    throw new ApiError(500,"chud gaye guru while registering the user")
  }


  //10) return response or error
  return res.status(201).json(
    new ApiResponse(200,createdUser,"user registered successfully")
  )







})
//        to register
//get user details from frontend
//validation--not empty
//check if user already exist: u can check if username or email is uniqueue or not
//check for images,check for avatar
//upload them to cloudinary, avatar
//create user object-- create entry in db
//remove password and refresh token field from response
//check for user creation
//return response if not send error



const loginUser=asyncHandler(async(req,res)=>{

const {email,username,password}=req.body;

if(!username && !email){
  throw new ApiError(400,"username or email is required");
}

 const user= await User.findOne({

  $or: [{username},{email}] //this will find username or email inme se agar koi bhi pre exist karta hai to
})

if(!user){
  throw new ApiError(404,"user not found");
}

const isPasswordValid= await user.isPasswordCorrect(password);

if(!isPasswordValid){
  throw new ApiError(401,"invalid user credentials");
}

  // ✅ Generate new access and refresh tokens
const {accessToken, refreshToken}= await generateAccessAndRefreshTokens(user._id)



  // ✅ Fetch user again and remove sensitive fields (password, refreshToken)
const loggedInUser= await User.findById(user._id).
select("-password -refreshToken")


  // ✅ Cookie options (secure + httpOnly)
const options={
  httpOnly:true,  // Not accessible from JavaScript
  secure: true     // Sent only over HTTPS

}


// ✅ Send tokens in secure cookies + return safe user data
return res.
status(200)
.cookie("accessToken",accessToken,options)
.cookie("refreshToken",refreshToken,options )
.json(
  new ApiResponse(200,
    {
      user:loggedInUser,accessToken,refreshToken
    },
    "user logged in successfully"
  )
)





})

//      to login
//req body->data
//username or email
//find the user
//password check
//access and refresh token generate
//send cookie



const logoutUser=asyncHandler(async(req,res)=>{
 await User.findByIdAndUpdate(//findbyId: read the doc and returns if found but findbyidandupdates used for updates which save changes in db
  req.user._id, //using auth middleware to fetch user._id from token verification
  {
    $set: {
      refreshToken: undefined   // 🔄 Remove the stored refresh token in DB
    }
  },
  {
    new: true    //If { new: true } is passed, it returns the updated document
   // (without it, it returns the old document before update)
    
    
  }
 )

 const options={
  httpOnly:true,
  secure: true
}
return res
.status(200)
.clearCookie("accessToken",options)
.clearCookie("refreshToken",options)
.json(new ApiResponse(200,{},"User logged out"))

})










// ✅ What refreshAccessToken Does
// It is a route handler that:

// Reads the refresh token from cookies or request body

// Verifies it using JWT

// Finds the user from the DB

// Checks if the refresh token matches the one stored in the DB

// Generates a new access token + refresh token

// Sends both back as secure cookies


const refreshAccessToken=asyncHandler(async(req,res)=>{
const incomingRefreshToken=  req.body.refreshToken|| req.cookies.refreshToken ;  
 //✅ Looks for refreshToken:
// First in cookies
// If not found, tries from req.body (good fallback)
if(!incomingRefreshToken)
{
  throw new ApiError(401,"unauthorized request");
}
try {

  //🔐 Decode and verify the refresh token.
// If token is invalid or expired, it throws → handled in catch
    const decodedToken= jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  )
  

  //🔍 Find the user from DB using ID from token payload
  const user= await User.findById(decodedToken?._id)
  
  if(!user){
      throw new ApiError(401,"invalid refresh token");
  
  }
  //🔒 Make sure the refresh token from client matches the one stored in DB
  if(incomingRefreshToken!==user?.refreshToken){
        throw new ApiError(401,"refresh token is expired or used");
  
  }
  
  //⚠️ Protects against token reuse or stolen token
  const options={
    httpOnly:true,
    secure: true
  }
  
  const {accessToken,refreshToken}= await generateAccessAndRefreshTokens(user._id);
  user.refreshToken = refreshToken;
await user.save({ validateBeforeSave: false });
console.log("token: ",refreshToken)
  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken,options)
  .json(
    new ApiResponse(
      200,
      {accessToken,refreshToken},
      "access token refreshed"
    )
  )
  
} catch (error) {
    throw new ApiError(401,error?.message || "invalid refresh token")
  
}




})




// const changeCurrentPassword=asyncHandler(async(req,res)=>{
//   const {oldPassword,newPassword,confirmPassword}=req.body

//   if(newPassword!==confirmPassword){
//     throw new ApiError(400,"password doesnt match")
//   }

//  const user= await User.findById(req.user?._id)
//  console.log("req.user:", req.user);

// if(!user){
//   throw new ApiError(404,"user not found");
// }
//  const isPasswordCorrect= await user.isPasswordCorrect(oldPassword)

//  if(!isPasswordCorrect){
//   throw new ApiError(400,"invalid old password")
//  }

//  user.password=newPassword
//  await user.save({validateBeforeSave:false})

//  return res
//  .status(200)
//  .json(new ApiResponse(200,{},"password changed successfully"))
// })



//getCurrentUser endpoint 




const getCurrentUser=asyncHandler(async(req,res)=>{
  return res
  .status(200)
  .json(new ApiResponse(200,req.user,"current user fetched successful"));
})





// const updateAccountDetails=asyncHandler(async(req,res)=>{

//   const {fullname,email}=req.body

//   if(!fullname || !email){
//     throw new ApiError(400,"all fields required")
//   }

//   const user= await User.findByIdAndUpdate(req.user?._id,
//     {
//       $set:{
//         fullname:fullname,
//         email:email
//       }

//     },
//     {new:true}
//   ).select("-password")

//   return res
//   .status(200)
//   .json(new ApiResponse(200,user,"Account details updated successfully"))
// })



export {registerUser,loginUser,logoutUser,refreshAccessToken,getCurrentUser};



