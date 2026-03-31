import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import dbConnect from '@/lib/db';
import Tender from '@/models/Tender';
import Package from '@/models/Package';
import Approval from '@/models/Approval';
import LOA from '@/models/LOA';
import WorkOrder from '@/models/WorkOrder';

// Helper: Convert Excel serial date number to JS Date
function excelDateToJSDate(serial: any): Date | undefined {
    if (!serial) return undefined;
    const num = Number(serial);
    if (isNaN(num)) return undefined;
    // Excel epoch is 1900-01-01, but Excel has a leap year bug for 1900
    const utcDays = Math.floor(num - 25569);
    const utcValue = utcDays * 86400 * 1000;
    return new Date(utcValue);
}

export async function GET() {
    const filePath = path.join(process.cwd(), 'Tender details.xlsm');
    try {
        await dbConnect();

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ success: false, error: 'File "Tender details.xlsm" not found in project root' });
        }

        const fileBuffer = fs.readFileSync(filePath);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

        const sheetName = 'Tender';
        if (!workbook.Sheets[sheetName]) {
            return NextResponse.json({ success: false, error: 'Tender sheet not found in workbook' });
        }

        const sheet = workbook.Sheets[sheetName];
        const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        // Clear ALL existing data for clean import
        await Tender.deleteMany({});
        await Package.deleteMany({});
        await Approval.deleteMany({});
        await LOA.deleteMany({});
        await WorkOrder.deleteMany({});

        // ============================================================
        // STEP 1: Create unique Package records from packageName column
        // ============================================================
        const uniquePackageNames = new Set<string>();
        for (const row of rawData) {
            const pkgName = String(row['packageName'] || '').trim();
            if (pkgName) uniquePackageNames.add(pkgName);
        }

        // Build a map: packageName -> Package _id
        const packageMap = new Map<string, any>();
        const packageDocs = [];
        for (const name of uniquePackageNames) {
            packageDocs.push({
                packageName: name,
                works: [],
                estimatedAmount: 0,
            });
        }

        if (packageDocs.length > 0) {
            const insertedPackages = await Package.insertMany(packageDocs);
            for (const pkg of insertedPackages) {
                packageMap.set(pkg.packageName, pkg._id);
            }
        }

        // ============================================================
        // STEP 2: Create Tender records, linking to Package
        // ============================================================
        const tenderDocs = [];
        let tenderCount = 0;

        for (const row of rawData) {
            // Skip truly empty rows
            if (!row['tenderId'] && !row['packageName'] && !row['contractorName']) continue;

            const pkgName = String(row['packageName'] || '').trim();
            const packageId = packageMap.get(pkgName) || undefined;

            // Determine above/below word from percentage
            const abPerc = Number(row['aboveBelowPercentage'] || 0);
            let aboveBelowInWord = 'At Par';
            if (abPerc > 0) aboveBelowInWord = 'Above';
            if (abPerc < 0) aboveBelowInWord = 'Below';

            tenderDocs.push({
                packageId,
                packageName: pkgName,
                tenderId: String(row['tenderId'] || ''),
                tenderNoticeYear: String(row['tenderNoticeYear'] || ''),
                noticeNo: String(row['noticeNo'] || ''),
                srNo: String(row['srNo'] || ''),
                taluka: String(row['taluka'] || ''),
                tenderCreationDate: excelDateToJSDate(row['tenderCreationDate']),
                lastDateOfSubmission: excelDateToJSDate(row['lastDateOfSubmission']),
                tenderOpeningDate: excelDateToJSDate(row['tenderOpeningDate']),
                estimatedAmount: Number(row['estimatedAmount'] || 0),
                contractPrice: Number(row['contractPrice'] || 0),
                aboveBelowPercentage: Math.abs(abPerc),
                aboveBelowInWord,
                contractorName: String(row['contractorName'] || ''),

                // Proposal & Approval
                proposalDate: excelDateToJSDate(row['proposalDate']),
                tenderApprovalOffice: String(row['tenderApprovalOffice'] || ''),
                tenderApprovalNo: String(row['tenderApprovalNo'] || ''),
                tenderApprovalDate: excelDateToJSDate(row['tenderApprovalDate']),
                workDurationMonths: Number(row['workDurationMonths'] || 0) || undefined,

                // Acceptance Letter
                acceptanceLetterWorksheetNo: String(row['acceptanceLetterWorksheetNo'] || ''),
                acceptanceLetterDate: excelDateToJSDate(row['acceptanceLetterDate']),

                // Agreement
                agreementYear: String(row['agreementYear'] || ''),
                agreementNo: String(row['agreementNo'] || ''),
                agreementDate: excelDateToJSDate(row['agreementDate']),

                // Security Deposit
                securityDepositType: String(row['securityDepositType'] || ''),
                securityDepositBankName: String(row['securityDepositBankName'] || ''),
                securityDepositNumber: String(row['securityDepositNumber'] || ''),
                securityDepositAmount: Number(row['securityDepositAmount'] || 0) || undefined,
                securityDepositDate: excelDateToJSDate(row['securityDepositDate']),

                // Additional Security Deposit
                additionalSecurityDepositType: String(row['additionalSecurityDepositType'] || ''),
                additionalSecurityDepositBankName: String(row['additionalSecurityDepositBankName'] || ''),
                additionalSecurityDepositNumber: String(row['additionalSecurityDepositNumber'] || ''),
                additionalSecurityDepositAmount: Number(row['additionalSecurityDepositAmount'] || 0) || undefined,
                additionalSecurityDepositDate: excelDateToJSDate(row['additionalSecurityDepositDate']),

                // Work Order
                workOrderWorksheetNo: String(row['workOrderWorksheetNo'] || ''),
                workOrderDate: excelDateToJSDate(row['workOrderDate']),
            });
            tenderCount++;
        }

        let insertedTenders: any[] = [];
        if (tenderDocs.length > 0) {
            insertedTenders = await Tender.insertMany(tenderDocs);
        }

        // ============================================================
        // STEP 3: Update Package estimatedAmount (sum of tender estimates)
        // ============================================================
        console.log(`Updating estimatedAmount for ${packageMap.size} packages from ${insertedTenders.length} tenders...`);
        let updateCount = 0;
        for (const [pkgName, pkgId] of packageMap.entries()) {
            // Use exact name match as both are trimmed
            const relatedTenders = insertedTenders.filter(t => t.packageName === pkgName);
            const totalEstimated = relatedTenders.reduce((sum: number, t: any) => sum + (Number(t.estimatedAmount) || 0), 0);
            
            // LOG for first 5 packages
            if (updateCount < 5) {
                console.log(`DEBUG: Package "${pkgName}" has ${relatedTenders.length} tenders. Sum: ${totalEstimated}`);
            }

            await Package.findByIdAndUpdate(pkgId, { 
                $set: { estimatedAmount: totalEstimated } 
            });
            updateCount++;
        }
        console.log(`Finished updating ${updateCount} packages.`);

        // ============================================================
        // STEP 4: Create Approval records from tenders with approval data
        // ============================================================
        const approvalDocs = [];
        let approvalCount = 0;

        for (const tender of insertedTenders) {
            // Only create approval if there's at least some approval data
            if (tender.proposalDate || tender.tenderApprovalNo || tender.tenderApprovalDate) {
                approvalDocs.push({
                    tenderId: tender._id,
                    proposalDate: tender.proposalDate,
                    tenderApprovalOffice: tender.tenderApprovalOffice,
                    tenderApprovalNo: tender.tenderApprovalNo,
                    tenderApprovalDate: tender.tenderApprovalDate,
                });
                approvalCount++;
            }
        }

        if (approvalDocs.length > 0) {
            await Approval.insertMany(approvalDocs);
        }

        // ============================================================
        // STEP 5: Create LOA records from tenders with acceptance letter data
        // ============================================================
        const loaDocs = [];
        let loaCount = 0;

        for (const tender of insertedTenders) {
            if (tender.acceptanceLetterWorksheetNo || tender.acceptanceLetterDate) {
                loaDocs.push({
                    tenderId: tender._id,
                    acceptanceLetterWorksheetNo: tender.acceptanceLetterWorksheetNo,
                    acceptanceLetterDate: tender.acceptanceLetterDate,
                });
                loaCount++;
            }
        }

        let insertedLOAs: any[] = [];
        if (loaDocs.length > 0) {
            insertedLOAs = await LOA.insertMany(loaDocs);
        }

        // Build a map: tenderId -> LOA _id for linking WorkOrders
        const tenderToLoaMap = new Map<string, any>();
        for (const loa of insertedLOAs) {
            tenderToLoaMap.set(String(loa.tenderId), loa._id);
        }

        // ============================================================
        // STEP 6: Create WorkOrder records from tenders with work order data
        // ============================================================
        const workOrderDocs = [];
        let workOrderCount = 0;

        for (const tender of insertedTenders) {
            const loaId = tenderToLoaMap.get(String(tender._id));
            if (!loaId) continue; // No LOA means no work order

            if (tender.workOrderWorksheetNo || tender.workOrderDate || tender.agreementNo) {
                // Calculate stipulated completion date from work order date + work duration
                let stipulatedCompletionDate: Date | undefined;
                if (tender.workOrderDate && tender.workDurationMonths) {
                    const d = new Date(tender.workOrderDate);
                    d.setMonth(d.getMonth() + tender.workDurationMonths);
                    stipulatedCompletionDate = d;
                }

                workOrderDocs.push({
                    loaId,
                    agreementYear: tender.agreementYear,
                    agreementNo: tender.agreementNo,
                    agreementDate: tender.agreementDate,
                    securityDepositType: tender.securityDepositType,
                    securityDepositBankName: tender.securityDepositBankName,
                    securityDepositNumber: tender.securityDepositNumber,
                    securityDepositAmount: tender.securityDepositAmount,
                    securityDepositDate: tender.securityDepositDate,
                    additionalSecurityDepositType: tender.additionalSecurityDepositType,
                    additionalSecurityDepositBankName: tender.additionalSecurityDepositBankName,
                    additionalSecurityDepositNumber: tender.additionalSecurityDepositNumber,
                    additionalSecurityDepositAmount: tender.additionalSecurityDepositAmount,
                    additionalSecurityDepositDate: tender.additionalSecurityDepositDate,
                    workOrderWorksheetNo: tender.workOrderWorksheetNo,
                    workOrderDate: tender.workOrderDate,
                    timeLimitStartsFrom: tender.workOrderDate,
                    workDurationMonths: tender.workDurationMonths,
                    stipulatedCompletionDate,
                });
                workOrderCount++;
            }
        }

        if (workOrderDocs.length > 0) {
            await WorkOrder.insertMany(workOrderDocs);
        }

        return NextResponse.json({
            success: true,
            message: `Seeded from "Tender details.xlsm"`,
            counts: {
                packages: packageMap.size,
                tenders: tenderCount,
                approvals: approvalCount,
                loas: loaCount,
                workOrders: workOrderCount,
            }
        });
    } catch (error: any) {
        console.error('Error seeding data:', error);
        return NextResponse.json({ success: false, error: error.message, stack: error.stack });
    }
}
