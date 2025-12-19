import mongoose from "mongoose";

const EmailSchema = new mongoose.Schema({
  messageId: { type: String, unique: true },
  subject: String,
  from: String,
  snippet: String,
  category: String,
  reason: String,
  classifiedAt: Date,
});

const Mail = mongoose.model("Mails", EmailSchema);

export default Mail;