const { MongoClient } = require('mongodb');

async function setAdminRole() {
  const URI = 'mongodb://127.0.0.1:27017/beast-cricket-auction';
  const client = new MongoClient(URI);
  
  try {
    await client.connect();
    const db = client.db('beast-cricket-auction');
    
    const adminEmail = 'hirishidraj07@gmail.com';
    
    // Update the user in the Better Auth 'user' collection
    const result = await db.collection('user').updateOne(
      { email: adminEmail },
      { $set: { role: 'admin', isAdmin: true } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} user(s) in 'user' collection`);
    
    // Also update the legacy 'users' collection if it exists
    const legacyResult = await db.collection('users').updateOne(
      { email: adminEmail },
      { $set: { role: 'admin', isAdmin: true } }
    );
    
    console.log(`✅ Updated ${legacyResult.modifiedCount} user(s) in 'users' collection`);
    
    // Verify the update
    const user = await db.collection('user').findOne({ email: adminEmail });
    console.log('✅ User data:', { email: user.email, role: user.role, isAdmin: user.isAdmin });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

setAdminRole();
