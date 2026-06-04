const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error("Error: MONGODB_URI environment variable is not set. Run with 'node --env-file=.env.local list_ids.js'");
    process.exit(1);
}
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        const database = client.db('test');
        const tenders = database.collection('tenders');

        const someTenders = await tenders.find().limit(5).toArray();
        console.log("--- IDS ---");
        someTenders.forEach(t => console.log(`${t.workName.substring(0, 30)}... : ${t._id}`));
    } finally {
        await client.close();
    }
}
run().catch(console.dir);
