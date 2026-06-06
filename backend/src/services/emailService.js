const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

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
  console.warn('Warning: SMTP credentials are not fully configured. Email service will run in log-only mode for nodemailer.');
}

const sendgridApiKey = process.env.SENDGRID_API_KEY;
const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@gentwear.com';

if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
} else {
  console.warn('Warning: SENDGRID_API_KEY is not configured. SendGrid email service will run in log-only mode.');
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

exports.sendOrderConfirmationEmail = async (order) => {
  const user = order.User;
  const email = user ? user.email : 'customer@example.com';
  const name = user ? user.full_name : 'Valued Customer';
  
  const itemsListHtml = order.items.map(item => {
    const variantDesc = item.variant 
      ? `(${item.variant.size ? 'Size: ' + item.variant.size : ''} ${item.variant.color ? 'Color: ' + item.variant.color : ''})`
      : '';
    const itemTotal = (parseFloat(item.price) * item.quantity).toFixed(2);
    return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
          <strong>${item.Product ? item.Product.name : 'Unknown Product'}</strong><br/>
          <span style="font-size: 11px; color: #718096;">${variantDesc}</span>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${parseFloat(item.price).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${itemTotal}</td>
      </tr>
    `;
  }).join('');

  const shipping = order.shipping_address;
  const addressHtml = `
    <p><strong>${shipping.full_name}</strong></p>
    <p>${shipping.address_line1}${shipping.address_line2 ? ', ' + shipping.address_line2 : ''}</p>
    <p>${shipping.city}, ${shipping.state} ${shipping.postal_code}</p>
    <p>${shipping.country}</p>
    <p>Phone: ${shipping.phone_number}</p>
  `;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #2d3748;">
      <h2 style="text-align: center; color: #4F46E5; margin-bottom: 20px;">GENTWear Order Confirmation</h2>
      <p>Dear ${name},</p>
      <p>Thank you for shopping with GENTWear! We are excited to confirm that your payment was successful, and your order is now being processed.</p>
      
      <div style="background-color: #f7fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Order ID:</strong> #${order.id}</p>
        <p style="margin: 5px 0 0 0;"><strong>Payment Ref:</strong> ${order.payment_intent_id}</p>
        <p style="margin: 5px 0 0 0;"><strong>Total Paid:</strong> <span style="font-weight: bold; color: #4F46E5;">$${parseFloat(order.total).toFixed(2)}</span></p>
      </div>

      <h3 style="border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 30px;">Shipping Details</h3>
      <div style="line-height: 1.6; font-size: 14px; color: #4a5568;">
        ${addressHtml}
      </div>

      <h3 style="border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 30px;">Items Ordered</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: #edf2f7;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e0;">Item</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #cbd5e0;">Qty</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #cbd5e0;">Price</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #cbd5e0;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsListHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Subtotal:</td>
            <td style="padding: 10px; text-align: right; font-weight: bold;">$${parseFloat(order.total).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #a0aec0;">
        <p>If you have any questions, please contact our support team at support@gentwear.com.</p>
        <p>&copy; ${new Date().getFullYear()} GENTWear Menswear. All rights reserved.</p>
      </div>
    </div>
  `;

  console.log('----------------------------------------------------');
  console.log(`[SendGrid Email Sandbox] Sending order confirmation email to ${email}`);
  console.log(`[SendGrid Email Sandbox] Order ID: #${order.id}`);
  console.log(`[SendGrid Email Sandbox] Total: $${parseFloat(order.total).toFixed(2)}`);
  console.log('----------------------------------------------------');

  if (sendgridApiKey) {
    try {
      await sgMail.send({
        to: email,
        from: sendgridFromEmail,
        subject: `Order Confirmation - Order #${order.id} GENTWear`,
        html: htmlContent
      });
      console.log(`[SendGrid] Order confirmation email successfully sent to ${email}`);
    } catch (err) {
      console.error(`[SendGrid Error] Failed to send email: ${err.message}`);
      if (err.response) {
        console.error(err.response.body);
      }
    }
  } else {
    console.log(`[Email Log] SendGrid not configured. Logged HTML Content:\n${htmlContent}`);
  }
};
