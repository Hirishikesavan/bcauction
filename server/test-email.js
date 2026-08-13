/**
 * Run this from the server folder:
 *   node test-email.js yourname@gmail.com
 *
 * It sends a real test email to confirm SMTP works.
 * If this works but register doesn't → the problem is in auth.js config.
 * If this fails → fix your Gmail App Password first.
 */
require('dotenv').config();
const nodemailer = require('nodemailer');

const TO   = process.argv[2] || process.env.EMAIL_USER;
const USER = process.env.EMAIL_USER || 'beastcricketofficialauction@gmail.com';
const PASS = (process.env.EMAIL_PASS || '').replace(/\s/g, '');

console.log('\n=== BEAST CRICKET EMAIL TEST ===');
console.log('FROM:', USER);
console.log('TO:  ', TO);
console.log('PASS length:', PASS.length, PASS.length === 16 ? '✅' : '❌ (should be 16)');
console.log('PASS value:', PASS);
console.log('================================\n');

if (PASS.length !== 16) {
  console.error('❌ Gmail App Password must be 16 characters (no spaces).');
  console.error('   Go to https://myaccount.google.com/apppasswords and generate a new one.');
  process.exit(1);
}

async function testEmail() {
  // Try port 587 first (more reliable), then 465
  const configs = [
    { port: 587, secure: false, requireTLS: true,  label: 'Port 587 STARTTLS' },
    { port: 465, secure: true,  requireTLS: false, label: 'Port 465 SSL'      },
  ];

  for (const cfg of configs) {
    console.log(`Testing ${cfg.label}...`);
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: cfg.port,
      secure: cfg.secure,
      requireTLS: cfg.requireTLS,
      auth: { user: USER, pass: PASS },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
    });

    const ok = await new Promise(resolve => {
      transporter.verify(err => {
        if (err) { console.log(`  ❌ ${err.message}`); resolve(false); }
        else     { console.log(`  ✅ Connected!`); resolve(true); }
      });
    });

    if (ok) {
      console.log('\nSending test email...');
      try {
        await transporter.sendMail({
          from:    `"Beast Cricket Auction" <${USER}>`,
          to:      TO,
          subject: '✅ Beast Cricket Auction — Email Test',
          html: `<div style="font-family:Arial;max-width:500px;margin:20px auto;padding:30px;border-radius:12px;background:#1a1a2e;color:#fff;">
            <h2 style="color:#f59e0b;margin-top:0">🏏 Beast Cricket Auction</h2>
            <p>This is a test email confirming your SMTP setup works correctly.</p>
            <p style="background:#f59e0b;color:#000;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:bold;">
              ✅ Email is working!
            </p>
            <p style="color:#888;font-size:13px;margin-top:20px;">
              Port: ${cfg.port} | From: ${USER}
            </p>
          </div>`,
        });
        console.log('\n✅ SUCCESS! Test email sent to:', TO);
        console.log('📬 Check your inbox (and spam folder).\n');
        console.log('=== WORKING CONFIG ===');
        console.log(`PORT=${cfg.port}`);
        console.log(`EMAIL_USER=${USER}`);
        console.log(`EMAIL_PASS=${PASS}`);
        console.log('======================\n');
      } catch (sendErr) {
        console.error('\n❌ SEND FAILED:', sendErr.message);
        if (sendErr.message.includes('Invalid login') || sendErr.message.includes('Username and Password')) {
          console.error('\n🔑 FIX: Your Gmail App Password is wrong or expired.');
          console.error('   Steps to fix:');
          console.error('   1. Go to https://myaccount.google.com/apppasswords');
          console.error('   2. Delete the old "Beast Cricket" app password');
          console.error('   3. Create a NEW one — select App: Mail, Device: Windows');
          console.error('   4. Copy the 16-char password (no spaces) into server/.env as EMAIL_PASS');
        }
      }
      return;
    }
  }

  console.error('\n❌ Both ports failed. Possible causes:');
  console.error('1. Firewall blocking outbound SMTP (port 465/587)');
  console.error('2. Gmail App Password wrong/expired');
  console.error('3. 2-Step Verification not enabled on Gmail account');
  console.error('\nFIX STEPS:');
  console.error('1. Enable 2FA: https://myaccount.google.com/security');
  console.error('2. Generate App Password: https://myaccount.google.com/apppasswords');
  console.error('3. Update EMAIL_PASS in server/.env (16 chars, no spaces)');
  console.error('4. Check Windows Firewall allows Node.js outbound on port 587');
}

testEmail().catch(console.error);