import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBillItem {
    itemNo: string;
    description: string;
    boqQuantity?: number;
    quantity: number;
    fullRate: number;
    partRate?: number;
    unit: string;
    uptoDateAmount: number;
    previousPaidAmount: number;
    toBePaidAmount: number;
    itemType?: 'Standard' | 'Extra';
}

export interface IBillWork {
    srNo: string;
    nameOfWork: string;
    amount: number;
}

export interface IMeasurementChecking {
    date: Date;
    itemNo: string;
    mbPageNo: string;
    quantity: number;
    rate: number;
    amount: number;
}

export interface IBill extends Document {
    workOrderId: mongoose.Schema.Types.ObjectId;
    billType: 'Running' | 'Final';
    runningBillNumber?: number;
    billDate: Date;
    grossAmount: number;
    netPaidAmount?: number;
    passingDate?: Date;
    actualCompletionDate?: Date;
    lastRecordEntryDate?: Date;
    mbNumber?: string;
    remarks?: string;
    labourCessApplicable: boolean;
    items: IBillItem[];
    works: IBillWork[];
    praisaBillNo?: string;
    praisaBillDate?: Date;
    voucherNo?: string;
    voucherDate?: Date;
    measurementChecking?: IMeasurementChecking[];

    // Audit Memo Fields
    auditMemoPreviouslyPaid?: number;
    dismantleCredit?: number;
    excessExtraAmount?: number;
    priceAdjustment?: number;
    priceAdjustmentType?: 'Payable' | 'Deductible';
    adminApprovalAmount?: number;
    withheldDeposit?: number;
    netPayableAmount?: number;

    incomeTax?: number;
    gst?: number;
    labourCess?: number;
    securityDeposit?: number;
    freeMaintenanceDeposit?: number;
    asphaltDeposit?: number;
    coreSampleDeposit?: number;
    tpi?: number;
    esmp?: number;
    timeLimitDeposit?: number;
    testingCharges?: number;
    otherDeposit?: number;
    totalDeduction?: number;

    createdAt: Date;
    updatedAt: Date;
}

const BillItemSchema = new Schema({
    itemNo: { type: String, required: true },
    description: { type: String, required: true },
    boqQuantity: { type: Number, default: 0 },
    quantity: { type: Number, required: true },
    fullRate: { type: Number, required: true },
    partRate: { type: Number },
    unit: { type: String, required: true },
    uptoDateAmount: { type: Number, required: true },
    previousPaidAmount: { type: Number, default: 0 },
    toBePaidAmount: { type: Number, required: true },
    itemType: { type: String, enum: ['Standard', 'Extra'], default: 'Standard' }
});

const BillWorkSchema = new Schema({
    srNo: { type: String, required: true },
    nameOfWork: { type: String, required: true },
    amount: { type: Number, required: true }
});

const MeasurementCheckingSchema = new Schema({
    date: { type: Date, required: true },
    itemNo: { type: String, required: true },
    mbPageNo: { type: String, required: true },
    quantity: { type: Number, required: true },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true }
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
    actualCompletionDate: { type: Date },
    lastRecordEntryDate: { type: Date },
    mbNumber: { type: String },
    remarks: { type: String },
    labourCessApplicable: { type: Boolean, default: false },
    items: [BillItemSchema],
    works: [BillWorkSchema],
    praisaBillNo: { type: String },
    praisaBillDate: { type: Date },
    voucherNo: { type: String },
    voucherDate: { type: Date },
    measurementChecking: [MeasurementCheckingSchema],

    // Audit Memo
    auditMemoPreviouslyPaid: { type: Number, default: 0 },
    dismantleCredit: { type: Number, default: 0 },
    excessExtraAmount: { type: Number, default: 0 },
    priceAdjustment: { type: Number, default: 0 },
    priceAdjustmentType: { type: String, enum: ['Payable', 'Deductible'], default: 'Payable' },
    adminApprovalAmount: { type: Number, default: 0 },
    withheldDeposit: { type: Number, default: 0 },
    netPayableAmount: { type: Number, default: 0 },

    incomeTax: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    labourCess: { type: Number, default: 0 },
    securityDeposit: { type: Number, default: 0 },
    freeMaintenanceDeposit: { type: Number, default: 0 },
    asphaltDeposit: { type: Number, default: 0 },
    coreSampleDeposit: { type: Number, default: 0 },
    tpi: { type: Number, default: 0 },
    esmp: { type: Number, default: 0 },
    timeLimitDeposit: { type: Number, default: 0 },
    testingCharges: { type: Number, default: 0 },
    otherDeposit: { type: Number, default: 0 },
    totalDeduction: { type: Number, default: 0 },
}, {
    timestamps: true,
});

BillSchema.index({ workOrderId: 1 });

if (process.env.NODE_ENV !== 'production') delete mongoose.models.Bill;

const Bill: Model<IBill> = mongoose.models.Bill || mongoose.model<IBill>('Bill', BillSchema);

export default Bill;
