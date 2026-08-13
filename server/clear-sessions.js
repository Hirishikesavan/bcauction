const { MongoClient } = require('mongodb');

async function clearUserSessions() {
  const URI = 'mongodb://127.0.0.1:27017/beast-cricket-auction';
  const client = new MongoClient(URI);
  
  try {
    await client.connect();
    const db = client.db('beast-cricket-auction');
    
    const adminEmail = 'hirishidraj07@gmail.com';
    
    // Find the user first
    const user = await db.collection('user').findOne({ email: adminEmail });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', { email: user.email, role: user.role, isAdmin: user.isAdmin });
    
    // Clear all sessions for this user
    const result = await db.collection('session').deleteMany({ userId: user.id });
    console.log(`✅ Cleared ${result.deletedCount} session(s) for user`);
    
    // Verify admin role is set
    await db.collection('user').updateOne(
      { email: adminEmail },
      { $set: { role: 'admin', isAdmin: true } }
    );
    
    const updatedUser = await db.collection('user').findOne({ email: adminEmail });
    console.log('✅ Updated user data:', { email: updatedUser.email, role: updatedUser.role, isAdmin: updatedUser.isAdmin });
    
    console.log('\n🔄 Please logout and login again to get fresh admin role');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

clearUserSessions();
