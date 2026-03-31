import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITender extends Document {
    packageId: mongoose.Schema.Types.ObjectId;
    packageName: string;
    tenderId: string;
    tenderNoticeYear: string;
    noticeNo: string;
    srNo: string;
    trialNo: number;
    tenderCreationDate: Date;
    lastDateOfSubmission: Date;
    tenderOpeningDate: Date;
    tenderValidityDate: Date;
    reInvite: boolean;
    contractorName: string;
    contractPrice: number;
    aboveBelowPercentage: number;
    aboveBelowInWord: string; // "Above" or "Below"
    createdAt: Date;
    updatedAt: Date;
}

const TenderSchema: Schema = new Schema({
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    packageName: { type: String },
    tenderId: { type: String, required: true },
    tenderNoticeYear: { type: String },
    noticeNo: { type: String },
    srNo: { type: String },
    trialNo: { type: Number, default: 1 },
    tenderCreationDate: { type: Date },
    lastDateOfSubmission: { type: Date },
    tenderOpeningDate: { type: Date },
    tenderValidityDate: { type: Date },
    reInvite: { type: Boolean, default: false },
    contractorName: { type: String },
    contractPrice: { type: Number },
    aboveBelowPercentage: { type: Number },
    aboveBelowInWord: { type: String, enum: ['Above', 'Below', 'At Par'], default: 'Above' },
}, {
    timestamps: true,
});

// Avoid recompiling model in watch mode
// Avoid recompiling model in watch mode
if (process.env.NODE_ENV !== 'production') delete mongoose.models.Tender;
const Tender: Model<ITender> = mongoose.models.Tender || mongoose.model<ITender>('Tender', TenderSchema);

export default Tender;
