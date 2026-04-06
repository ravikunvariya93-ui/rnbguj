import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDTP extends Document {
    tsId: mongoose.Schema.Types.ObjectId;
    dtpSendingNo: string;
    dtpSendingDate: Date;
    dtpApprovingAuthority: string;
    dtpApprovalNo: string;
    dtpApprovalDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

const DTPSchema: Schema = new Schema({
    tsId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    dtpSendingNo: { type: String },
    dtpSendingDate: { type: Date },
    dtpApprovingAuthority: { type: String },
    dtpApprovalNo: { type: String },
    dtpApprovalDate: { type: Date },
}, {
    timestamps: true,
});

if (process.env.NODE_ENV !== 'production') delete mongoose.models.DTP;
const DTP: Model<IDTP> = mongoose.models.DTP || mongoose.model<IDTP>('DTP', DTPSchema);

export default DTP;
