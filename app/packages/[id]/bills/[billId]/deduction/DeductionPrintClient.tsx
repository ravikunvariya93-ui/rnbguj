'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DeductionPrintClientProps {
    packageData: any;
    tender: any;
    loa: any;
    workOrder: any;
    agency: any;
    bill: any;
    allBills?: any[];
}

function formatDateDMY(d: Date | string | null | undefined): string {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '-';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
    if (n == null || isNaN(n)) return '0.00';
    return Number(n).toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function fmtInt(n: number | null | undefined): string {
    if (n == null || isNaN(n)) return '0';
    return Math.round(Number(n)).toLocaleString('en-IN');
}

function numToWords(n: number): string {
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function convert(num: number): string {
        if (num === 0) return '';
        if (num < 20) return a[num] + ' ';
        if (num < 100) return b[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + a[num % 10] : '') + ' ';
        if (num < 1000) return convert(Math.floor(num / 100)) + 'Hundred ' + (num % 100 !== 0 ? convert(num % 100) : '');
        if (num < 100000) return convert(Math.floor(num / 1000)) + 'Thousand ' + (num % 1000 !== 0 ? convert(num % 1000) : '');
        if (num < 10000000) return convert(Math.floor(num / 100000)) + 'Lakh ' + (num % 100000 !== 0 ? convert(num % 100000) : '');
        return convert(Math.floor(num / 10000000)) + 'Crore ' + (num % 10000000 !== 0 ? convert(num % 10000000) : '');
    }
    const val = Math.floor(n);
    if (val === 0) return 'Zero Rupees Only';
    return convert(val).trim() + ' Rupees Only';
}

interface Cell {
    s?: number;
    rs?: number;
    t: React.ReactNode;
    c?: string;
}

export default function DeductionPrintClient({
    packageData,
    tender,
    loa,
    workOrder,
    agency,
    bill,
    allBills = []
}: DeductionPrintClientProps) {
    const printRef = useRef<HTMLDivElement>(null);

    const packageId = packageData?._id || '';
    const workName = packageData?.packageName || tender?.packageName || '-';
    const contractorName = tender?.contractorName || agency?.name || '-';

    const billNum = bill?.runningBillNumber || 1;
    const billSuffix = billNum === 1 ? 'st' : billNum === 2 ? 'nd' : billNum === 3 ? 'rd' : 'th';
    const billLabel = `${billNum}${billSuffix} ${bill?.billType || 'Running'} Bill`;
    const billDate = formatDateDMY(bill?.billDate);

    // Financial Figures
    const grossBillAmount = Number(bill?.grossAmount || 0);
    const dismantleCredit = Number(bill?.dismantleCredit || 0);
    const auditMemoPreviouslyPaid = Number(bill?.auditMemoPreviouslyPaid || 0);
    const excessExtraAmount = Number(bill?.excessExtraAmount || 0);
    const priceAdjustment = Number(bill?.priceAdjustment || 0);
    const priceAdjustmentType = (bill?.priceAdjustmentType as string) || 'Payable';
    const adminApprovalAmount = Number(bill?.adminApprovalAmount || 0);
    const withheldAmount = Number(bill?.withheldDeposit || 0);

    // Previous Bills
    const prevBills = allBills.filter((b: any) => (b.runningBillNumber || 0) < billNum);
    const prevGross = prevBills.reduce((acc: number, b: any) => acc + (Number(b.grossAmount) || 0), 0);
    const prevWithheld = prevBills.reduce((acc: number, b: any) => acc + (Number(b.withheldDeposit) || 0), 0);
    const uptoDateGross = prevGross + grossBillAmount;

    // Net Payable Passing Amount
    const netPayableAmount = bill?.netPayableAmount != null && Number(bill.netPayableAmount) > 0
        ? Number(bill.netPayableAmount)
        : (grossBillAmount - dismantleCredit - auditMemoPreviouslyPaid);
    const passingBaseAmount = netPayableAmount > 0 ? netPayableAmount : grossBillAmount;

    // Deductions
    const itAmount = Number(bill?.incomeTax || 0);
    const gstTdsAmount = Number(bill?.gst || 0);
    const lcAmount = Number(bill?.labourCess || 0);
    const sdAmount = Number(bill?.securityDeposit || 0);
    const fmdAmount = Number(bill?.freeMaintenanceDeposit || 0);
    const asphaltDeposit = Number(bill?.asphaltDeposit || 0);
    const coreSampleDeposit = Number(bill?.coreSampleDeposit || 0);
    const tpiAmount = Number(bill?.tpi || 0);
    const esmpAmount = Number(bill?.esmp || 0);
    const tldAmount = Number(bill?.timeLimitDeposit || 0);
    const testingCharges = Number(bill?.testingCharges || 0);
    const otherDeposit = Number(bill?.otherDeposit || 0);
    const otherDeposit2 = Number(bill?.otherDeposit2 || 0);

    const computedTotalDeduction = itAmount + gstTdsAmount + lcAmount + sdAmount + fmdAmount
        + asphaltDeposit + coreSampleDeposit + tpiAmount + esmpAmount + tldAmount
        + withheldAmount + testingCharges + otherDeposit + otherDeposit2;
    const totalDeduction = bill?.totalDeduction != null && Number(bill.totalDeduction) > 0
        ? Number(bill.totalDeduction)
        : computedTotalDeduction;

    const chequeAmount = passingBaseAmount - totalDeduction;

    // Memorandum Items
    const totalWithheld = prevWithheld + withheldAmount;
    const balanceUptoDate = uptoDateGross - totalWithheld;
    const previouslyPaidAmount = auditMemoPreviouslyPaid > 0 ? auditMemoPreviouslyPaid : prevGross;
    const recoveryThisWork = dismantleCredit;
    const recoveryOtherWork = 0;
    const byChequeFinal = chequeAmount;
    const total2b5c = withheldAmount + byChequeFinal;

    const handlePrint = () => { window.print(); };

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();

        const sheetData: any[][] = [
            [`Bill No.:`, '', '', '', '', '', '', '', '', '', '', '', 'III Memorandum Of Payments'],
            ['1. Total value of work done as per account. I. Column 5. entry (A)', '', '', '', '', '', '', '', '', 'Rs.', fmtInt(uptoDateGross), '', 'Ps.'],
            ['2. Deduct amount witheld'],
            [`Previously Paid Amount\t\t\t\t\t\t\t\t${fmtInt(auditMemoPreviouslyPaid)}`],
            [`Amount of Dismantle Credit\t\t\t\t\t\t\t\t${fmtInt(dismantleCredit)}`],
            [`Excess / Extra Items\t\t\t\t\t\t\t\t${fmtInt(excessExtraAmount)}`],
            [`Price Adjustment\t\t\t\t\t\t\t\t${priceAdjustmentType}\t\t${fmtInt(priceAdjustment)}`],
            [`Administrative Approval\t\t\t\t\t\t\t\t${fmtInt(adminApprovalAmount)}`],
            [`Withheld Deposit\t\t\t\t\t\t\t\t${fmtInt(withheldAmount)}`],
            [`Net Payable Amount:\t\t\t\t\t\t\t\t${fmtInt(netPayableAmount)}`],
            ['Figures for', '', '', '', '', '(a) From previous Bill as per last Running Account Bill', '', '', fmtInt(prevWithheld), '', 'Rs.', 'Ps.'],
            ['works Abstract'],
            ['Rs.', '', 'P.', '', '', '(b) From this Bill', '', '', fmtInt(withheldAmount), ''],
            ['Deduction'],
['', '', '', `- ${fmtInt(itAmount)}`, 'Income Tax', '3. Balnce i.e. "up-to date" Payment', '', '', fmtInt(balanceUptoDate), '', '(Itemes 1-2 (k))', '', ''],
            ['', '', '', `- ${fmtInt(gstTdsAmount)}`, 'G.S.T.', '', '', '', '', '', '', '', ''],
            ['', '', '', `- ${fmtInt(lcAmount)}`, 'L.W.C.', '4. Total amount of payments already made as entry', '', '', fmtInt(previouslyPaidAmount), '', '', '', ''],
            ['', '', '', `- ${fmtInt(sdAmount)}`, 'Security Deposit', '      (K) of last Running Account Bill forwarded with', '', '', '', '', '', '', ''],
            ['', '', '', `- ${fmtInt(fmdAmount)}`, 'F.M.D', '       accounts for', '', '', '', '', '', '', ''],
            ['', '', '', `- ${fmtInt(asphaltDeposit)}`, 'Asphalt Deposit', '5. Payment now to be made as detailed belaw :-', '', '', 'Rs.', fmtInt(netPayableAmount), '', '', ''],
            ['', '', '', `- ${fmtInt(coreSampleDeposit)}`, 'Core Sample De.', '', 'By recovery of ammount, creditable be ', '', '', '', '', '', ''],
            ['', '', '', `- ${fmtInt(tpiAmount)}`, 'T.P.I. Deposite', '(a)', 'this work : value to stock supplied as', '', '', fmtInt(recoveryThisWork), '', '', ''],
            ['', '', '', `- ${fmtInt(esmpAmount)}`, 'E.S.M.P.', '', 'detailed in the ledger in', '', '', '', '', '', ''],
            ['', '', '', `- ${fmtInt(tldAmount)}`, 'T.L.D.', 'Total 2 (b) + 5 ( c ) G', '', '', '', fmtInt(total2b5c), '', '', ''],
            ['', '', '', '', '', '', 'By  recovery  of  ammount, creditable ', '', '', '', '', '', ''],
            ['', '', '', '', '', '(b)', 'other   work  or   head   of   Account', '', '', 'Rs.', '0', '', ''],
            ['', '', '', `- ${fmtInt(totalDeduction)}`, 'Total Deduction', '', 'detailed in the ledger in', '', '', '', '', '', ''],
            ['', '', '', `- ${fmtInt(chequeAmount)}`, 'Chaque Amt.', '( c )', 'By Cheque / Total 5[b] x [c] H', '', '', 'Rs.', fmtInt(byChequeFinal), '', ''],
            [''],
            [`Pay Rs. ${fmtInt(chequeAmount)} (${numToWords(chequeAmount)})`, '', '', '', '', '', '', '', '', '', '', '', 'By Cheque'],
            [''],
            ['', '', 'Received Rs.', '', '', '', '', '(Dated Initial of the Disbursing officer )'],
            ['', 'on account of work.', '', '', '', '', '', 'as per above memorandum', '', '', '', ''],
            ['', '', 'dated            20'],
            ['', '', '', '', '', '', '', '', 'Stamp'],
            [''], [''], [''], [''],
            ['', '', '', 'witness', '', '', '', '', 'Full Signature of the Contractor'],
            [''],
            ['paid by me !  vide Cheque No. ____________', '', '', '', '', '', '', '', '', 'dated ____________', ''],
            [''],
            ['', '', '', '', '', '', '', '', '', 'Cashier'],
            ['(Dated intitials of person actually making the payments )'],
            ['IV  -  REMARKS'],
            ['', '( This space is reserved for  any  remarks the  Disbursing  officer or  Executive  Engineer'],
            [' may wish to record in respect of the execution of the work check of measurement of the Contractor\u2019s '],
            ['account Checked.)'],
            [''],
            ['Clerk', '', '', '', '', '', '', '', 'Accountant'],
            ['Here specify the amount payable vide items ( 5 ) ( a )'],
        ];

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, 'Bill Last Page');
        XLSX.writeFile(wb, `Bill_Last_Page_${billNum}_${(packageData?.packageName || 'Bill').substring(0, 20)}.xlsx`);
    };

    const TD = 'border border-black px-1 py-[3px] align-top';
    const VAL = `${TD} text-right font-semibold`;
    const SM = 'text-[11px]';
    const NBSP = '\u00A0';

    const C = (t: React.ReactNode, s = 1, c = '', rs = 0): Cell => (rs ? { t, s, c, rs } : { t, s, c });
    const B = (s = 1): Cell => ({ t: '', s, c: TD });

    // Top section items (below "2. Deduct amount witheld")
    const topItems = [
        { label: 'Previously Paid Amount', val: fmtInt(auditMemoPreviouslyPaid) },
        { label: 'Amount of Dismantle Credit', val: fmtInt(dismantleCredit), sign: '-' },
        { label: 'Excess / Extra Items', val: fmtInt(excessExtraAmount), sign: '-' },
        { label: 'Price Adjustment', val: fmtInt(priceAdjustment), sign: priceAdjustmentType === 'Deductible' ? '-' : '+' },
        { label: 'Administrative Approval', val: fmtInt(adminApprovalAmount), sign: '-' },
        { label: 'Withheld Deposit', val: fmtInt(withheldAmount), sign: '-' },
        { label: 'Net Payable Amount:', val: fmtInt(netPayableAmount), bold: true },
    ];

    // Memo section rows (III Memorandum Of Payments grid)
    const memoRows: Cell[][] = [

        // Row 1 : Figures for / (a)
        [
            C(<span>Figures for<br />works Abstract</span>, 4, `${TD} pl-2`),
            C('(a) From previous Bill as per last Running Account Bill', 3, `${TD} pl-1`),
            B(),
            C(fmtInt(prevWithheld), 2, VAL),
            C('Rs.', 1, `${TD} text-center ${SM}`),
            C('Ps.', 3, `${TD} pl-1 ${SM}`)
        ],

        // Row 12-13 : works Abstract / Rs. P. / (b)
        [
            C('Rs.', 1, `${TD} pl-2`),
            B(),
            C('P.', 1, `${TD} pl-1`),
            B(),
            C('(b) From this Bill', 3, `${TD} pl-1`),
            B(),
            C(fmtInt(withheldAmount), 2, VAL),
            B(4)
        ],

        // Row 14 : Deduction
        [C('Deduction', 4, `${TD} pl-2 bg-slate-100 font-bold`), B(10)],

        // Row 15
        [
            B(1),
            C(`- ${fmtInt(itAmount)}`, 1, VAL),
            C('Income Tax', 1, `${TD} pl-1`),
            B(),
            C('3. Balnce i.e. "up-to date" Payment', 3, `${TD} pl-1`),
            B(),
            C(fmtInt(balanceUptoDate), 2, VAL),
            C('(Itemes 1-2 (k))', 4, `${TD} pl-1 ${SM}`)
        ],

        // Row 16
        [B(1), C(`- ${fmtInt(gstTdsAmount)}`, 1, VAL), C('G.S.T.', 1, `${TD} pl-1`), B(11)],

        // Row 17
        [
            B(1),
            C(`- ${fmtInt(lcAmount)}`, 1, VAL),
            C('L.W.C.', 1, `${TD} pl-1`),
            B(),
            C('4. Total amount of payments already made as entry', 3, `${TD} pl-1`),
            B(),
            C(fmtInt(previouslyPaidAmount), 2, VAL),
            B(4)
        ],

        // Row 18
        [
            B(1),
            C(`- ${fmtInt(sdAmount)}`, 1, VAL),
            C('Security Deposit', 1, `${TD} pl-1`),
            B(),
            C(`${NBSP.repeat(6)}(K) of last Running Account Bill forwarded with`, 3, `${TD} pl-1`),
            B(7)
        ],

        // Row 19
        [
            B(1),
            C(`- ${fmtInt(fmdAmount)}`, 1, VAL),
            C('F.M.D', 1, `${TD} pl-1`),
            B(),
            C(`${NBSP.repeat(7)}accounts for`, 3, `${TD} pl-1`),
            B(7)
        ],

        // Row 20
        [
            B(1),
            C(`- ${fmtInt(asphaltDeposit)}`, 1, VAL),
            C('Asphalt Deposit', 1, `${TD} pl-1`),
            B(),
            C('5. Payment now to be made as detailed belaw :-', 3, `${TD} pl-1`),
            B(),
            C(fmtInt(netPayableAmount), 2, VAL),
            C('Rs.', 1, `${TD} text-center ${SM}`),
            C('Ps.', 3, `${TD} pl-1 ${SM}`)
        ],

        // Row 21
        [
            B(1),
            C(`- ${fmtInt(coreSampleDeposit)}`, 1, VAL),
            C('Core Sample De.', 1, `${TD} pl-1`),
            B(2),
            C('By recovery of ammount, creditable be ', 2, `${TD} pl-1`),
            B(2),
            B(5)
        ],

        // Row 22
        [
            B(1),
            C(`- ${fmtInt(tpiAmount)}`, 1, VAL),
            C('T.P.I. Deposite', 1, `${TD} pl-1`),
            B(),
            C('(a)', 1, `${TD} pl-1`),
            C('this work : value to stock supplied as', 2, `${TD} pl-1`),
            B(),
            C(fmtInt(recoveryThisWork), 1, VAL),
            C('(a)', 1, `${TD} text-center`),
            B(4)
        ],

        // Row 23
        [
            B(1),
            C(`- ${fmtInt(esmpAmount)}`, 1, VAL),
            C('E.S.M.P.', 1, `${TD} pl-1`),
            B(2),
            C('detailed in the ledger in', 2, `${TD} pl-1`),
            B(7)
        ],

        // Row 24
        [
            B(1),
            C(`- ${fmtInt(tldAmount)}`, 1, VAL),
            C('T.L.D.', 1, `${TD} pl-1`),
            B(),
            C('Total 2 (b) + 5 ( c ) G', 3, `${TD} pl-1 font-semibold`),
            B(),
            C(fmtInt(total2b5c), 2, VAL),
            B(4)
        ],

        // Row 25
        [B(4), B(), C(`By${NBSP.repeat(2)}recovery${NBSP.repeat(2)}of${NBSP.repeat(2)}ammount, creditable`, 2, `${TD} pl-1`), B(7)],

        // Row 26
        [
            B(4),
            C('(b)', 1, `${TD} pl-1`),
            C(`other${NBSP.repeat(2)}work${NBSP.repeat(2)}or${NBSP.repeat(2)}head${NBSP.repeat(2)}of${NBSP.repeat(2)}Account`, 2, `${TD} pl-1`),
            B(),
            C(fmtInt(recoveryOtherWork), 1, VAL),
            C('(b)', 1, `${TD} text-center`),
            B(4)
        ],

        // Row 27
        [
            B(1),
            C(`- ${fmtInt(totalDeduction)}`, 1, VAL),
            C('Total Deduction', 1, `${TD} pl-1 font-bold`),
            B(2),
            C('detailed in the ledger in', 2, `${TD} pl-1`),
            B(7)
        ],

        // Row 28
        [
            B(1),
            C(`- ${fmtInt(chequeAmount)}`, 1, VAL),
            C('Chaque Amt.', 1, `${TD} pl-1 font-bold`),
            B(),
            C('( c )', 1, `${TD} pl-1`),
            C('By Cheque / Total 5[b] x [c] H', 2, `${TD} pl-1`),
            B(),
            C(fmtInt(byChequeFinal), 2, VAL),
            B(4)
        ],

        // Row 29 : blank
        [B(14)],

        // Row 30 : Pay Rs.
        [
            C(
                <span>
                    <span className="font-bold">Pay Rs. </span>
                    <span className="font-bold text-[14px] underline">{fmtInt(chequeAmount)}</span>
                    <span className="italic ml-2 text-[12px]">({numToWords(chequeAmount)})</span>
                </span>,
                7, `${TD} pl-2`
            ),
            B(2),
            B(),
            C('By Cheque', 4, `${TD} text-right font-bold pr-2`)
        ],

        // Row 31 : blank
        [B(14)],

        // Row 32-34 : Receipt / Disbursing officer
        [
            B(1),
            C('Received Rs.', 2, `${TD} pl-1`),
            C(fmtNum(chequeAmount), 4, `${TD} pl-1 font-bold`),
            C('(Dated Initial of the Disbursing officer )', 7, `${TD} pl-1 ${SM} italic`)
        ],
        [
            C('on account of work.', 1, `${TD} pl-1`),
            B(6),
            C('as per above memorandum', 7, `${TD} pl-1 italic`)
        ],
        [B(1), C('dated            20', 2, `${TD} pl-1`), B(6), B(5)],

        // Row 35 : Stamp (spans rows 35-38, cols K:L)
        [
            B(9),
            C('Stamp', 2, 'border border-dashed border-slate-500 text-center align-middle text-[10px] uppercase tracking-widest bg-slate-50', 4),
            B(3)
        ],
        [B(9), B(3)],
        [B(9), B(3)],
        [B(9), B(3)],

        // Row 39 : blank
        [B(14)],

        // Row 40 : witness / Full Signature
        [
            B(2),
            C('witness', 1, `${TD} pl-1 italic ${SM}`),
            B(4),
            C('Full Signature of the Contractor', 7, `${TD} text-right font-bold pr-2`)
        ],

        // Row 41 : blank
        [B(14)],

        // Row 42 : paid by me
        [C('paid by me !  vide Cheque No. ____________', 7, `${TD} pl-2`), B(), C('dated', 1, `${TD} pl-2`), B(5)],

        // Row 43 : blank
        [B(14)],

        // Row 44 : Cashier
        [B(8), C('Cashier', 2, `${TD} text-right font-bold pr-2`), B(4)],

        // Row 45 : note under cashier
        [C('(Dated intitials of person actually making the payments )', 14, `${TD} pl-2 ${SM} italic`)],

        // Row 46 : IV Remarks heading
        [C('IV  -  REMARKS', 14, `${TD} pl-2 font-bold uppercase tracking-wide`)],

        // Rows 47-49 : remarks text
        [C('( This space is reserved for  any  remarks the  Disbursing  officer or  Executive  Engineer', 14, `${TD} pl-1 ${SM}`)],
        [C(` may wish to record in respect of the execution of the work check of measurement of the Contractor\u2019s `, 14, `${TD} pl-2 ${SM}`)],
        [C('account Checked.)', 14, `${TD} pl-2 ${SM}`)],

        // Row 50 : blank
        [B(14)],

        // Row 51 : Clerk / Accountant
        [C('Clerk', 1, `${TD} pl-2 font-bold`), B(6), C('Accountant', 1, `${TD} pl-2 font-bold`), B(6)],

        // Row 52 : footnote
        [C('Here specify the amount payable vide items ( 5 ) ( a )', 14, `${TD} pl-2 ${SM} italic`)],

        // Row 53 : blank
        [B(14)]
    ];

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            {/* Action Bar */}
            <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3 shadow-sm font-sans">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/packages/${packageId}`}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Package
                        </Link>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                            Bill Last Page.xls &#8212; III Memorandum Of Payments
                        </span>
                        <span className="text-xs text-slate-500 hidden md:inline">Work: {workName} &middot; Agency: {contractorName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExportExcel}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-1.5 rounded-lg border border-emerald-300 shadow-sm transition-all cursor-pointer"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-700" /> Export Excel (.xlsx)
                        </button>
                        <button
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 px-4 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
                        >
                            <Printer className="w-4 h-4" /> Print
                        </button>
                    </div>
                </div>
            </header>

            {/* Printable Document - replicates Bill Last Page.xls grid exactly */}
            <main
                ref={printRef}
                className="max-w-[1020px] mx-auto my-6 bg-white border border-black text-black text-[12.5px] leading-snug print:border-none print:shadow-none print:m-0 print:max-w-full"
            >
                {/* Top section - Bill No., Item 1, deduct amount witheld (3 columns 70/5/25) */}
                <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                        <col style={{ width: '70%' }} />
                        <col style={{ width: '5%' }} />
                        <col style={{ width: '25%' }} />
                    </colgroup>
                    <tbody>
                        <tr>
                            <td className={`${TD} pl-3 pr-2`}>
                                <span className="font-bold">Bill No.: </span>
                                <span className="font-bold underline">{billLabel}</span>
                            </td>
                            <td className={TD}></td>
                            <td className={`${TD} text-right font-bold uppercase tracking-wide pr-2`}>III Memorandum Of Payments</td>
                        </tr>
                        <tr>
                            <td className={`${TD} pl-3`}>1. Total value of work done as per account.</td>
                            <td className={`${TD} text-center`}>Rs.</td>
                            <td className={`${TD} text-right font-semibold pr-2`}>{fmtInt(uptoDateGross)}</td>
                        </tr>
                        <tr>
                            <td colSpan={3} className={`${TD} pl-3 bg-slate-100 font-semibold`}>2. Deduct amount witheld</td>
                        </tr>
                        {topItems.map((item, i) => (
                            <tr key={i}>
                                <td className={`${TD} pl-3 ${item.bold ? 'font-bold' : ''}`}>
                                    {item.sign ? <span className="font-bold mr-1">{item.sign}</span> : null}
                                    {item.label}
                                </td>
                                <td className={`${TD} text-center ${SM}`}>Rs.</td>
                                <td className={`${TD} text-right ${item.bold ? 'font-semibold font-bold' : 'font-semibold'} pr-2`}>{item.val}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Memo section - III Memorandum Of Payments grid (15 columns) */}
                <table className="w-full border-collapse table-seamless" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                        <col style={{ width: '3%' }} />
                        <col style={{ width: '4%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '6%' }} />
                        <col style={{ width: '6%' }} />
                        <col style={{ width: '7%' }} />
                        <col style={{ width: '4%' }} />
                        <col style={{ width: '4%' }} />
                        <col style={{ width: '9%' }} />
                        <col style={{ width: '4%' }} />
                        <col style={{ width: '5%' }} />
                        <col style={{ width: '4%' }} />
                        <col style={{ width: '3%' }} />
                        <col style={{ width: '10%' }} />
                    </colgroup>
                    <tbody>
                        {memoRows.map((row, i) => (
                            <tr key={i}>
                                {row.map((cell, j) => (
                                    <td key={j} colSpan={cell.s} rowSpan={cell.rs} className={cell.c}>{cell.t}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>

            <style jsx global>{`
                .table-seamless tr:first-child td { border-top: none !important; }
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; color: black !important; }
                    main {
                        border: 1px solid black !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        max-width: 100% !important;
                        width: 100% !important;
                    }
                    table { page-break-inside: avoid; }
                }
            `}</style>
        </div>
    );
}