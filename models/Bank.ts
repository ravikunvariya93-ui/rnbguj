import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBank extends Document {
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

const BankSchema: Schema = new Schema({
    name: { type: String, required: true, unique: true, trim: true },
}, {
    timestamps: true,
});

// Avoid recompiling model in watch mode
if (process.env.NODE_ENV !== 'production') {
    if (mongoose.models.Bank) {
        delete mongoose.models.Bank;
    }
}

const Bank: Model<IBank> = mongoose.models.Bank || mongoose.model<IBank>('Bank', BankSchema);

export default Bank;
