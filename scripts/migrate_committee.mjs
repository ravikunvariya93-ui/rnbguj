/**
 * migrate_committee.mjs
 * Bulk-updates the `committee` field on ALL packages based on:
 *   - The package's budgetHead
 *   - The latest non-cancelled tender's contractPrice for that package
 *
 * Rules:
 *   Bandhkam Committee → contractPrice < 2500000 AND budgetHead matches
 *     ['15th finance commission', '2515 cdp-5', 'dp own fund', 'ddo shri pravas grant', 'icds']
 *
 *   Karobari → contractPrice >= 2500000 AND budgetHead matches
 *     ['3054 s.r.', 'buj']
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('no MONGODB_URI'); process.exit(1); }

const PackageSchema = new mongoose.Schema({ packageName: String, budgetHead: String, committee: String }, { timestamps: true, strict: false });
const TenderSchema  = new mongoose.Schema({ packageId: mongoose.Schema.Types.ObjectId, contractPrice: Number, cancelled: { type: Boolean, default: false }, trialNo: { type: Number, default: 1 } }, { timestamps: true, strict: false });

const Package = mongoose.models.Package || mongoose.model('Package', PackageSchema);
const Tender  = mongoose.models.Tender  || mongoose.model('Tender',  TenderSchema);

const BANDHKAM_HEADS = ['15th finance commission','2515 cdp-5','dp own fund','ddo shri pravas grant','icds'];
const KAROBARI_HEADS = ['3054 s.r.','buj'];

function determineCommittee(budgetHead, contractPrice) {
    const bh = (budgetHead || '').toLowerCase();
    const cp = contractPrice || 0;
    const isBandhkam = cp < 2500000 && BANDHKAM_HEADS.some(k => bh.includes(k));
    const isKarobari = cp >= 2500000 && KAROBARI_HEADS.some(k => bh.includes(k));
    return isBandhkam ? 'Bandhkam Committee' : isKarobari ? 'Karobari' : '';
}

async function main() {
    console.log('Connecting...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const packages = await Package.find({}).lean();
    console.log('Packages found: ' + packages.length);

    let updated = 0, skipped = 0, notDet = 0;

    for (const pkg of packages) {
        const tender = await Tender.findOne({ packageId: pkg._id, cancelled: { '': true } }).sort({ trialNo: -1, createdAt: -1 }).lean();
        const cp = tender?.contractPrice || 0;
        const committee = determineCommittee(pkg.budgetHead, cp);

        if (committee) {
            const res = await Package.updateOne({ _id: pkg._id }, { '': { committee } });
            if (res.modifiedCount > 0) { updated++; console.log('UPDATED: ' + pkg.packageName + ' => ' + committee + ' (price=' + cp + ')'); }
            else { skipped++; console.log('SKIP(same): ' + pkg.packageName + ' => ' + committee); }
        } else {
            notDet++;
            console.log('NOT-DET: ' + pkg.packageName + ' | bh=' + (pkg.budgetHead||'-') + ' | price=' + cp);
        }
    }

    console.log('\n=== SUMMARY ===');
    console.log('Total: ' + packages.length + ' | Updated: ' + updated + ' | Skipped(same): ' + skipped + ' | NotDetermined: ' + notDet);
    await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
