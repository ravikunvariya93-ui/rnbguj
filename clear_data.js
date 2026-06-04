const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error("Error: MONGODB_URI environment variable is not set. Run with 'node --env-file=.env.local clear_data.js'");
    process.exit(1);
}
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        const database = client.db('test');
        const tenders = database.collection('tenders');

        const result = await tenders.deleteMany({});
        console.log(`Deleted ${result.deletedCount} documents`);
    } finally {
        await client.close();
    }
}
run().catch(console.dir);
