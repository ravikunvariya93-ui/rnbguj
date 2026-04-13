import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITechnicalSanction extends Document {
    workName: string;
    dateSendingTS: Date; // Date of Sending TS for Approval
    tsAuthority: string; // TS Authority
    tsAmount: number; // Rs. In Lacks
    tsDate: Date;
    estimateConsultant: string; // Estimate Consultant
    createdAt: Date;
    updatedAt: Date;
}

const TechnicalSanctionSchema: Schema = new Schema({
    workName: { type: String, required: true },
    dateSendingTS: { type: Date },
    tsAuthority: { type: String },
    tsAmount: { type: Number },
    tsNumber: { type: String },
    tsDate: { type: Date },
    estimateConsultant: { type: String },
}, {
    timestamps: true,
});

// Avoid recompiling model in watch mode
const TechnicalSanction: Model<ITechnicalSanction> = mongoose.models.TechnicalSanction || mongoose.model<ITechnicalSanction>('TechnicalSanction', TechnicalSanctionSchema);

export default TechnicalSanction;
