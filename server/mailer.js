// SMTP is the standard way programs send email.
// If nodemailer is not installed or the settings are missing, the app still works and skips emails.
require("dotenv").config();

let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch (e) {
  console.log("nodemailer not installed: email alerts are switched off.");
}

const port = Number(process.env.SMTP_PORT) || 465;
const configured = nodemailer && process.env.SMTP_USER && process.env.SMTP_PASS;

const transporter = configured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

async function sendAlertEmail({ siteName, score, level, hazards, recommendations }) {
  if (!transporter) return { sent: false, reason: "SMTP not configured" };

  const hazardLines = hazards.map((h) => `- [${h.severity.toUpperCase()}] ${h.description}`).join("\n");
  const actionLines = recommendations.map((r) => `- ${r}`).join("\n");

  try {
    await transporter.sendMail({
      from: `"SiteSentinel" <${process.env.SMTP_USER}>`,
      to: process.env.ALERT_TO || process.env.SMTP_USER,
      subject: `[${level.toUpperCase()}] Risk alert for ${siteName} (score ${score}/100)`,
      text:
        `Site: ${siteName}\nRisk score: ${score}/100\nRisk level: ${level}\n\n` +
        `Hazards detected:\n${hazardLines}\n\nRecommended actions:\n${actionLines}\n`,
    });
    return { sent: true };
  } catch (e) {
    console.error("Email failed:", e.message);
    return { sent: false, reason: e.message };
  }
}

module.exports = { sendAlertEmail };
