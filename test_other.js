const mongoose = require('mongoose');

async function checkOther() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("Error: MONGODB_URI environment variable is not set. Run with 'node --env-file=.env.local test_other.js'");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const ApprovedWork = mongoose.model('ApprovedWork', new mongoose.Schema({}, { strict: false }));
        
        const otherWorks = await ApprovedWork.find({ natureOfWork: 'Other' }).lean();
        console.log(`Found ${otherWorks.length} works with natureOfWork: 'Other'`);
        
        otherWorks.forEach(w => {
            console.log(`- ${w.workName} (Nature: ${w.natureOfWork})`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkOther();
