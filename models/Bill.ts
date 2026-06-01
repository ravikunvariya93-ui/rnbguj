import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBillItem {
    itemNo: string;
    description: string;
    quantity: number;
    fullRate: number;
    partRate?: number;
    unit: string;
    uptoDateAmount: number;
    previousPaidAmount: number;
    toBePaidAmount: number;
}

export interface IBill extends Document {
    workOrderId: mongoose.Schema.Types.ObjectId;
    billType: 'Running' | 'Final';
    runningBillNumber?: number;
    billDate: Date;
    grossAmount: number;
    netPaidAmount?: number;
    passingDate?: Date;
    remarks?: string;
    items: IBillItem[];
    createdAt: Date;
    updatedAt: Date;
}

const BillItemSchema = new Schema({
    itemNo: { type: String, required: true },
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    fullRate: { type: Number, required: true },
    partRate: { type: Number },
    unit: { type: String, required: true },
    uptoDateAmount: { type: Number, required: true },
    previousPaidAmount: { type: Number, default: 0 },
    toBePaidAmount: { type: Number, required: true }
});

const BillSchema: Schema = new Schema({
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder', required: true },
    billType: { type: String, enum: ['Running', 'Final'], required: true },
    runningBillNumber: { 
        type: Number, 
        min: 1, 
        max: 50,
        required: true
    },
    billDate: { type: Date, required: true },
    grossAmount: { type: Number, required: true },
    netPaidAmount: { type: Number },
    passingDate: { type: Date },
    remarks: { type: String },
    items: [BillItemSchema]
}, {
    timestamps: true,
});

if (process.env.NODE_ENV !== 'production') delete mongoose.models.Bill;

const Bill: Model<IBill> = mongoose.models.Bill || mongoose.model<IBill>('Bill', BillSchema);

export default Bill;
