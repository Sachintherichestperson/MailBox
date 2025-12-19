import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import { connectDB } from "./db/connect.js";
import File from "./mongoose/fileModel.js";
import { upload } from "./config/uploadConfig.js";
import { ensureUploadsDir } from "./utils/fileUtils.js";

dotenv.config();
const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists before starting
ensureUploadsDir();

import cookieParser from "cookie-parser";

app.use(cookieParser());
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");

connectDB();

// Home page - show upload form and list of files
app.get("/", async (req, res) => {
  try {
    const files = await File.find().sort({ uploadedAt: -1 });
    res.render("index", { 
      files,
      success: req.query.success === 'true',
      error: req.query.error 
    });
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).send("Error loading files");
  }
});

// Simple upload route (POST)
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect("/?error=No+file+uploaded");
    }

    // Get uploader name from form
    const uploaderName = req.body.uploaderName || "Anonymous";
    const description = req.body.description || "";

    // For local storage, create the URL
    const fileUrl = `/uploads/${req.file.filename}`;

    // Create file record
    const newFile = new File({
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      size: req.file.size,
      uploaderName: uploaderName,
      description: description,
      fileUrl: fileUrl
    });

    await newFile.save();
    
    // Redirect back to home page with success message
    res.redirect("/?success=true");
  } catch (error) {
    console.error("Upload error:", error);
    res.redirect("/?error=" + encodeURIComponent(error.message));
  }
});

// View file details
app.get("/file/:id", async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return res.status(404).send("File not found");
    }

    // Check if file exists on disk
    const filePath = path.join(__dirname, 'public', file.fileUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File not found on server");
    }

    res.render("fileView", { 
      file,
      isImage: file.fileType.startsWith("image/"),
      isPDF: file.fileType === "application/pdf",
      isExcel: file.fileType.includes('excel') || 
               file.fileType.includes('spreadsheet') ||
               file.originalName.match(/\.(xlsx|xls|csv)$/i),
      isPowerpoint: file.fileType.includes('powerpoint') || 
                    file.fileType.includes('presentation') ||
                    file.originalName.match(/\.(pptx|ppt)$/i),
      isPowerBI: file.originalName.match(/\.pbix$/i),
      isWord: file.fileType.includes('word') || 
              file.originalName.match(/\.(docx|doc)$/i)
    });
  } catch (error) {
    console.error("Error fetching file:", error);
    res.status(500).send("Error loading file");
  }
});

// Direct download link
app.get("/download/:id", async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return res.status(404).send("File not found");
    }

    const filePath = path.join(__dirname, 'public', file.fileUrl);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File not found on server");
    }

    // Set headers for download
    res.download(filePath, file.originalName);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).send("Download failed");
  }
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Uploads directory: ${path.join(__dirname, 'public/uploads')}`);
});