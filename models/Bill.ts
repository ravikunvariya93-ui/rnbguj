import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBill extends Document {
    workOrderId: mongoose.Schema.Types.ObjectId;
    billType: 'Running' | 'Final';
    runningBillNumber?: number;
    billDate: Date;
    grossAmount: number;
    netPaidAmount: number;
    passingDate?: Date;
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const BillSchema: Schema = new Schema({
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder', required: true },
    billType: { type: String, enum: ['Running', 'Final'], required: true },
    runningBillNumber: { 
        type: Number, 
        min: 1, 
        max: 15,
        required: function(this: any) { return this.billType === 'Running'; }
    },
    billDate: { type: Date, required: true },
    grossAmount: { type: Number, required: true },
    netPaidAmount: { type: Number, required: true },
    passingDate: { type: Date },
    remarks: { type: String },
}, {
    timestamps: true,
});

if (process.env.NODE_ENV !== 'production') delete mongoose.models.Bill;

const Bill: Model<IBill> = mongoose.models.Bill || mongoose.model<IBill>('Bill', BillSchema);

export default Bill;
