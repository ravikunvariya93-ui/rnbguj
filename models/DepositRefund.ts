import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDepositRefund extends Document {
    packageId: mongoose.Schema.Types.ObjectId;
    workOrderId?: mongoose.Schema.Types.ObjectId;
    refundType: string; // 'Additional SD' | 'Security Deposit' | 'Other'
    orderNo?: string;
    orderDate?: Date;
    applicationRef?: string;
    applicationDate?: Date;
    actualCompletionDate?: Date;
    bankName?: string;
    fdrNumber?: string;
    fdrDate?: Date;
    amount?: number;
    status: string; // 'Pending' | 'Order Generated' | 'Refunded'
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const DepositRefundSchema: Schema = new Schema({
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' },
    refundType: { type: String, default: 'Additional SD' },
    orderNo: { type: String },
    orderDate: { type: Date },
    applicationRef: { type: String },
    applicationDate: { type: Date },
    actualCompletionDate: { type: Date },
    bankName: { type: String },
    fdrNumber: { type: String },
    fdrDate: { type: Date },
    amount: { type: Number },
    status: { type: String, default: 'Pending' },
    remarks: { type: String },
}, {
    timestamps: true,
});

DepositRefundSchema.index({ packageId: 1, refundType: 1 });

if (process.env.NODE_ENV !== 'production') delete mongoose.models.DepositRefund;

const DepositRefund: Model<IDepositRefund> = mongoose.models.DepositRefund || mongoose.model<IDepositRefund>('DepositRefund', DepositRefundSchema);

export default DepositRefund;
