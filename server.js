import dotenv from "dotenv";
import express from "express";
import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import session from "express-session";

import { connectDB } from "./db/connect.js";
import User from "./mongoose/usermongo.js";

connectDB()

dotenv.config();
const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static("public"));
app.use(express.json());
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret123",
    resave: false,
    saveUninitialized: true,
  })
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
  );
}

async function classifyEmail(email) {
  const prompt = `
Classify the following email into exactly one category from this list:
["urgent", "meeting", "important", "job_related", "follow_up", "promotion", "useless", "unknown"]

USE THIS STRICT PRIORITY ORDER WHEN CLASSIFYING (top has highest priority):

1. "urgent":
   - Deadlines, overdue invoices, payments, complaints, time-sensitive actions.

2. "meeting":
   - Any meeting-related content: invitations, mentions, reminders, joining links,
     Microsoft Teams/Zoom/Google Meet notifications, meeting IDs, passcodes.

3. "job_related":
   - Anything related to jobs, hiring, internships, applications, recruitment,
     opportunities, resumes, or interviews.

4. "follow_up":
   - Requires a reply or action but is NOT urgent and NOT a meeting.

5. "important":
   - Business or personal emails that have meaningful communication.
   - May include instructions, account changes, important info, or human-written messages
     that are relevant to the sender/recipient.
   - If the email is vague but clearly personal or business-related, classify as important.

6. "promotion":
   - Sales, offers, marketing, discounts, newsletters, advertisements.

7. "useless":
   - Greetings-only ("Hi", "Hello", "Hiiiiii", etc.), random chatter, signatures only,
     non-actionable emails, emails with no meaningful purpose, or irrelevant messages.

8. "unknown":
   - Only if the content is empty, corrupted, unreadable, or provides no information at all.

FALLBACK RULE:
If the email contains greetings, names, or casual human communication but has NO purpose,
NO useful information, and NO action — classify it as "useless", not "unknown".

RETURN ONLY VALID JSON WITH NO MARKDOWN:
{
  "category": "",
  "reason": ""
}

Email:
Subject: ${email.subject}
From: ${email.from}
Snippet: ${email.snippet}
`;


  try {
    const response = await model.generateContent(prompt);
    let text = response.response.text();
    
    // Clean the response - remove markdown code blocks and trim whitespace
    text = text
      .replace(/```json\n?/g, '')  // Remove opening ```json
      .replace(/```\n?/g, '')       // Remove closing ```
      .trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error parsing Gemini response:", error);
    console.error("Raw response:", response?.response?.text());
    
    // Return a default classification if parsing fails
    return {
      category: "unknown",
      reason: "Failed to analyze email"
    };
  }
}

app.get("/", (req, res) => {
  res.render("login");
});

app.get("/auth/google", (req, res) => {
  const oAuth2Client = getOAuthClient();

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    prompt: "consent",
  });

  res.redirect(authUrl);
});

app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  const oAuth2Client = getOAuthClient();

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  // Get logged-in user's Gmail address
  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  const profile = await gmail.users.getProfile({ userId: "me" });

  const gmailUserEmail = profile.data.emailAddress;

  // Store tokens in MongoDB
  await User.updateOne(
    { email: gmailUserEmail },
    {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    },
    { upsert: true }
  );

  // Store only email in session
  req.session.email = gmailUserEmail;

  res.redirect("/fetch-mails");
});

app.get("/fetch-mails", async (req, res) => {
  try {

    const user = await User.findOne({ email: req.session.email });
    if (!user) return res.status(401).send("User not authenticated");


    const oAuth2Client = getOAuthClient();
    oAuth2Client.setCredentials({
      access_token: user.accessToken,
      refresh_token: user.refreshToken,
      expiry_date: user.expiryDate,
    });

     oAuth2Client.on("tokens", async (tokens) => {
      if (tokens.access_token) user.accessToken = tokens.access_token;
      if (tokens.refresh_token) user.refreshToken = tokens.refresh_token;
      if (tokens.expiry_date) user.expiryDate = tokens.expiry_date;

      await user.save();
    });

    const gmail = google.gmail({
      version: "v1",
      auth: oAuth2Client
    });


    const result = await gmail.users.messages.list({
      userId: "me",
      maxResults: 50,
    });

    const messages = result.data.messages || [];

    const fastEmails = await Promise.all(
      messages.map(async (msg) => {
        const data = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "full",
          metadataHeaders: ["Subject", "From", "Date"]
        });

        const headers = data.data.payload.headers;

        const get = (name) => headers.find(h => h.name === name)?.value || "";

        return {
          id: msg.id,
          subject: get("Subject"),
          from: get("From"),
          date: get("Date"),
          snippet: data.data.snippet || "",
        };
      })
    );

    // CLASSIFY EMAILS with error handling
    const enrichedEmails = await Promise.all(
      fastEmails.map(async (email) => {
        try {
          const analysis = await classifyEmail(email);
          return { ...email, ...analysis };
        } catch (error) {
          console.error(`Error classifying email "${email.subject}":`, error);
          return { 
            ...email, 
            category: "unknown", 
            reason: "Classification failed" 
          };
        }
      })
    );

    res.render("Home", {
      count: enrichedEmails.length,
      mails: enrichedEmails
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch emails." });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
