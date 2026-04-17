import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAgency extends Document {
    name: string;
    proprietorName?: string;
    address?: string;
    mobileNo?: string;
    agencyType?: string;
    createdAt: Date;
    updatedAt: Date;
}

const AgencySchema: Schema = new Schema({
    name: { type: String, required: true, unique: true },
    proprietorName: { type: String },
    address: { type: String },
    mobileNo: { type: String },
    agencyType: { type: String },
}, {
    timestamps: true,
});

// Avoid recompiling model in watch mode
if (process.env.NODE_ENV !== 'production') {
    if (mongoose.models.Agency) {
        delete mongoose.models.Agency;
    }
}

const Agency: Model<IAgency> = mongoose.models.Agency || mongoose.model<IAgency>('Agency', AgencySchema);

export default Agency;
