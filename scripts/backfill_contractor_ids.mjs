import mongoose from 'mongoose';
import fs from 'fs';

const MONGODB_URI = fs.readFileSync('.env.local', 'utf8').match(/MONGODB_URI=(.+)/)?.[1]?.trim();
if (!MONGODB_URI) { console.error('No MONGODB_URI'); process.exit(1); }

await mongoose.connect(MONGODB_URI);
const db = mongoose.connection.db;

// Build a name->id map from agencies
const agencies = await db.collection('agencies').find({}).toArray();
const nameToId = new Map(agencies.map(a => [a.name, a._id]));
console.log('Agencies loaded:', nameToId.size);

// Find tenders without contractorId
const tenders = await db.collection('tenders').find({ contractorId: null, contractorName: { $ne: null } }).toArray();
console.log('Tenders to update:', tenders.length);

let updated = 0;
let skipped = 0;
const bulkOps = [];

for (const t of tenders) {
    const agencyId = nameToId.get(t.contractorName);
    if (agencyId) {
        bulkOps.push({
            updateOne: { filter: { _id: t._id }, update: { $set: { contractorId: agencyId } } }
        });
        updated++;
    } else {
        skipped++;
    }
}

if (bulkOps.length > 0) {
    await db.collection('tenders').bulkWrite(bulkOps);
}
console.log('Updated:', updated, '| Skipped (no matching agency):', skipped);
await mongoose.disconnect();
