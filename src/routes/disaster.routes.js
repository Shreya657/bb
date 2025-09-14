import express, { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { predictDisaster } from "../controllers/disaster.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Route to serve the upload HTML page
router.route("/upload").get((req, res) => {
  res.sendFile(path.join(__dirname, "../public/disaster-upload.html"));
});

// Route to handle prediction
// Temporarily removed verifyJWT middleware for testing
router.route("/predict").post(upload.single("file"), predictDisaster);

export default router;
