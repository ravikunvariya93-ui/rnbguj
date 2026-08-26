import mongoose from 'mongoose';
import { transliteratePackageNameToGujarati } from '../lib/transliterateGujarati.ts';

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("Error: MONGODB_URI is not set. Run with --env-file=.env.local");
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log("Connected to MongoDB database.");

    const PackageSchema = new mongoose.Schema({
        packageName: String,
        packageNameGujarati: String,
    }, { strict: false });

    const Package = mongoose.models.Package || mongoose.model('Package', PackageSchema);

    const packages = await Package.find({});
    console.log(`Found ${packages.length} total packages in the database.`);

    let updatedCount = 0;

    for (const pkg of packages) {
        if (!pkg.packageName) continue;
        const converted = transliteratePackageNameToGujarati(pkg.packageName);
        
        console.log(`\n[${updatedCount + 1}/${packages.length}]`);
        console.log(`  EN: ${pkg.packageName}`);
        console.log(`  GU: ${converted}`);

        pkg.packageNameGujarati = converted;
        await pkg.save();
        updatedCount++;
    }

    console.log(`\n✅ Successfully updated ${updatedCount} packages with Gujarati transliterated names!`);
    await mongoose.disconnect();
}

run().catch(err => {
    console.error("Migration error:", err);
    process.exit(1);
});
