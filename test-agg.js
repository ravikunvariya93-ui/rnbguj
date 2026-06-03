import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('c:/rnbguj/rnbguj/.env.local') });

async function run() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to DB');
    
    const Tender = mongoose.connection.collection('tenders');
    const Package = mongoose.connection.collection('packages');
    
    // First, let's just see how many records we have
    const tenderCount = await Tender.countDocuments();
    const pkgCount = await Package.countDocuments();
    console.log(`Tenders: ${tenderCount}, Packages: ${pkgCount}`);

    console.log('Done');
    process.exit(0);
}

run().catch(console.error);
