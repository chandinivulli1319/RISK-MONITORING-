require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("./db");
const { sendAlertEmail } = require("./mailer");

const app = express();
app.use(cors());
app.use(express.json());

const AI_URL = process.env.AI_URL || "http://127.0.0.1:8000";

// ---------- Photo uploads (used only by the photo analysis route) ----------
const UPLOAD_DIR = path.join(__dirname, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp"];
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      let ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) ext = ".jpg";
      cb(null, `${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },          // 8 MB
  fileFilter: (req, file, cb) =>
    cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)),
});
app.use("/uploads", express.static(UPLOAD_DIR));  // lets the dashboard show the annotated photo

// ---------- Helpers ----------
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Login required" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Wraps an async route so a thrown error becomes a clear message instead of a crash
const safe = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((e) => {
    console.error(e);
    res.status(500).json({ error: `Server error (${e.code || e.message})` });
  });

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isAiConnectionProblem = (e) =>
  /fetch failed|ECONNREFUSED/i.test(String(e.message) + String(e.cause || ""));

// Saves one analysis (score, hazards, alert and email). Used by both analysis routes.
async function saveAnalysis(site, ai, imageUrl) {
  const [saved] = await db.query(
    "INSERT INTO analyses (site_id, score, level, image_path) VALUES (?, ?, ?, ?)",
    [site.id, ai.score, ai.level, imageUrl]
  );
  const analysisId = saved.insertId;

  if (ai.hazards.length > 0) {
    const rows = ai.hazards.map((h) => [
      analysisId, h.category, h.severity, String(h.description || "").slice(0, 255), h.risk,
    ]);
    await db.query(
      "INSERT INTO hazards (analysis_id, category, severity, description, risk) VALUES ?",
      [rows]
    );
  }

  let emailSent = false;
  if (ai.level === "High" || ai.level === "Critical") {
    const [alertRow] = await db.query(
      "INSERT INTO alerts (analysis_id, message) VALUES (?, ?)",
      [analysisId, `${ai.level} risk at ${site.name} (score ${ai.score})`]
    );
    const mail = await sendAlertEmail({
      siteName: site.name, score: ai.score, level: ai.level,
      hazards: ai.hazards, recommendations: ai.recommendations,
    });
    emailSent = mail.sent;
    if (mail.sent) {
      await db.query("UPDATE alerts SET email_sent = TRUE WHERE id = ?", [alertRow.insertId]);
    }
  }
  return { analysisId, emailSent };
}

app.get("/", (req, res) => res.json({ status: "Node server is running" }));

// ---------- Register ----------
app.post("/api/register", safe(async (req, res) => {
  const name = String((req.body || {}).name || "").trim();
  const email = String((req.body || {}).email || "").trim().toLowerCase();
  const password = String((req.body || {}).password || "");

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are required." });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
  if (existing.length > 0) {
    return res.status(409).json({ error: "This email is already registered. Log in instead." });
  }

  const hash = await bcrypt.hash(password, 10);   // never store the real password
  try {
    const [result] = await db.query(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, hash]
    );
    res.status(201).json({ id: result.insertId, name, email });
  } catch (e) {
    console.error("Register failed:", e);
    // e.code is the database's own error name, such as ER_NO_SUCH_TABLE or ECONNREFUSED
    res.status(500).json({ error: `Could not create the account (${e.code || e.message}).` });
  }
}));

// ---------- Login ----------
app.post("/api/login", safe(async (req, res) => {
  const email = String((req.body || {}).email || "").trim().toLowerCase();
  const password = String((req.body || {}).password || "");
  const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
  if (rows.length === 0) return res.status(401).json({ error: "Wrong email or password." });

  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Wrong email or password." });

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
}));

// ---------- Profile ----------
const PROFILE_COLUMNS = "id, name, email, job_title, phone, created_at";
const PROFILE_HINT =
  "The profile columns are missing. Run database/migration_users_profile.sql in phpMyAdmin once.";

app.get("/api/profile", auth, safe(async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT ${PROFILE_COLUMNS} FROM users WHERE id = ?`, [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (e) {
    if (e.code === "ER_BAD_FIELD_ERROR") return res.status(500).json({ error: PROFILE_HINT });
    throw e;
  }
}));

