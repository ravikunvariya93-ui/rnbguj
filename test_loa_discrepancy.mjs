import mongoose from 'mongoose';

async function main() {
  await mongoose.connect('mongodb+srv://kunvariyaravi:kunvariyaravi41@cluster1.qnkfvpe.mongodb.net/?appName=Cluster1', { dbName: 'test' });
  const db = mongoose.connection.db;

  const packageId = new mongoose.Types.ObjectId("6a3645f3878472eea7a521ce");
  const loaId = new mongoose.Types.ObjectId("6a3649a0c7bc4865f3fa1fe5");

  const pkg = await db.collection('packages').findOne({ _id: packageId });
  console.log("Package:", pkg?._id);

  const loa = await db.collection('loas').findOne({ _id: loaId });
  console.log("LOA in question:", JSON.stringify(loa, null, 2));

  if (loa) {
    const tenderFromLoa = await db.collection('tenders').findOne({ _id: loa.tenderId });
    console.log("Tender from LOA:", tenderFromLoa ? tenderFromLoa._id : 'null', "packageId:", tenderFromLoa?.packageId);
  }

  const tendersForPackage = await db.collection('tenders').find({ packageId: packageId }).toArray();
  console.log("\nTenders for Package:", tendersForPackage.map(t => ({ id: t._id, cancelled: t.cancelled, trialNo: t.trialNo })));

  for (const t of tendersForPackage) {
    const loasForTender = await db.collection('loas').find({ tenderId: t._id }).toArray();
    console.log(`LOAs for Tender ${t._id}:`, loasForTender.map(l => l._id));
  }

  process.exit(0);
}
main().catch(console.error);
