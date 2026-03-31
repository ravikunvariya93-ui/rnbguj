import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPackage extends Document {
    packageName: string;
    works: {
        workId: mongoose.Schema.Types.ObjectId;
        workName: string;
        amount: number; // Snapshot of amount
    }[];
    estimatedAmount?: number;
    dtpSubmissionDate?: Date;
    dtpApprovalLetterNo?: string;
    dtpApprovalDate?: Date;
    approvalAuthority?: string;
    createdAt: Date;
    updatedAt: Date;
}

const PackageSchema: Schema = new Schema({
    packageName: { type: String, required: true },
    works: [{
        workId: { type: mongoose.Schema.Types.ObjectId, ref: 'TechnicalSanction' },
        workName: { type: String },
        amount: { type: Number },
    }],
    estimatedAmount: { type: Number },
    dtpAmount: { type: Number },
    dtpSubmissionDate: { type: Date },
    dtpApprovalLetterNo: { type: String },
    dtpApprovalDate: { type: Date },
    approvalAuthority: { type: String },
}, {
    timestamps: true,
});

// Avoid recompiling model in watch mode
if (process.env.NODE_ENV !== 'production') {
    if (mongoose.models.Package) {
        delete mongoose.models.Package;
    }
}

const Package: Model<IPackage> = mongoose.models.Package || mongoose.model<IPackage>('Package', PackageSchema);

export default Package;
