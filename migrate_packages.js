const mongoose = require('mongoose');

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("Error: MONGODB_URI environment variable is not set. Run with 'node --env-file=.env.local migrate_packages.js'");
        process.exit(1);
    }
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    // Define schemas
    const PackageSchema = new mongoose.Schema({
        packageName: String,
        subDivision: String,
        workType: String,
        works: Array
    });
    const Package = mongoose.models.Package || mongoose.model('Package', PackageSchema);

    const ApprovedWorkSchema = new mongoose.Schema({
        workName: String,
        subDivision: String,
        workType: String
    });
    const ApprovedWork = mongoose.models.ApprovedWork || mongoose.model('ApprovedWork', ApprovedWorkSchema);

    const [packages, approvedWorks] = await Promise.all([
        Package.find({}),
        ApprovedWork.find({})
    ]);
    
    console.log(`Found ${packages.length} packages and ${approvedWorks.length} approved works.`);

    const normalize = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

    const workMap = new Map();
    approvedWorks.forEach(aw => {
        if (aw.workName) {
            workMap.set(normalize(aw.workName), aw);
        }
    });

    let updatedCount = 0;
    for (const pkg of packages) {
        let changed = false;
        const firstWorkName = pkg.works && pkg.works[0] && pkg.works[0].workName;
        if (firstWorkName) {
            const aw = workMap.get(normalize(firstWorkName));
            if (aw) {
                if (!pkg.subDivision && aw.subDivision) {
                    pkg.subDivision = aw.subDivision;
                    changed = true;
                }
                if (!pkg.workType && aw.workType) {
                    pkg.workType = aw.workType;
                    changed = true;
                }
            }
        }

        if (changed) {
            await pkg.save();
            updatedCount++;
            console.log(`Updated package "${pkg.packageName}" -> SubDivision: "${pkg.subDivision}", WorkType: "${pkg.workType}"`);
        }
    }

    console.log(`Migration completed. Updated ${updatedCount} packages.`);
    await mongoose.disconnect();
}

run().catch(console.dir);
