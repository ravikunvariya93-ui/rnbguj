import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IApproval extends Document {
    tenderId: mongoose.Schema.Types.ObjectId;
    proposalDate: Date;
    tenderApprovalOffice: string;
    tenderApprovalNo: string;
    tenderApprovalDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ApprovalSchema: Schema = new Schema({
    tenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender', required: true },
    proposalDate: { type: Date },
    tenderApprovalOffice: { type: String },
    tenderApprovalNo: { type: String },
    tenderApprovalDate: { type: Date },
}, {
    timestamps: true,
});

if (process.env.NODE_ENV !== 'production') delete mongoose.models.Approval;
const Approval: Model<IApproval> = mongoose.models.Approval || mongoose.model<IApproval>('Approval', ApprovalSchema);

export default Approval;
