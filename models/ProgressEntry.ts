import mongoose, { Schema, Document, Model } from 'mongoose';

// Site-progress / inspection diary entry for one assigned work.
export interface IProgressPhoto {
    url: string;
    fileName: string;
    lat?: number;
    lng?: number;
    takenAt?: Date;
}

export interface IProgressEntry extends Document {
    packageId: mongoose.Schema.Types.ObjectId;
    workName: string;
    date: Date;
    physicalPercent: number;
    chainageFrom?: string;
    chainageTo?: string;
    remarks: string;
    authorName: string;
    authorRole: string;
    createdBy?: mongoose.Schema.Types.ObjectId;
    photos: IProgressPhoto[];
    createdAt: Date;
    updatedAt: Date;
}

const ProgressPhotoSchema: Schema = new Schema({
    url: { type: String, required: true },
    fileName: { type: String, default: '' },
    lat: { type: Number },
    lng: { type: Number },
    takenAt: { type: Date },
}, { _id: false });

const ProgressEntrySchema: Schema = new Schema({
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    workName: { type: String, required: true },
    date: { type: Date, required: true },
    physicalPercent: { type: Number, required: true, min: 0, max: 100 },
    chainageFrom: { type: String, default: '' },
    chainageTo: { type: String, default: '' },
    remarks: { type: String, default: '' },
    authorName: { type: String, required: true },
    authorRole: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    photos: { type: [ProgressPhotoSchema], default: [] },
}, {
    timestamps: true,
});

ProgressEntrySchema.index({ packageId: 1, date: -1 });
ProgressEntrySchema.index({ packageId: 1, workName: 1, date: -1 });

if (process.env.NODE_ENV !== 'production') {
    if (mongoose.models.ProgressEntry) {
        delete mongoose.models.ProgressEntry;
    }
}

const ProgressEntry: Model<IProgressEntry> =
    mongoose.models.ProgressEntry || mongoose.model<IProgressEntry>('ProgressEntry', ProgressEntrySchema);

export default ProgressEntry;
