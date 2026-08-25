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
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    try {
        const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
        const match = envContent.match(/MONGODB_URI=(.*)/);
        if (match) MONGODB_URI = match[1].trim().replace(/^["']|["']$/g, '');
    } catch {}
}
if (!MONGODB_URI) { console.error('no MONGODB_URI'); process.exit(1); }

const PackageSchema = new mongoose.Schema({ packageName: String, budgetHead: String, committee: String }, { timestamps: true, strict: false });
const TenderSchema  = new mongoose.Schema({ packageId: mongoose.Schema.Types.ObjectId, contractPrice: Number, cancelled: { type: Boolean, default: false }, trialNo: { type: Number, default: 1 } }, { timestamps: true, strict: false });

const ApprovedWorkSchema = new mongoose.Schema({ workName: String, workType: String }, { timestamps: true, strict: false });

const Package = mongoose.models.Package || mongoose.model('Package', PackageSchema);
const Tender  = mongoose.models.Tender  || mongoose.model('Tender',  TenderSchema);
const ApprovedWork = mongoose.models.ApprovedWork || mongoose.model('ApprovedWork', ApprovedWorkSchema);

const BANDHKAM_HEADS = ['15th finance commission','2515 cdp-5','dp own fund','ddo shri pravas grant','icds','pending'];
const KAROBARI_HEADS = ['3054 s.r.','buj','pending'];

function determineCommittee(workType, budgetHead, contractPrice) {
    const isBuilding = (workType || '').trim().toLowerCase() === 'building';
    const cp = contractPrice || 0;
    if (isBuilding) {
        return cp >= 3000000 ? 'Karobari' : 'Bandhkam Committee';
    }
    const bh = (budgetHead || '').trim().toLowerCase();
    if (!bh) return '';
    const isBandhkam = cp < 3000000 && BANDHKAM_HEADS.some(k => bh.includes(k));
    const isKarobari = cp >= 3000000 && KAROBARI_HEADS.some(k => bh.includes(k));
    return isBandhkam ? 'Bandhkam Committee' : isKarobari ? 'Karobari' : 'Not Required';
}

async function main() {
    console.log('Connecting...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const [packages, approvedWorks] = await Promise.all([
        Package.find({}).lean(),
        ApprovedWork.find({}).select('workName workType').lean()
    ]);
    console.log('Packages found: ' + packages.length);

    const awMap = new Map();
    for (const aw of approvedWorks) {
        if (aw.workName) {
            awMap.set(aw.workName.trim().toLowerCase().replace(/\s+/g, ' '), aw.workType);
        }
    }

    let updated = 0, skipped = 0, notDet = 0;

    for (const pkg of packages) {
        const tender = await Tender.findOne({ packageId: pkg._id, cancelled: { $ne: true } }).sort({ trialNo: -1, createdAt: -1 }).lean();
        const cp = tender?.contractPrice || 0;
        
        let wt = pkg.workType;
        if (!wt && pkg.works && pkg.works.length > 0) {
            const firstWorkName = pkg.works[0]?.workName?.trim().toLowerCase().replace(/\s+/g, ' ');
            if (firstWorkName) wt = awMap.get(firstWorkName);
        }

        const committee = determineCommittee(wt, pkg.budgetHead, cp);

        if (committee) {
            const res = await Package.updateOne({ _id: pkg._id }, { $set: { committee } });
            if (res.modifiedCount > 0) { updated++; console.log('UPDATED: ' + pkg.packageName + ' => ' + committee + ' (wt=' + (wt||'-') + ', price=' + cp + ')'); }
            else { skipped++; }
        } else {
            notDet++;
            console.log('NOT-DET: ' + pkg.packageName + ' | wt=' + (wt||'-') + ' | bh=' + (pkg.budgetHead||'-') + ' | price=' + cp);
        }
    }

    console.log('\n=== SUMMARY ===');
    console.log('Total: ' + packages.length + ' | Updated: ' + updated + ' | Skipped(same): ' + skipped + ' | NotDetermined: ' + notDet);
    await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
