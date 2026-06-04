const { MongoClient } = require('mongodb');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Error: MONGODB_URI environment variable is not set. Run with 'node --env-file=.env.local test-mongo.js'");
    process.exit(1);
  }
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('test');
    
    // Find the specific tender related to this package
    const pkg = await db.collection('packages').findOne({ packageName: { $regex: 'Suvidhapath.*P.06', $options: 'i' } });
    if(pkg) {
      console.log('Package ID is:', pkg._id);
      const t = await db.collection('tenders').findOne({ packageId: pkg._id });
      console.log("Tender:", JSON.stringify(t, null, 2));
    }

  } catch (e) {
      console.error(e);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
