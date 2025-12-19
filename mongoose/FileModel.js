// mongoose/fileModel.js
import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  fileType: { type: String, required: true },
  size: { type: Number, required: true },
  uploaderName: { type: String, required: true }, // Just a name field
  uploadedAt: { type: Date, default: Date.now },
  description: { type: String, default: "" },
  fileUrl: { type: String, required: true } // Store the URL directly
});

const File = mongoose.model("File", fileSchema);
export default File;