app.put("/api/profile", auth, safe(async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim().toLowerCase();
  const jobTitle = String(b.job_title || "").trim() || "Site Team Member";
  const phone = String(b.phone || "").trim();

  if (!name) return res.status(400).json({ error: "Full name is required." });
  if (name.length > 100) return res.status(400).json({ error: "Full name is too long." });
  if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (jobTitle.length > 100) return res.status(400).json({ error: "Job title is too long." });
  if (phone && !/^[0-9+()\-\s]{6,20}$/.test(phone)) {
    return res.status(400).json({ error: "Enter a valid phone number (digits, spaces, + - and brackets)." });
  }

  try {
    const [taken] = await db.query("SELECT id FROM users WHERE email = ? AND id <> ?", [email, req.user.id]);
    if (taken.length > 0) return res.status(409).json({ error: "That email belongs to another account." });

    await db.query(
      "UPDATE users SET name = ?, email = ?, job_title = ?, phone = ? WHERE id = ?",
      [name, email, jobTitle, phone || null, req.user.id]
    );
    const [rows] = await db.query(`SELECT ${PROFILE_COLUMNS} FROM users WHERE id = ?`, [req.user.id]);
    res.json(rows[0]);
  } catch (e) {
    if (e.code === "ER_BAD_FIELD_ERROR") return res.status(500).json({ error: PROFILE_HINT });
    throw e;
  }
}));

// ---------- Sites ----------
app.get("/api/sites", auth, safe(async (req, res) => {
  const [rows] = await db.query("SELECT * FROM sites ORDER BY id");
  res.json(rows);
}));

// ---------- Analysis from the details typed in the dashboard ----------
app.post("/api/analyze/:siteId", auth, safe(async (req, res) => {
  const [sites] = await db.query("SELECT * FROM sites WHERE id = ?", [req.params.siteId]);
  if (sites.length === 0) return res.status(404).json({ error: "Site not found" });
  const site = sites[0];

  const body = req.body || {};
  const workersTotal = site.workers_total || 1;
  const list = (v) => (Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean) : []);
  const payload = {
    name: site.name,
    latitude: site.latitude,
    longitude: site.longitude,
    workers_total: workersTotal,
    workers_without_helmet: Math.min(Math.max(Number(body.workers_without_helmet) || 0, 0), workersTotal),
    faulty_equipment: list(body.faulty_equipment),
    open_incidents: list(body.open_incidents),
  };

  let ai;
  try {
    const response = await fetch(`${AI_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("AI service returned " + response.status);
    ai = await response.json();
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "AI service not reachable. Is it running on port 8000?" });
  }

  const { analysisId, emailSent } = await saveAnalysis(site, ai, null);
  res.json({ analysisId, emailSent, ...ai });
}));

// ---------- Photo analysis (separate flow, own dashboard tab) ----------
app.post("/api/analyze-photo", auth, upload.single("photo"), safe(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Attach a photo (JPG, PNG or WebP, up to 8 MB)." });
  }
  const [sites] = await db.query("SELECT * FROM sites WHERE id = ?", [(req.body || {}).site_id]);
  if (sites.length === 0) return res.status(404).json({ error: "Choose a site first." });
  const site = sites[0];

  let ai;
  try {
    const response = await fetch(`${AI_URL}/analyze-photo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_path: req.file.path, workers_total: site.workers_total || 1 }),
    });
    if (!response.ok) {
      const detail = (await response.json().catch(() => ({}))).detail;
      return res.status(502).json({ error: `Photo analysis failed: ${detail || "AI service error " + response.status}` });
    }
    ai = await response.json();
  } catch (e) {
    console.error(e);
    if (isAiConnectionProblem(e)) {
      return res.status(502).json({ error: "AI service not reachable. Is it running on port 8000?" });
    }
    throw e;
  }

  const annotatedUrl = `/uploads/${ai.annotated_file}`;
  const { analysisId, emailSent } = await saveAnalysis(site, ai, annotatedUrl);
  res.json({ analysisId, emailSent, annotated_url: annotatedUrl, site_name: site.name, ...ai });
}));

// ---------- History of one site ----------
app.get("/api/sites/:siteId/history", auth, safe(async (req, res) => {
  const [rows] = await db.query(
    "SELECT id, score, level, image_path, created_at FROM analyses WHERE site_id = ? ORDER BY created_at DESC LIMIT 20",
    [req.params.siteId]
  );
  res.json(rows);
}));

// ---------- One analysis with its hazards ----------
app.get("/api/analyses/:id", auth, safe(async (req, res) => {
  const [analysis] = await db.query("SELECT * FROM analyses WHERE id = ?", [req.params.id]);
  if (analysis.length === 0) return res.status(404).json({ error: "Not found" });
  const [hazards] = await db.query(
    "SELECT category, severity, description, risk FROM hazards WHERE analysis_id = ? ORDER BY risk DESC",
    [req.params.id]
  );
  res.json({ ...analysis[0], hazards });
}));

// ---------- Alerts ----------
app.get("/api/alerts", auth, safe(async (req, res) => {
  const [rows] = await db.query("SELECT * FROM alerts ORDER BY created_at DESC LIMIT 50");
  res.json(rows);
}));

// ---------- Upload errors (file too large, etc.) ----------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === "LIMIT_FILE_SIZE" ? "Photo is too large (maximum 8 MB)." : err.message;
    return res.status(400).json({ error: msg });
  }
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
