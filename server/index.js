require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const AI_URL = process.env.AI_URL || "http://127.0.0.1:8000";

// ---------- Login check (middleware) ----------
// Put "auth" before a route to make it private.
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

app.get("/", (req, res) => res.json({ status: "Node server is running" }));

// ---------- Register ----------
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email and password are required" });
    }
    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const hash = await bcrypt.hash(password, 10);   // never store the real password
    const [result] = await db.query(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, hash]
    );
    res.status(201).json({ id: result.insertId, name, email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------- Login ----------
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(401).json({ error: "Wrong email or password" });

    const user = rows[0];
    const ok = await bcrypt.compare(password || "", user.password_hash);
    if (!ok) return res.status(401).json({ error: "Wrong email or password" });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------- Sites ----------
app.get("/api/sites", auth, async (req, res) => {
  const [rows] = await db.query("SELECT * FROM sites ORDER BY id");
  res.json(rows);
});

// ---------- Analyze a site (the main feature) ----------
app.post("/api/analyze/:siteId", auth, async (req, res) => {
  try {
    const [sites] = await db.query("SELECT * FROM sites WHERE id = ?", [req.params.siteId]);
    if (sites.length === 0) return res.status(404).json({ error: "Site not found" });
    const site = sites[0];

    // For now these come from the request. Later, photo detection fills them in.
    const body = req.body || {};
    const payload = {
      name: site.name,
      latitude: site.latitude,
      longitude: site.longitude,
      workers_total: site.workers_total || 1,
      workers_without_helmet: Math.min(
  Math.max(Number(body.workers_without_helmet) || 0, 0),
  site.workers_total || 1
),
      faulty_equipment: body.faulty_equipment || [],
      open_incidents: body.open_incidents || [],
    };

    // 1) Ask the Python AI service
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

    // 2) Save the analysis
    const [saved] = await db.query(
      "INSERT INTO analyses (site_id, score, level) VALUES (?, ?, ?)",
      [site.id, ai.score, ai.level]
    );
    const analysisId = saved.insertId;

    // 3) Save each hazard
    if (ai.hazards.length > 0) {
      const rows = ai.hazards.map((h) => [analysisId, h.category, h.severity, h.description, h.risk]);
      await db.query(
        "INSERT INTO hazards (analysis_id, category, severity, description, risk) VALUES ?",
        [rows]
      );
    }

    // 4) Create an alert for risky results (email comes in a later step)
    if (ai.level === "High" || ai.level === "Critical") {
      await db.query("INSERT INTO alerts (analysis_id, message) VALUES (?, ?)", [
        analysisId,
        `${ai.level} risk at ${site.name} (score ${ai.score})`,
      ]);
    }

    res.json({ analysisId, ...ai });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------- History of one site ----------
app.get("/api/sites/:siteId/history", auth, async (req, res) => {
  const [rows] = await db.query(
    "SELECT id, score, level, created_at FROM analyses WHERE site_id = ? ORDER BY created_at DESC LIMIT 20",
    [req.params.siteId]
  );
  res.json(rows);
});

// ---------- One analysis with its hazards ----------
app.get("/api/analyses/:id", auth, async (req, res) => {
  const [analysis] = await db.query("SELECT * FROM analyses WHERE id = ?", [req.params.id]);
  if (analysis.length === 0) return res.status(404).json({ error: "Not found" });
  const [hazards] = await db.query(
    "SELECT category, severity, description, risk FROM hazards WHERE analysis_id = ? ORDER BY risk DESC",
    [req.params.id]
  );
  res.json({ ...analysis[0], hazards });
});

// ---------- Alerts ----------
app.get("/api/alerts", auth, async (req, res) => {
  const [rows] = await db.query(
    "SELECT * FROM alerts ORDER BY created_at DESC LIMIT 50"
  );
  res.json(rows);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));