import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITender extends Document {
    packageId: mongoose.Schema.Types.ObjectId;
    packageName: string;
    tenderId: string;
    tenderNoticeYear: string;
    noticeNo: string;
    srNo: string;
    taluka: string;
    trialNo: number;
    tenderCreationDate: Date;
    lastDateOfSubmission: Date;
    tenderOpeningDate: Date;
    tenderValidityDate: Date;
    estimatedAmount: number;
    reInvite: boolean;
    contractorName: string;
    contractPrice: number;
    aboveBelowPercentage: number;
    aboveBelowInWord: string;

    // Proposal & Approval
    proposalDate: Date;
    tenderApprovalOffice: string;
    tenderApprovalNo: string;
    tenderApprovalDate: Date;
    workDurationMonths: number;

    // Acceptance Letter
    acceptanceLetterWorksheetNo: string;
    acceptanceLetterDate: Date;

    // Agreement
    agreementYear: string;
    agreementNo: string;
    agreementDate: Date;

    // Security Deposit
    securityDepositType: string;
    securityDepositBankName: string;
    securityDepositNumber: string;
    securityDepositAmount: number;
    securityDepositDate: Date;

    // Additional Security Deposit
    additionalSecurityDepositType: string;
    additionalSecurityDepositBankName: string;
    additionalSecurityDepositNumber: string;
    additionalSecurityDepositAmount: number;
    additionalSecurityDepositDate: Date;

    // Work Order
    workOrderWorksheetNo: string;
    workOrderDate: Date;

    createdAt: Date;
    updatedAt: Date;
}

const TenderSchema: Schema = new Schema({
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
    packageName: { type: String },
    tenderId: { type: String },
    tenderNoticeYear: { type: String },
    noticeNo: { type: String },
    srNo: { type: String },
    taluka: { type: String },
    trialNo: { type: Number, default: 1 },
    tenderCreationDate: { type: Date },
    lastDateOfSubmission: { type: Date },
    tenderOpeningDate: { type: Date },
    tenderValidityDate: { type: Date },
    estimatedAmount: { type: Number },
    reInvite: { type: Boolean, default: false },
    contractorName: { type: String },
    contractPrice: { type: Number },
    aboveBelowPercentage: { type: Number },
    aboveBelowInWord: { type: String, enum: ['Above', 'Below', 'At Par'], default: 'Above' },

    // Proposal & Approval
    proposalDate: { type: Date },
    tenderApprovalOffice: { type: String },
    tenderApprovalNo: { type: String },
    tenderApprovalDate: { type: Date },
    workDurationMonths: { type: Number },

    // Acceptance Letter
    acceptanceLetterWorksheetNo: { type: String },
    acceptanceLetterDate: { type: Date },

    // Agreement
    agreementYear: { type: String },
    agreementNo: { type: String },
    agreementDate: { type: Date },

    // Security Deposit
    securityDepositType: { type: String },
    securityDepositBankName: { type: String },
    securityDepositNumber: { type: String },
    securityDepositAmount: { type: Number },
    securityDepositDate: { type: Date },

    // Additional Security Deposit
    additionalSecurityDepositType: { type: String },
    additionalSecurityDepositBankName: { type: String },
    additionalSecurityDepositNumber: { type: String },
    additionalSecurityDepositAmount: { type: Number },
    additionalSecurityDepositDate: { type: Date },

    // Work Order
    workOrderWorksheetNo: { type: String },
    workOrderDate: { type: Date },
    
    remarks: { type: String },
}, {
    timestamps: true,
});

// Avoid recompiling model in watch mode
if (process.env.NODE_ENV !== 'production') delete mongoose.models.Tender;
const Tender: Model<ITender> = mongoose.models.Tender || mongoose.model<ITender>('Tender', TenderSchema);

export default Tender;
