import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWorkOrder extends Document {
    loaId: mongoose.Schema.Types.ObjectId;
    agreementYear: string;
    agreementNo: string;
    agreementDate: Date;
    securityDepositType: string;
    securityDepositBankName: string;
    securityDepositNumber: string;
    securityDepositAmount: number;
    securityDepositDate: Date;
    additionalSecurityDepositType: string;
    additionalSecurityDepositBankName: string;
    additionalSecurityDepositNumber: string;
    additionalSecurityDepositAmount: number;
    additionalSecurityDepositDate: Date;
    workOrderWorksheetNo: string;
    workOrderDate: Date;
    timeLimitStartsFrom: Date;
    workDurationMonths: number;
    stipulatedCompletionDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

const WorkOrderSchema: Schema = new Schema({
    loaId: { type: mongoose.Schema.Types.ObjectId, ref: 'LOA', required: true },
    agreementYear: { type: String },
    agreementNo: { type: String },
    agreementDate: { type: Date },
    securityDepositType: { type: String },
    securityDepositBankName: { type: String },
    securityDepositNumber: { type: String },
    securityDepositAmount: { type: Number },
    securityDepositDate: { type: Date },
    additionalSecurityDepositType: { type: String },
    additionalSecurityDepositBankName: { type: String },
    additionalSecurityDepositNumber: { type: String },
    additionalSecurityDepositAmount: { type: Number },
    additionalSecurityDepositDate: { type: Date },
    workOrderWorksheetNo: { type: String },
    workOrderDate: { type: Date },
    timeLimitStartsFrom: { type: Date },
    workDurationMonths: { type: Number },
    stipulatedCompletionDate: { type: Date },
}, {
    timestamps: true,
});

if (process.env.NODE_ENV !== 'production') delete mongoose.models.WorkOrder;

const WorkOrder: Model<IWorkOrder> = mongoose.models.WorkOrder || mongoose.model<IWorkOrder>('WorkOrder', WorkOrderSchema);

export default WorkOrder;
