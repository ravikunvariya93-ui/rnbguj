import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPackage extends Document {
    packageName: string;
    subDivision?: string;
    works: {
        workId: mongoose.Schema.Types.ObjectId;
        workName: string;
        amount: number; // Snapshot of amount
    }[];
    dtpConsultant?: string;
    createdAt: Date;
    updatedAt: Date;
}

const PackageSchema: Schema = new Schema({
    packageName: { type: String, required: true },
    subDivision: { type: String },
    works: [{
        workId: { type: mongoose.Schema.Types.ObjectId, ref: 'TechnicalSanction' },
        workName: { type: String },
        amount: { type: Number },
    }],
    dtpConsultant: { type: String },
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
