'use strict';
const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER || 'beastcricketofficialauction@gmail.com';
const EMAIL_PASS = (process.env.EMAIL_PASS || 'gdgzafbzoyjmgrxx').replace(/\s/g, '');
const FRONTEND   = (process.env.FRONTEND_URL || 'http://localhost:3001').replace(/\/$/, '');

const transporter = nodemailer.createTransport({
  host:       'smtp.gmail.com',
  port:       587,
  secure:     false,
  requireTLS: true,
  auth:       { user: EMAIL_USER, pass: EMAIL_PASS },
  tls:        { rejectUnauthorized: false },
  connectionTimeout: 15000,
  greetingTimeout:   10000,
  socketTimeout:     15000,
});

async function verifyTransporter() {
  return new Promise((resolve) => {
    transporter.verify((err) => {
      if (err) {
        console.error('❌ SMTP verify failed:', err.message);
        resolve(false);
      } else {
        console.log('✅ SMTP ready (port 587) — from:', EMAIL_USER);
        resolve(true);
      }
    });
  });
}

verifyTransporter().catch(() => {});

async function sendVerificationEmail(to, name, verificationURL) {
  const link = (verificationURL || '').startsWith('http')
    ? verificationURL
    : `${FRONTEND}/verify-email?token=${verificationURL}`;

  console.log('📧 Sending verification email →', to);
  console.log('   Link:', link.slice(0, 80) + '...');

  await transporter.sendMail({
    from:    `"Beast Cricket Auction" <${EMAIL_USER}>`,
    to,
    subject: '🏏 Verify Your Beast Cricket Auction Account',
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<style>
body{margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif}
.wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)}
.hdr{background:linear-gradient(135deg,#0f172a,#1e293b);padding:40px 32px;text-align:center}
.hdr h1{margin:0 0 6px;color:#f59e0b;font-size:26px;letter-spacing:3px;text-transform:uppercase}
.hdr p{margin:0;color:#94a3b8;font-size:13px}
.body{padding:40px 36px}
.body h2{margin:0 0 14px;color:#111827;font-size:20px}
.body p{margin:0 0 14px;color:#374151;line-height:1.7;font-size:15px}
.btn-wrap{text-align:center;margin:28px 0}
.btn{display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000!important;text-decoration:none;padding:16px 44px;border-radius:10px;font-weight:800;font-size:15px}
.note{background:#fffbeb;border-left:4px solid #f59e0b;padding:14px 18px;border-radius:6px;margin:20px 0}
.note p{margin:0;color:#92400e;font-size:13px}
.link-box{background:#f9fafb;border-radius:8px;padding:14px 16px;margin:18px 0}
.link-box p{margin:0 0 6px;color:#6b7280;font-size:12px}
.link-box a{color:#d97706;font-size:11px;word-break:break-all}
.ftr{background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px;text-align:center;color:#9ca3af;font-size:12px}
</style></head><body>
<div class="wrap">
<div class="hdr"><h1>🏏 Beast Cricket Auction</h1><p>Complete Your Registration</p></div>
<div class="body">
<h2>Welcome, ${name || 'Player'}! 👋</h2>
<p>You're one step away. Click the button below to verify your email and activate your account.</p>
<div class="btn-wrap"><a href="${link}" class="btn">✅ Verify My Email</a></div>
<div class="note"><p>⏰ <strong>This link expires in 24 hours.</strong></p></div>
<div class="link-box"><p>Button not working? Copy this link:</p><a href="${link}">${link}</a></div>
<p style="color:#9ca3af;font-size:12px">If you didn't create this account, ignore this email.</p>
</div>
<div class="ftr"><strong style="color:#374151">Beast Cricket Auction</strong><br>${EMAIL_USER}<br>© ${new Date().getFullYear()} Beast Cricket Auction</div>
</div></body></html>`,
  });
  console.log('✅ Verification email sent →', to);
}

async function sendPasswordResetEmail(to, name, resetURL) {
  const link = (resetURL || '').startsWith('http')
    ? resetURL
    : `${FRONTEND}/reset-password?token=${resetURL}`;

  console.log('📧 Sending password reset email →', to);

  await transporter.sendMail({
    from:    `"Beast Cricket Auction" <${EMAIL_USER}>`,
    to,
    subject: '🔐 Reset Your Beast Cricket Auction Password',
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<style>
body{margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif}
.wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)}
.hdr{background:linear-gradient(135deg,#0f172a,#1e293b);padding:40px 32px;text-align:center}
.hdr h1{margin:0 0 6px;color:#ef4444;font-size:26px;letter-spacing:3px;text-transform:uppercase}
.hdr p{margin:0;color:#94a3b8;font-size:13px}
.body{padding:40px 36px}
.body h2{margin:0 0 14px;color:#111827;font-size:20px}
.body p{margin:0 0 14px;color:#374151;line-height:1.7;font-size:15px}
.btn-wrap{text-align:center;margin:28px 0}
.btn{display:inline-block;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff!important;text-decoration:none;padding:16px 44px;border-radius:10px;font-weight:800;font-size:15px}
.warn{background:#fef2f2;border-left:4px solid #ef4444;padding:14px 18px;border-radius:6px;margin:20px 0}
.warn p{margin:0;color:#991b1b;font-size:13px}
.link-box{background:#f9fafb;border-radius:8px;padding:14px 16px;margin:18px 0}
.link-box p{margin:0 0 6px;color:#6b7280;font-size:12px}
.link-box a{color:#dc2626;font-size:11px;word-break:break-all}
.ftr{background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px;text-align:center;color:#9ca3af;font-size:12px}
</style></head><body>
<div class="wrap">
<div class="hdr"><h1>🔐 Password Reset</h1><p>Beast Cricket Auction</p></div>
<div class="body">
<h2>Hi ${name || 'Player'},</h2>
<p>We received a request to reset the password for <strong>${to}</strong>.</p>
<div class="btn-wrap"><a href="${link}" class="btn">🔑 Reset My Password</a></div>
<div class="warn"><p>⏰ <strong>This link expires in 1 hour.</strong> If you didn't request this, ignore this email.</p></div>
<div class="link-box"><p>Button not working? Copy this link:</p><a href="${link}">${link}</a></div>
</div>
<div class="ftr"><strong style="color:#374151">Beast Cricket Auction</strong><br>${EMAIL_USER}<br>© ${new Date().getFullYear()} Beast Cricket Auction</div>
</div></body></html>`,
  });
  console.log('✅ Password reset email sent →', to);
}


async function sendAdminPurchaseNotification(opts) {
  const {
    adminEmail, userName, userEmail, packageName, packagePrice, paymentMethod, transactionId,
  } = opts;
  const to = adminEmail || process.env.ADMIN_EMAIL || 'hirishi2020@gmail.com';
  const subject = `🏏 New Purchase: ${userName} bought ${packageName} ₹${packagePrice}`;
  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0c1a2e;color:#fff;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(90deg,#f5b942,#ffe3a3);padding:16px 24px;">
        <h2 style="margin:0;color:#000;font-size:18px;">🏏 Beast Cricket — New Package Purchase</h2>
      </div>
      <div style="padding:24px;line-height:1.7;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#999;width:140px;">Customer</td><td style="color:#fff;font-weight:bold;">${userName}</td></tr>
          <tr><td style="padding:8px 0;color:#999;">Email</td><td style="color:#fff;">${userEmail}</td></tr>
          <tr><td style="padding:8px 0;color:#999;">Package</td><td style="color:#f5b942;font-weight:bold;">${packageName}</td></tr>
          <tr><td style="padding:8px 0;color:#999;">Amount</td><td style="color:#4ade80;font-size:20px;font-weight:bold;">₹${packagePrice}</td></tr>
          <tr><td style="padding:8px 0;color:#999;">Payment via</td><td style="color:#fff;">${paymentMethod}</td></tr>
          <tr><td style="padding:8px 0;color:#999;">Transaction ID</td><td style="color:#fff;font-family:monospace;">${transactionId || 'N/A'}</td></tr>
          <tr><td style="padding:8px 0;color:#999;">Time</td><td style="color:#fff;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td></tr>
        </table>
      </div>
    </div>
  `;
  try {
    await transporter.sendMail({ from: `"Beast Cricket Auction" <${EMAIL_USER}>`, to, subject, html });
    console.log(`✅ Admin purchase notification sent for ${packageName} by ${userEmail}`);
  } catch (err) {
    console.error('❌ Admin purchase notification email failed:', err.message);
  }
}

module.exports = { verifyTransporter, sendVerificationEmail, sendPasswordResetEmail, transporter, sendAdminPurchaseNotification };
