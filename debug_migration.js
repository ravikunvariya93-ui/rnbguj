const mongoose = require('mongoose');

async function debugData() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("Error: MONGODB_URI environment variable is not set. Run with 'node --env-file=.env.local debug_migration.js'");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');
        
        const ApprovedWork = mongoose.model('ApprovedWork', new mongoose.Schema({}, { strict: false }));
        const TechnicalSanction = mongoose.model('TechnicalSanction', new mongoose.Schema({}, { strict: false }));
        const DTP = mongoose.model('DTP', new mongoose.Schema({}, { strict: false }));
        
        const fields = ['natureOfWork', 'budgetHead', 'mlaName', 'mpName', 'roadCategory', 'workType', 'schemeName', 'tsAuthority', 'dtpApprovingAuthority'];
        
        const results = {
            ApprovedWork: await ApprovedWork.find({ $or: fields.map(f => ({ [f]: 'Other' })) }).lean(),
            TechnicalSanction: await TechnicalSanction.find({ $or: fields.map(f => ({ [f]: 'Other' })) }).lean(),
            DTP: await DTP.find({ $or: fields.map(f => ({ [f]: 'Other' })) }).lean()
        };
        
        console.log(JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debugData();
