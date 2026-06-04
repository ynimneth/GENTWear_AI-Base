const nodemailer = require('nodemailer');

const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS;

let transporter;

if (hasSmtpConfig) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: parseInt(process.env.SMTP_PORT, 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
} else {
  console.warn('Warning: SMTP credentials are not fully configured. Email service will run in log-only mode.');
}

exports.sendVerificationEmail = async (email, name, token) => {
  const appUrl = process.env.APP_URL || 'http://localhost:5000';
  const verifyUrl = `${appUrl}/auth/verify-email?token=${token}`;

  console.log('----------------------------------------------------');
  console.log(`[Email Service Sandbox] Sending verification email to ${email}`);
  console.log(`[Email Service Sandbox] Name: ${name}`);
  console.log(`[Email Service Sandbox] Verification URL: ${verifyUrl}`);
  console.log('----------------------------------------------------');

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"GENTWear" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verify your email address',
        html: `
          <h2>Hi ${name},</h2>
          <p>Thanks for registering! Click below to verify your email:</p>
          <a href="${verifyUrl}" style="padding:10px 20px;background:#4F46E5;color:white;border-radius:5px;text-decoration:none;display:inline-block;">
            Verify Email
          </a>
          <p>This link expires in 24 hours.</p>
          <p>If you didn't register, ignore this email.</p>
        `
      });
      console.log(`Email successfully sent to ${email}`);
    } catch (err) {
      console.error(`[Email Service Error] Failed to send email via SMTP: ${err.message}`);
    }
  }
};
