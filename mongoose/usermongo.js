import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },

  accessToken: String,
  refreshToken: String,
  expiryDate: Number,

  createdAt: { type: Date, default: Date.now }
});

// This is the IMPORTANT line:
const User = mongoose.model("User", userSchema);

export default User;   // <-- YOU WERE MISSING THIS
