const mongoose = require('mongoose');

async function checkOther() {
    try {
        await mongoose.connect('mongodb+srv://kunvariyaravi:kunvariyaravi41@cluster1.qnkfvpe.mongodb.net/?appName=Cluster1'); 
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
