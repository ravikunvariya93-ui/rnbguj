const mongoose = require('mongoose');
const uri = "mongodb+srv://kunvariyaravi:kunvariyaravi41@cluster1.qnkfvpe.mongodb.net/test?appName=Cluster1";

async function run() {
  await mongoose.connect(uri);
  
  const PackageSchema = new mongoose.Schema({
    packageName: String,
    works: Array
  });
  const Package = mongoose.models.Package || mongoose.model('Package', PackageSchema);

  const TenderSchema = new mongoose.Schema({
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
    packageName: String
  });
  const Tender = mongoose.models.Tender || mongoose.model('Tender', TenderSchema);

  const LOASchema = new mongoose.Schema({
    tenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender' }
  });
  const LOA = mongoose.models.LOA || mongoose.model('LOA', LOASchema);

  const WorkOrderSchema = new mongoose.Schema({
    loaId: { type: mongoose.Schema.Types.ObjectId, ref: 'LOA' }
  });
  const WorkOrder = mongoose.models.WorkOrder || mongoose.model('WorkOrder', WorkOrderSchema);

  const wos = await WorkOrder.find().populate({
    path: 'loaId',
    populate: {
      path: 'tenderId',
      populate: { path: 'packageId' }
    }
  });

  const wo = wos.find(w => w.loaId && w.loaId.tenderId && w.loaId.tenderId.packageName && w.loaId.tenderId.packageName.includes('P.06'));
  console.log(JSON.stringify(wo, null, 2));

  mongoose.disconnect();
}
run().catch(console.dir);
