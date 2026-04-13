const mongoose = require('mongoose');

async function migrate() {
    try {
        await mongoose.connect('mongodb+srv://kunvariyaravi:kunvariyaravi41@cluster1.qnkfvpe.mongodb.net/?appName=Cluster1');
        console.log('Connected to MongoDB');
        
        const ApprovedWork = mongoose.model('ApprovedWork', new mongoose.Schema({}, { strict: false }));
        const TechnicalSanction = mongoose.model('TechnicalSanction', new mongoose.Schema({}, { strict: false }));
        const DTP = mongoose.model('DTP', new mongoose.Schema({}, { strict: false }));
        
        const collections = [
            { model: ApprovedWork, name: 'ApprovedWork' },
            { model: TechnicalSanction, name: 'TechnicalSanction' },
            { model: DTP, name: 'DTP' }
        ];
        
        const fields = ['natureOfWork', 'budgetHead', 'mlaName', 'mpName', 'roadCategory', 'workType', 'schemeName', 'tsAuthority', 'dtpApprovingAuthority'];

        for (const col of collections) {
            console.log(`Checking ${col.name}...`);
            
            // 1. Specific natureOfWork migrations for ApprovedWork
            if (col.name === 'ApprovedWork') {
                const roadResult = await col.model.updateMany(
                    { workName: /Road/i, natureOfWork: 'Other' },
                    { $set: { natureOfWork: 'Resurfacing' } }
                );
                console.log(`- Updated ${roadResult.modifiedCount} Road works to Resurfacing`);
                
                const structureResult = await col.model.updateMany(
                    { workName: /Drain|Causeway|Bridge|Box Cell/i, natureOfWork: 'Other' },
                    { $set: { natureOfWork: 'CWB' } }
                );
                console.log(`- Updated ${structureResult.modifiedCount} Structure works to CWB`);
            }
            
            // 2. Generic "Other" to "Unclassified" migration for all fields
            for (const field of fields) {
                const result = await col.model.updateMany(
                    { [field]: 'Other' },
                    { $set: { [field]: 'Unclassified' } }
                );
                if (result.modifiedCount > 0) {
                    console.log(`- ${col.name}: Migrated ${result.modifiedCount} records of field '${field}' from 'Other' to 'Unclassified'`);
                }
            }
        }
        
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
