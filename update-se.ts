import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('c:/rnbguj/rnbguj/.env.local') });

async function run() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to DB');
    
    const oldName = "Superintending Engineer (SE)";
    const newName = "The Superintending Engineer, Panchayat Road and Building Circle - 2, Rajkot.";

    const Approval = mongoose.connection.collection('approvals');
    const DTP = mongoose.connection.collection('dtps');
    const TS = mongoose.connection.collection('technicalsanctions');

    const appRes = await Approval.updateMany({ approvalAuthority: oldName }, { $set: { approvalAuthority: newName } });
    console.log(`Updated ${appRes.modifiedCount} Approvals`);

    const dtpRes = await DTP.updateMany({ dtpAuthority: oldName }, { $set: { dtpAuthority: newName } });
    console.log(`Updated ${dtpRes.modifiedCount} DTPs`);

    const tsRes = await TS.updateMany({ tsAuthority: oldName }, { $set: { tsAuthority: newName } });
    console.log(`Updated ${tsRes.modifiedCount} Technical Sanctions`);

    console.log('Done');
    process.exit(0);
}

run().catch(console.error);
