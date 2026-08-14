import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExcessProposal extends Document {
    packageId: mongoose.Types.ObjectId;
    workOrderId?: mongoose.Types.ObjectId;
    proposalNo?: string;
    proposalDate?: Date;
    pdfUrl?: string;
    fileName?: string;
    fileSize?: number;
    remarks?: string;
    status?: string;
    excessAmount?: number;
    savingAmount?: number;
    approvalNo?: string;
    approvalDate?: Date;
    approvalAuthority?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ExcessProposalSchema: Schema = new Schema({
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' },
    proposalNo: { type: String },
    proposalDate: { type: Date },
    pdfUrl: { type: String },
    fileName: { type: String },
    fileSize: { type: Number },
    remarks: { type: String },
    status: { type: String, enum: ['Draft', 'Submitted', 'Approved', 'Rejected'], default: 'Submitted' },
    excessAmount: { type: Number },
    savingAmount: { type: Number },
    approvalNo: { type: String },
    approvalDate: { type: Date },
    approvalAuthority: { type: String },
}, {
    timestamps: true,
});

ExcessProposalSchema.index({ packageId: 1 });
ExcessProposalSchema.index({ proposalNo: 1 });

if (process.env.NODE_ENV !== 'production') delete mongoose.models.ExcessProposal;
const ExcessProposal: Model<IExcessProposal> = mongoose.models.ExcessProposal || mongoose.model<IExcessProposal>('ExcessProposal', ExcessProposalSchema);

export default ExcessProposal;
