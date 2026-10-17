require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail(toEmail, subject, text, html) {
  const info = await transporter.sendMail({
    from: {
      name: "Serv",
      address: process.env.SMTP_USER,
    },
    to: toEmail,
    subject,
    text,
    html,
  });

  return info;
}

module.exports = sendEmail;