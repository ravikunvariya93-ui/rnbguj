import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITimeLimitProposal extends Document {
    packageId: mongoose.Types.ObjectId;
    workOrderId?: mongoose.Types.ObjectId;
    proposalNo?: string;
    proposalDate?: Date;
    pdfUrl?: string;
    fileName?: string;
    fileSize?: number;
    remarks?: string;
    status?: string;
    approvalNo?: string;
    approvalDate?: Date;
    approvalAuthority?: string;
    createdAt: Date;
    updatedAt: Date;
}

const TimeLimitProposalSchema: Schema = new Schema({
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' },
    proposalNo: { type: String },
    proposalDate: { type: Date },
    pdfUrl: { type: String },
    fileName: { type: String },
    fileSize: { type: Number },
    remarks: { type: String },
    status: { type: String, enum: ['Draft', 'Submitted', 'Approved', 'Rejected'], default: 'Submitted' },
    approvalNo: { type: String },
    approvalDate: { type: Date },
    approvalAuthority: { type: String },
}, {
    timestamps: true,
});

TimeLimitProposalSchema.index({ packageId: 1 });
TimeLimitProposalSchema.index({ proposalNo: 1 });

if (process.env.NODE_ENV !== 'production') delete mongoose.models.TimeLimitProposal;
const TimeLimitProposal: Model<ITimeLimitProposal> = mongoose.models.TimeLimitProposal || mongoose.model<ITimeLimitProposal>('TimeLimitProposal', TimeLimitProposalSchema);

export default TimeLimitProposal;
