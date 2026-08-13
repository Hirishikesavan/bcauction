const { MongoClient } = require('mongodb');

async function setupMultipleAdmins() {
  const URI = 'mongodb://127.0.0.1:27017/beast-cricket-auction';
  const client = new MongoClient(URI);
  
  try {
    await client.connect();
    const db = client.db('beast-cricket-auction');
    
    const adminEmails = ['hirishidraj07@gmail.com', 'hirishi2020@gmail.com'];
    
    for (const adminEmail of adminEmails) {
      console.log(`\n🔧 Processing admin: ${adminEmail}`);
      
      // Update the user in the Better Auth 'user' collection
      const result = await db.collection('user').updateOne(
        { email: adminEmail },
        { $set: { role: 'admin', isAdmin: true } },
        { upsert: true }
      );
      
      console.log(`✅ Updated ${result.modifiedCount + result.upsertedCount} user(s) in 'user' collection`);
      
      // Also update the legacy 'users' collection if it exists
      const legacyResult = await db.collection('users').updateOne(
        { email: adminEmail },
        { $set: { role: 'admin', isAdmin: true } },
        { upsert: true }
      );
      
      console.log(`✅ Updated ${legacyResult.modifiedCount + legacyResult.upsertedCount} user(s) in 'users' collection`);
      
      // Verify the update
      const user = await db.collection('user').findOne({ email: adminEmail });
      if (user) {
        console.log(`✅ User data:`, { email: user.email, role: user.role, isAdmin: user.isAdmin });
        
        // Clear all sessions for this user
        const sessionResult = await db.collection('session').deleteMany({ userId: user.id });
        console.log(`✅ Cleared ${sessionResult.deletedCount} session(s) for user`);
      } else {
        console.log(`⚠️ User not found in database: ${adminEmail}`);
      }
    }
    
    console.log('\n✅ Multi-admin setup complete');
    console.log('🔄 Please logout and login again to get fresh admin role');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

setupMultipleAdmins();
