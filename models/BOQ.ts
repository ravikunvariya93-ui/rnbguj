import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBOQItem {
    itemNo: string;
    description: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
    itemType?: 'Standard' | 'Extra';
}

export interface IBOQ extends Document {
    tenderId: mongoose.Schema.Types.ObjectId;
    items: IBOQItem[];
    totalAmount: number;
    createdAt: Date;
    updatedAt: Date;
}

const BOQSchema: Schema = new Schema({
    tenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender', required: true },
    items: [{
        itemNo: { type: String, required: true },
        description: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true },
        rate: { type: Number, required: true },
        amount: { type: Number, required: true },
        itemType: { type: String, enum: ['Standard', 'Extra'], default: 'Standard' },
    }],
    totalAmount: { type: Number, required: true },
}, {
    timestamps: true,
});

BOQSchema.index({ tenderId: 1 });

// Avoid recompiling model in watch mode
if (process.env.NODE_ENV !== 'production') {
    if (mongoose.models.BOQ) {
        delete mongoose.models.BOQ;
    }
}

const BOQ: Model<IBOQ> = mongoose.models.BOQ || mongoose.model<IBOQ>('BOQ', BOQSchema);

export default BOQ;
