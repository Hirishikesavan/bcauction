require('dotenv').config();
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    
    const ADMIN_EMAILS = (process.env.ADMIN_EMAIL || 'hirishi2020@gmail.com').toLowerCase().split(',').map(e => e.trim());
    console.log('\n🔐 Admin Emails configured:', ADMIN_EMAILS);
    
    // Use direct MongoDB connection
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('beast-cricket-auction');
    
    console.log('\n📊 Checking admin accounts in database...\n');
    
    for (const email of ADMIN_EMAILS) {
      const user = await db.collection('user').findOne({ email: email.toLowerCase() });
      
      if (!user) {
        console.log(`❌ ${email} - NOT FOUND in database`);
        continue;
      }
      
      console.log(`\n═══════════════════════════════════════════════════════`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`🆔 ID: ${user.id}`);
      console.log(`👤 Role: ${user.role}`);
      console.log(`🛡️ isAdmin: ${user.isAdmin ? 'YES' : 'NO'}`);
      console.log(`📛 Name: ${user.name || 'N/A'}`);
      
      if (user.role !== 'admin' || !user.isAdmin) {
        console.log(`⚠️  ACTION REQUIRED: User is not set as admin`);
        
        // Fix the user role
        await db.collection('user').updateOne(
          { id: user.id },
          { $set: { role: 'admin', isAdmin: true } }
        );
        
        // Update Better Auth user
        try {
          const { getAuth } = require('./lib/auth');
          const auth = getAuth();
          await auth.api.updateUser({
            userId: user.id,
            updates: { role: 'admin', isAdmin: true }
          });
        } catch (sessionErr) {
          console.error('Failed to update Better Auth user:', sessionErr.message);
        }
        
        // Clear sessions
        try {
          await db.collection('session').deleteMany({ userId: user.id });
          console.log(`✅ Sessions cleared for ${email}`);
        } catch (sessionErr) {
          console.error('Failed to clear sessions:', sessionErr.message);
        }
        
        console.log(`✅ FIXED: ${email} is now admin`);
      } else {
        console.log(`✅ CORRECT: ${email} is properly configured as admin`);
      }
    }
    
    await client.close();
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Admin account verification completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
