import multer from "multer" //importing multer a node.js middleware for handing multipart/form-data 


const storage = multer.diskStorage({ //is a storage engine that customizes storage path and filename
  destination: function (req, file, cb) { //where to store the file:public/temp
    cb(null, "./uploads/tmp")  //here multer temporarily save the files
  },
  filename: function (req, file, cb) {//what to name file on disk
   const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
    cb(null, safeName);
  }
})

export const upload = multer({ storage, }) //it create multer middleware called upload using custom storage setting