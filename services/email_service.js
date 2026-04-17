const nodemailer = require("nodemailer");

let transporter = null;

const getMissingEmailConfigKeys = () => {
  const requiredKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
  return requiredKeys.filter((key) => !process.env[key]);
};

const isEmailConfigured = () => getMissingEmailConfigKeys().length === 0;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SECURE,
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) {
    return { sent: false, reason: "missing-recipient" };
  }

  const smtpPass = process.env.SMTP_PASS || "";
  if (smtpPass.includes("REPLACE_WITH_GMAIL_APP_PASSWORD")) {
    return {
      sent: false,
      reason: "smtp-placeholder-password",
    };
  }

  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    console.warn("[mail] SMTP configuration missing. Email not sent.");
    return {
      sent: false,
      reason: "smtp-not-configured",
      missingKeys: getMissingEmailConfigKeys(),
    };
  }

  try {
    await activeTransporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });

    return { sent: true };
  } catch (error) {
    console.error("[mail] Failed to send email:", error.message);
    return { sent: false, reason: "smtp-send-failed", error: error.message };
  }
};

module.exports = { sendEmail, isEmailConfigured, getMissingEmailConfigKeys };
