import mongoose, { Schema, Document, Model } from 'mongoose';

// Verified village coordinates. Keyed by `${name}|${context}` (lowercased)
// so a corrected location is reused app-wide (maps, geocoding) forever.
export interface IVillage extends Document {
    key: string;
    name: string;
    context: string;
    lat: number;
    lng: number;
    address: string;
    source: 'google' | 'manual';
    createdAt: Date;
    updatedAt: Date;
}

const VillageSchema: Schema = new Schema({
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    context: { type: String, default: '' },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, default: '' },
    source: { type: String, enum: ['google', 'manual'], default: 'google' },
}, {
    timestamps: true,
});

VillageSchema.index({ name: 1 });

if (process.env.NODE_ENV !== 'production') {
    if (mongoose.models.Village) {
        delete mongoose.models.Village;
    }
}

const Village: Model<IVillage> = mongoose.models.Village || mongoose.model<IVillage>('Village', VillageSchema);

export default Village;
