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

const gujNumbers: { [key: number]: string } = {
    0: '',
    1: 'એક',
    2: 'બે',
    3: 'ત્રણ',
    4: 'ચાર',
    5: 'પાંચ',
    6: 'છ',
    7: 'સાત',
    8: 'આઠ',
    9: 'નવ',
    10: 'દસ',
    11: 'અગિયાર',
    12: 'બાર',
    13: 'તેર',
    14: 'ચૌદ',
    15: 'પંદર',
    16: 'સોળ',
    17: 'સત્તર',
    18: 'અઢાર',
    19: 'ઓગણીસ',
    20: 'વીસ',
    21: 'એકવીસ',
    22: 'બાવીસ',
    23: 'ત્રેવીસ',
    24: 'ચોવીસ',
    25: 'પચ્ચીસ',
    26: 'છવ્વીસ',
    27: 'સત્તાવીસ',
    28: 'અઠ્ઠાવીસ',
    29: 'ઓગણત્રીસ',
    30: 'ત્રીસ',
    31: 'એકત્રીસ',
    32: 'બત્રીસ',
    33: 'તેત્રીસ',
    34: 'ચોત્રીસ',
    35: 'પાંત્રીસ',
    36: 'છત્રીસ',
    37: 'સાડત્રીસ',
    38: 'આડત્રીસ',
    39: 'ઓગણચાલીસ',
    40: 'ચાલીસ',
    41: 'એકતાલીસ',
    42: 'બેતાલીસ',
    43: 'તેતાલીસ',
    44: 'ચુમ્માલીસ',
    45: 'પીસ્તાલીસ',
    46: 'છેતાલીસ',
    47: 'સુડતાલીસ',
    48: 'અડતાલીસ',
    49: 'ઓગણપચાસ',
    50: 'પચાસ',
    51: 'એકાવન',
    52: 'બાવન',
    53: 'ત્રેપન',
    54: 'ચોપન',
    55: 'પંચાવન',
    56: 'છપ્પન',
    57: 'સત્તાવન',
    58: 'અઠ્ઠાવન',
    59: 'ઓગણસાઈઠ',
    60: 'સાઈઠ',
    61: 'એકસઠ',
    62: 'બાસઠ',
    63: 'ત્રેસઠ',
    64: 'ચોસઠ',
    65: 'પાંસઠ',
    66: 'છાસઠ',
    67: 'સડસઠ',
    68: 'અડસઠ',
    69: 'અગણોસિત્તેર',
    70: 'સિત્તેર',
    71: 'ઇકોતેર',
    72: 'બોતેર',
    73: 'તેંતેર',
    74: 'ચુમોતેર',
    75: 'પંચોતેર',
    76: 'છોતેર',
    77: 'સીંતોતેર',
    78: 'ઈઠોતેર',
    79: 'ઓગણાએંસી',
    80: 'એંસી',
    81: 'એક્યાસી',
    82: 'બ્યાસી',
    83: 'ત્યાસી',
    84: 'ચોર્યાસી',
    85: 'પંચાસી',
    86: 'છ્યાસી',
    87: 'સિત્યાસી',
    88: 'અઠ્યાસી',
    89: 'નેવ્યાસી',
    90: 'નેવું',
    91: 'એકાણું',
    92: 'બાણું',
    93: 'ત્રાણું',
    94: 'ચોરાણું',
    95: 'પંચાણું',
    96: 'છન્નું',
    97: 'સત્તાણું',
    98: 'અઠ્ઠાણું',
    99: 'નવ્વાણું'
};

const gujHundreds: { [key: number]: string } = {
    1: 'એકસો',
    2: 'બસો',
    3: 'ત્રણસો',
    4: 'ચારસો',
    5: 'પાંચસો',
    6: 'છસો',
    7: 'સાતસો',
    8: 'આઠસો',
    9: 'નવસો'
};

function numToGujaratiWords(n: number): string {
    const val = Math.floor(n);
    if (val === 0) return 'શૂન્ય રૂપિયા પૂરા';

    function convert(num: number): string {
        if (num === 0) return '';
        if (num < 100) return (gujNumbers[num] || '') + ' ';
        if (num < 1000) {
            const h = Math.floor(num / 100);
            const rem = num % 100;
            return (gujHundreds[h] || `${gujNumbers[h]} સો`) + ' ' + convert(rem);
        }
        if (num < 100000) {
            const th = Math.floor(num / 1000);
            const rem = num % 1000;
            return (gujNumbers[th] || convert(th).trim()) + ' હજાર ' + convert(rem);
        }
        if (num < 10000000) {
            const lk = Math.floor(num / 100000);
            const rem = num % 100000;
            return (gujNumbers[lk] || convert(lk).trim()) + ' લાખ ' + convert(rem);
        }
        const cr = Math.floor(num / 10000000);
        const rem = num % 10000000;
        return (gujNumbers[cr] || convert(cr).trim()) + ' કરોડ ' + convert(rem);
    }

    return convert(val).replace(/\s+/g, ' ').trim() + ' રૂપિયા પૂરા';
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

    // Financial Figures
    const grossBillAmount = Number(bill?.grossAmount || 0);
    const dismantleCredit = Number(bill?.dismantleCredit || 0);
    const auditMemoPreviouslyPaid = Number(bill?.auditMemoPreviouslyPaid || 0);
    const excessExtraAmount = Number(bill?.excessExtraAmount || 0);
    const priceAdjustment = Number(bill?.priceAdjustment || 0);
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
    const previouslyPaidAmount = auditMemoPreviouslyPaid > 0 ? auditMemoPreviouslyPaid : prevGross;
    const recoveryThisWork = dismantleCredit;
    const recoveryOtherWork = 0;

    const handlePrint = () => { window.print(); };

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();

        // 6-Column structure mapping
        const sheetData: any[][] = [
            ['Name of Work:-', workName, '', '', '', ''],
            ['Contractor:-', contractorName, '', '', '', ''],
            ['', '', '', '', '', ''],
            ['Bill No.:', billLabel, '', 'III Memorandum Of Payments', '', ''],
            ['બિલ મુજબ થયેલ કામની કુલ રકમ', '', '', '', '', fmtNum(uptoDateGross)],
            ['અગાઉ રનીંગ બિલેથી ચુકવેલ બીલની રકમ', '', '', '', '', fmtNum(previouslyPaidAmount)],
            ['આ બીલેથી ચુકવવાની રકમ', '', '', '', '', fmtNum(grossBillAmount)],
            ['Amount of Dismantle Credit', '', '', '', '', fmtNum(dismantleCredit)],
            ['એકસેસ/ એક્સ્ટ્રા આઇટમની રકમ', '', '', '', '', fmtNum(excessExtraAmount)],
            ['પ્રાઇસ એડજસ્ટમેન્ટ/ સ્ટાર રેઇટ ની રકમ', '', '', '', '', fmtNum(priceAdjustment)],
            ['વહીવટી મંજુરીની મર્યાદા બહારની રકમ', '', '', '', '', fmtNum(adminApprovalAmount)],
            ['વીથહેલ્ડ ડીપોઝીટ', '', '', '', '', fmtNum(withheldAmount)],
            ['Net Payable Amount:', '', '', '', '', fmtNum(netPayableAmount)],
            ['Figures for', '', '(a) From previous Bill as per last Running Account Bill', '', '', 'Rs.'],
            ['works Abstract', '', '', '', '', ''],
            ['', '', '(b) From this Bill', '', '', ''],
            ['Deduction', '', '', '', '', ''],
            [itAmount > 0 ? `- ${fmtNum(itAmount)}` : '', 'Income Tax', '3. Balnce i.e. "up-to date" Payment', '', '', ''],
            [gstTdsAmount > 0 ? `- ${fmtNum(gstTdsAmount)}` : '', 'G.S.T.', '', '', '', ''],
            [lcAmount > 0 ? `- ${fmtNum(lcAmount)}` : '', 'Labour Cess', '4. Total amount of payments already made as entry', '', '', ''],
            [sdAmount > 0 ? `- ${fmtNum(sdAmount)}` : '', 'Security Deposit', '      (K) of last Running Account Bill forwarded with', '', '', ''],
            [fmdAmount > 0 ? `- ${fmtNum(fmdAmount)}` : '', 'F.M.D.', '       accounts for', '', '', ''],
            [asphaltDeposit > 0 ? `- ${fmtNum(asphaltDeposit)}` : '', 'Asphalt Deposit', '5. Payment now to be made as detailed belaw :-', '', '', 'Rs.'],
            [coreSampleDeposit > 0 ? `- ${fmtNum(coreSampleDeposit)}` : '', 'Core Sample De.', '', 'By recovery of ammount, creditable be ', '', ''],
            [tpiAmount > 0 ? `- ${fmtNum(tpiAmount)}` : '', 'T.P.I. ', '(a) ', 'this work : value to stock supplied as', ' (a) ', recoveryThisWork > 0 ? fmtNum(recoveryThisWork) : ''],
            [esmpAmount > 0 ? `- ${fmtNum(esmpAmount)}` : '', 'E.S.M.P.', '', 'detailed in the ledger in', '', ''],
            [tldAmount > 0 ? `- ${fmtNum(tldAmount)}` : '', 'T.L.D.', 'Total 2 (b) + 5 ( c ) G', '', '', ''],
            [otherDeposit + otherDeposit2 > 0 ? `- ${fmtNum(otherDeposit + otherDeposit2)}` : '', 'Other Deposit', '', 'By  recovery  of  ammount, creditable ', '', ''],
            ['', '', '(b) ', 'other   work  or   head   of   Account', ' (b) ', recoveryOtherWork > 0 ? fmtNum(recoveryOtherWork) : ''],
            ['- ' + fmtNum(totalDeduction), 'Total Deduction', '', 'detailed in the ledger in', '', ''],
            [fmtNum(chequeAmount), 'Cheque Amt.', '( c ) ', 'By Cheque / Total 5[b] x [c] H', '', ''],
            ['', '', '', '', '', ''],
            ['Pay Rs.', numToGujaratiWords(chequeAmount), '', '', '', 'By Cheque'],
            ['', '', '', '', '', ''],
            ['', 'Received Rs.', '', '(Dated Initial of the Disbursing officer )', '', ''],
            ['', 'on account of work.', '', 'as per above memorandum', '', ''],
            ['', 'dated            20', '', '', '', ''],
            ['', '', '', '', 'Stamp', ''],
            ['', '', '', '', '', ''],
            ['', '', '', '', '', ''],
            ['', '', '', '', '', ''],
            ['', '', '', '', '', ''],
            ['witness', '', '', 'Full Signature of the Contractor', '', ''],
            ['', '', '', '', '', ''],
            ['paid by me !  vide Cheque No.', '', 'dated', '', '', ''],
            ['', '', '', '', '', ''],
            ['', '', 'Cashier', '', '', ''],
            ['(Dated intitials of person actually making the payments )', '', '', '', '', ''],
            ['IV  -  REMARKS', '', '', '', '', ''],
            ['( This space is reserved for  any  remarks the  Disbursing  officer or  Executive  Engineer', '', '', '', '', ''],
            [' may wish to record in respect of the execution of the work check of measurement of the Contractor\'s ', '', '', '', '', ''],
            ['account Checked.)', '', '', '', '', ''],
            ['', '', '', '', '', ''],
            ['Clerk', '', 'Accountant', '', '', ''],
            ['', '', '', '', '', '']
        ];

        const ws = XLSX.utils.aoa_to_sheet(sheetData);

        ws['!merges'] = [
            { s: { c: 1, r: 0 }, e: { c: 5, r: 0 } },  // Name of Work
            { s: { c: 1, r: 1 }, e: { c: 5, r: 1 } },  // Contractor
            { s: { c: 1, r: 3 }, e: { c: 2, r: 3 } },  // Bill No
            { s: { c: 3, r: 3 }, e: { c: 5, r: 3 } },  // III Memo
            { s: { c: 0, r: 4 }, e: { c: 4, r: 4 } },  // Row 5
            { s: { c: 0, r: 5 }, e: { c: 4, r: 5 } },  // Row 6
            { s: { c: 0, r: 6 }, e: { c: 4, r: 6 } },  // Row 7 (NEW)
            { s: { c: 0, r: 7 }, e: { c: 4, r: 7 } },  // Row 8
            { s: { c: 0, r: 8 }, e: { c: 4, r: 8 } },  // Row 9
            { s: { c: 0, r: 9 }, e: { c: 4, r: 9 } },  // Row 10
            { s: { c: 0, r: 10 }, e: { c: 4, r: 10 } },// Row 11
            { s: { c: 0, r: 11 }, e: { c: 4, r: 11 } },// Row 12
            { s: { c: 0, r: 12 }, e: { c: 4, r: 12 } },// Row 13
            { s: { c: 2, r: 13 }, e: { c: 4, r: 13 } },// Row 14 (a)
            { s: { c: 0, r: 14 }, e: { c: 0, r: 15 } },// Row 15 works abstract rs=2
            { s: { c: 1, r: 13 }, e: { c: 1, r: 16 } },// Row 14-17 col 2 blank rs=4
            { s: { c: 2, r: 15 }, e: { c: 4, r: 15 } },// Row 16 (b)
            { s: { c: 2, r: 16 }, e: { c: 5, r: 16 } },// Row 17
            { s: { c: 2, r: 17 }, e: { c: 3, r: 17 } },// Row 18 3. balance
            { s: { c: 2, r: 18 }, e: { c: 5, r: 18 } },// Row 19
            { s: { c: 2, r: 19 }, e: { c: 4, r: 19 } },// Row 20 4. total
            { s: { c: 2, r: 20 }, e: { c: 5, r: 20 } },// Row 21
            { s: { c: 2, r: 21 }, e: { c: 5, r: 21 } },// Row 22
            { s: { c: 2, r: 22 }, e: { c: 4, r: 22 } },// Row 23 5. payment
            { s: { c: 3, r: 23 }, e: { c: 4, r: 23 } },// Row 24
            { s: { c: 3, r: 25 }, e: { c: 4, r: 25 } },// Row 26
            { s: { c: 2, r: 26 }, e: { c: 4, r: 26 } },// Row 27 Total 2b+5c
            { s: { c: 3, r: 27 }, e: { c: 4, r: 27 } },// Row 28
            { s: { c: 3, r: 29 }, e: { c: 4, r: 29 } },// Row 30
            { s: { c: 3, r: 30 }, e: { c: 4, r: 30 } },// Row 31
            { s: { c: 1, r: 32 }, e: { c: 4, r: 32 } },// Row 33 Pay words
            { s: { c: 3, r: 34 }, e: { c: 5, r: 34 } },// Row 35 disbursing
            { s: { c: 3, r: 35 }, e: { c: 5, r: 35 } },// Row 36 memorandum
            { s: { c: 4, r: 37 }, e: { c: 5, r: 40 } },// Stamp
            { s: { c: 3, r: 42 }, e: { c: 5, r: 42 } },// Full signature
            { s: { c: 0, r: 44 }, e: { c: 2, r: 44 } },// paid by me
            { s: { c: 3, r: 44 }, e: { c: 5, r: 44 } },// dated
            { s: { c: 2, r: 46 }, e: { c: 5, r: 46 } },// Cashier
            { s: { c: 0, r: 47 }, e: { c: 5, r: 47 } },// dated initials
            { s: { c: 0, r: 48 }, e: { c: 5, r: 48 } },// IV Remarks
            { s: { c: 0, r: 49 }, e: { c: 5, r: 49 } },// remarks 1
            { s: { c: 0, r: 50 }, e: { c: 5, r: 50 } },// remarks 2
            { s: { c: 0, r: 51 }, e: { c: 5, r: 51 } },// remarks 3
            { s: { c: 0, r: 53 }, e: { c: 1, r: 53 } },// Clerk
            { s: { c: 2, r: 53 }, e: { c: 5, r: 53 } }  // Accountant
        ];

        ws['!cols'] = [
            { wch: 22 },
            { wch: 23 },
            { wch: 6 },
            { wch: 30 },
            { wch: 5 },
            { wch: 14 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Bill Last Page');
        XLSX.writeFile(wb, `Bill_Last_Page_${billNum}_${(packageData?.packageName || 'Bill').substring(0, 20)}.xlsx`);
    };

    const TD = 'border border-black px-2 py-[2.5px] align-top text-[13px] leading-snug';
    const TD_BOLD = `${TD} font-bold`;
    const TD_NUM = `${TD} text-right font-semibold whitespace-nowrap`;

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 pb-8" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            {/* Action Bar (hidden when printing) */}
            <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-2.5 shadow-sm font-sans">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/packages/${packageId}`}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Package
                        </Link>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                            Bill Last Page (Full Page) &#8212; III Memorandum Of Payments
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
                            <Printer className="w-4 h-4" /> Print (1 Page)
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Bill Last Page Document - Consumes Full Width and Height of 1 Page */}
            <main
                ref={printRef}
                className="w-full max-w-[1080px] mx-auto my-3 bg-white border border-black text-black text-[13px] leading-snug p-3 shadow-sm print:border-none print:shadow-none print:m-0 print:p-0 print:max-w-full print:w-full"
                id="bill-print-area"
            >
                <table className="w-full border-collapse border border-black" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                        {/* 6 columns: 22%, 23%, 6%, 30%, 5%, 14% */}
                        <col style={{ width: '22%' }} />  {/* Col 1 */}
                        <col style={{ width: '23%' }} />  {/* Col 2 */}
                        <col style={{ width: '6%' }} />   {/* Col 3 */}
                        <col style={{ width: '30%' }} />  {/* Col 4 */}
                        <col style={{ width: '5%' }} />   {/* Col 5 */}
                        <col style={{ width: '14%' }} />  {/* Col 6 */}
                    </colgroup>
                    <tbody>
                        {/* Row 1: Name of Work */}
                        <tr>
                            <td className={TD_BOLD}>Name of Work:-</td>
                            <td colSpan={5} className={`${TD} font-semibold underline`}>{workName}</td>
                        </tr>

                        {/* Row 2: Contractor */}
                        <tr>
                            <td className={TD_BOLD}>Contractor:-</td>
                            <td colSpan={5} className={`${TD} font-semibold underline`}>{contractorName}</td>
                        </tr>

                        {/* Row 3: Blank Spacer */}
                        <tr className="h-0.5">
                            <td colSpan={6} className="border-x border-black"></td>
                        </tr>

                        {/* Row 4: Bill No. & III Memorandum Of Payments */}
                        <tr>
                            <td className={TD_BOLD}>Bill No.:</td>
                            <td colSpan={2} className={`${TD} font-bold underline`}>{billLabel}</td>
                            <td colSpan={3} className={`${TD_BOLD} text-right uppercase tracking-wide text-xs whitespace-nowrap`}>III Memorandum Of Payments</td>
                        </tr>

                        {/* Row 5: Total value of work done */}
                        <tr>
                            <td colSpan={4} className={TD}>બિલ મુજબ થયેલ કામની કુલ રકમ</td>
                            <td colSpan={2} className={TD_NUM}>{fmtNum(uptoDateGross)}</td>
                        </tr>

                        {/* Row 6: Previously Paid Amount */}
                        <tr>
                            <td colSpan={4} className={TD}>અગાઉ રનીંગ બિલેથી ચુકવેલ બીલની રકમ</td>
                            <td colSpan={2} className={TD_NUM}>{fmtNum(previouslyPaidAmount)}</td>
                        </tr>

                        {/* Row 6B: This Bill Gross Payable Amount */}
                        <tr>
                            <td colSpan={4} className={TD}>આ બીલેથી ચુકવવાની રકમ</td>
                            <td colSpan={2} className={TD_NUM}>{fmtNum(grossBillAmount)}</td>
                        </tr>

                        {/* Row 7: Amount of Dismantle Credit */}
                        <tr>
                            <td colSpan={4} className={TD}>Amount of Dismantle Credit</td>
                            <td colSpan={2} className={TD_NUM}>{fmtNum(dismantleCredit)}</td>
                        </tr>

                        {/* Row 8: Excess / Extra Items */}
                        <tr>
                            <td colSpan={4} className={TD}>એકસેસ/ એક્સ્ટ્રા આઇટમની રકમ</td>
                            <td colSpan={2} className={TD_NUM}>{fmtNum(excessExtraAmount)}</td>
                        </tr>

                        {/* Row 9: Price Adjustment */}
                        <tr>
                            <td colSpan={4} className={TD}>પ્રાઇસ એડજસ્ટમેન્ટ/ સ્ટાર રેઇટ ની રકમ</td>
                            <td colSpan={2} className={TD_NUM}>{fmtNum(priceAdjustment)}</td>
                        </tr>

                        {/* Row 10: Administrative Approval */}
                        <tr>
                            <td colSpan={4} className={TD}>વહીવટી મંજુરીની મર્યાદા બહારની રકમ</td>
                            <td colSpan={2} className={TD_NUM}>{fmtNum(adminApprovalAmount)}</td>
                        </tr>

                        {/* Row 11: Withheld Deposit */}
                        <tr>
                            <td colSpan={4} className={TD}>વીથહેલ્ડ ડીપોઝીટ</td>
                            <td colSpan={2} className={TD_NUM}>{fmtNum(withheldAmount)}</td>
                        </tr>

                        {/* Row 12: Net Payable Amount */}
                        <tr className="bg-slate-50 font-bold">
                            <td colSpan={4} className={TD_BOLD}>Net Payable Amount:</td>
                            <td colSpan={2} className={`${TD_NUM} font-bold underline`}>{fmtNum(netPayableAmount)}</td>
                        </tr>

                        {/* Row 13: Figures for / (a) From previous Bill */}
                        <tr>
                            <td className={TD}>Figures for</td>
                            <td rowSpan={4} className="border border-black bg-slate-50/40"></td>
                            <td colSpan={3} className={TD}>(a) From previous Bill as per last Running Account Bill</td>
                            <td className={`${TD} text-center font-bold text-xs`}>Rs.</td>
                        </tr>

                        {/* Row 14: works Abstract */}
                        <tr>
                            <td rowSpan={2} className={`${TD} font-semibold align-middle text-center`}>works Abstract</td>
                            <td colSpan={3} className="border border-black"></td>
                            <td className="border border-black"></td>
                        </tr>

                        {/* Row 15: (b) From this Bill */}
                        <tr>
                            <td colSpan={3} className={TD}>(b) From this Bill</td>
                            <td className={TD}></td>
                        </tr>

                        {/* Row 16: Deduction */}
                        <tr className="bg-slate-100 font-bold">
                            <td className={TD_BOLD}>Deduction</td>
                            <td colSpan={4} className="border border-black"></td>
                        </tr>

                        {/* Row 17: Income Tax / 3. Balance */}
                        <tr>
                            <td className={TD_NUM}>{itAmount > 0 ? `- ${fmtNum(itAmount)}` : '-'}</td>
                            <td className={TD}>Income Tax</td>
                            <td colSpan={2} className={TD}>3. Balnce i.e. &quot;up-to date&quot; Payment</td>
                            <td className={TD}></td>
                            <td className={TD}></td>
                        </tr>

                        {/* Row 18: G.S.T. */}
                        <tr>
                            <td className={TD_NUM}>{gstTdsAmount > 0 ? `- ${fmtNum(gstTdsAmount)}` : '-'}</td>
                            <td className={TD}>G.S.T.</td>
                            <td colSpan={4} className="border border-black"></td>
                        </tr>

                        {/* Row 19: Labour Cess / 4. Total amount of payments already made */}
                        <tr>
                            <td className={TD_NUM}>{lcAmount > 0 ? `- ${fmtNum(lcAmount)}` : '-'}</td>
                            <td className={TD}>Labour Cess</td>
                            <td colSpan={3} className={TD}>4. Total amount of payments already made as entry</td>
                            <td className={TD}></td>
                        </tr>

                        {/* Row 20: Security Deposit */}
                        <tr>
                            <td className={TD_NUM}>{sdAmount > 0 ? `- ${fmtNum(sdAmount)}` : '-'}</td>
                            <td className={TD}>Security Deposit</td>
                            <td colSpan={4} className={`${TD} pl-4 text-xs italic`}>
                                (K) of last Running Account Bill forwarded with
                            </td>
                        </tr>

                        {/* Row 21: F.M.D. */}
                        <tr>
                            <td className={TD_NUM}>{fmdAmount > 0 ? `- ${fmtNum(fmdAmount)}` : '-'}</td>
                            <td className={TD}>F.M.D.</td>
                            <td colSpan={4} className={`${TD} pl-6 text-xs italic`}>
                                accounts for
                            </td>
                        </tr>

                        {/* Row 22: Asphalt Deposit / 5. Payment now to be made */}
                        <tr>
                            <td className={TD_NUM}>{asphaltDeposit > 0 ? `- ${fmtNum(asphaltDeposit)}` : '-'}</td>
                            <td className={TD}>Asphalt Deposit</td>
                            <td colSpan={3} className={TD_BOLD}>5. Payment now to be made as detailed belaw :-</td>
                            <td className={`${TD} text-center font-bold text-xs`}>Rs.</td>
                        </tr>

                        {/* Row 23: Core Sample De. */}
                        <tr>
                            <td className={TD_NUM}>{coreSampleDeposit > 0 ? `- ${fmtNum(coreSampleDeposit)}` : '-'}</td>
                            <td className={TD}>Core Sample De.</td>
                            <td className={TD}></td>
                            <td colSpan={2} className={TD}>By recovery of ammount, creditable be</td>
                            <td className="border border-black"></td>
                        </tr>

                        {/* Row 24: T.P.I. / (a) this work */}
                        <tr>
                            <td className={TD_NUM}>{tpiAmount > 0 ? `- ${fmtNum(tpiAmount)}` : '-'}</td>
                            <td className={TD}>T.P.I.</td>
                            <td className={`${TD} font-semibold text-center`}>(a)</td>
                            <td className={TD}>this work : value to stock supplied as</td>
                            <td className={`${TD} text-center text-xs`}>(a)</td>
                            <td className={TD_NUM}>{recoveryThisWork > 0 ? fmtNum(recoveryThisWork) : '-'}</td>
                        </tr>

                        {/* Row 25: E.S.M.P. */}
                        <tr>
                            <td className={TD_NUM}>{esmpAmount > 0 ? `- ${fmtNum(esmpAmount)}` : '-'}</td>
                            <td className={TD}>E.S.M.P.</td>
                            <td className={TD}></td>
                            <td colSpan={2} className={TD}>detailed in the ledger in</td>
                            <td className="border border-black"></td>
                        </tr>

                        {/* Row 26: T.L.D. / Total 2(b) + 5(c) G */}
                        <tr>
                            <td className={TD_NUM}>{tldAmount > 0 ? `- ${fmtNum(tldAmount)}` : '-'}</td>
                            <td className={TD}>T.L.D.</td>
                            <td colSpan={3} className={TD_BOLD}>Total 2 (b) + 5 ( c ) G</td>
                            <td className={TD}></td>
                        </tr>

                        {/* Row 27: Other Deposit */}
                        <tr>
                            <td className={TD_NUM}>{otherDeposit + otherDeposit2 > 0 ? `- ${fmtNum(otherDeposit + otherDeposit2)}` : '-'}</td>
                            <td className={TD}>Other Deposit</td>
                            <td className={TD}></td>
                            <td colSpan={2} className={TD}>By  recovery  of  ammount, creditable</td>
                            <td className="border border-black"></td>
                        </tr>

                        {/* Row 28: (b) other work */}
                        <tr>
                            <td colSpan={2} className="border border-black"></td>
                            <td className={`${TD} font-semibold text-center`}>(b)</td>
                            <td className={TD}>other work or head of Account</td>
                            <td className={`${TD} text-center text-xs`}>(b)</td>
                            <td className={TD_NUM}>{recoveryOtherWork > 0 ? fmtNum(recoveryOtherWork) : '-'}</td>
                        </tr>

                        {/* Row 29: Total Deduction */}
                        <tr className="bg-slate-50 font-bold">
                            <td className={`${TD_NUM} font-bold`}>- {fmtNum(totalDeduction)}</td>
                            <td className={TD_BOLD}>Total Deduction</td>
                            <td className={TD}></td>
                            <td colSpan={2} className={TD}>detailed in the ledger in</td>
                            <td className="border border-black"></td>
                        </tr>

                        {/* Row 30: Cheque Amt. / (c) By Cheque */}
                        <tr className="bg-slate-100 font-bold">
                            <td className={`${TD_NUM} font-bold text-sm`}>{fmtNum(chequeAmount)}</td>
                            <td className={TD_BOLD}>Cheque Amt.</td>
                            <td className={`${TD} font-semibold text-center`}>( c )</td>
                            <td colSpan={2} className={TD}>By Cheque / Total 5[b] x [c] H</td>
                            <td className={TD}></td>
                        </tr>

                        {/* Row 31: Blank Spacer */}
                        <tr className="h-0.5">
                            <td colSpan={6} className="border border-black"></td>
                        </tr>

                        {/* Row 32: Pay Rs. (Amount in Gujarati words) */}
                        <tr className="border border-black">
                            <td className={`${TD_BOLD} whitespace-nowrap`}>Pay Rs.</td>
                            <td colSpan={4} className={`${TD} font-bold`}>
                                <span className="font-semibold">{numToGujaratiWords(chequeAmount)}</span>
                            </td>
                            <td className={`${TD_BOLD} text-right whitespace-nowrap`}>By Cheque</td>
                        </tr>

                        {/* Row 33: Blank Spacer */}
                        <tr className="h-0.5">
                            <td colSpan={6} className="border-x border-black"></td>
                        </tr>

                        {/* Row 34: Received Rs. & Dated Initial */}
                        <tr>
                            <td className="border-l border-black pl-2">
                                <span className="font-bold">Received Rs.</span>
                            </td>
                            <td colSpan={2}></td>
                            <td colSpan={3} className="text-right text-xs italic border-r border-black pr-2">
                                (Dated Initial of the Disbursing officer )
                            </td>
                        </tr>

                        {/* Row 35: on account of work */}
                        <tr>
                            <td className="border-l border-black pl-2 italic text-xs">
                                on account of work.
                            </td>
                            <td colSpan={2}></td>
                            <td colSpan={3} className="text-right text-xs italic border-r border-black pr-2">
                                as per above memorandum
                            </td>
                        </tr>

                        {/* Row 36: dated 20 & Stamp box */}
                        <tr>
                            <td className="border-l border-black pl-2 text-xs">
                                dated &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;20
                            </td>
                            <td colSpan={3}></td>
                            <td colSpan={2} rowSpan={2} className="border-r border-black text-center align-middle pr-2">
                                <div className="inline-block border border-dashed border-slate-600 bg-slate-50 text-center font-bold text-[10px] uppercase tracking-widest px-4 py-1.5">
                                    Stamp
                                </div>
                            </td>
                        </tr>

                        {/* Row 42: witness & Full Signature of Contractor */}
                        <tr>
                            <td colSpan={2} className="italic text-xs border-l border-black pl-2 align-bottom">
                                witness
                            </td>
                            <td colSpan={2} className="align-bottom"></td>
                        </tr>
                        <tr>
                            <td colSpan={2} className="border-l border-black"></td>
                            <td colSpan={4} className="font-bold text-right text-xs border-r border-black pr-3 pb-1">
                                Full Signature of the Contractor
                            </td>
                        </tr>

                        {/* Row 44: paid by me ! vide Cheque No. & dated */}
                        <tr className="border-t border-black">
                            <td colSpan={3} className="border-l border-black pl-2 pt-1 text-xs">
                                paid by me ! &nbsp;vide Cheque No. ____________________
                            </td>
                            <td colSpan={3} className="border-r border-black text-right pr-3 pt-1 text-xs">
                                dated ____________
                            </td>
                        </tr>

                        {/* Row 46: Cashier */}
                        <tr>
                            <td colSpan={3} className="border-l border-black"></td>
                            <td colSpan={3} className="font-bold text-center border-r border-black text-xs py-0.5">Cashier</td>
                        </tr>

                        {/* Row 47: Dated initials */}
                        <tr>
                            <td colSpan={6} className="text-xs italic border-x border-black pl-2 pb-0.5">
                                (Dated intitials of person actually making the payments )
                            </td>
                        </tr>

                        {/* Row 48: IV - REMARKS */}
                        <tr className="bg-slate-100 font-bold border-y border-black">
                            <td colSpan={6} className="uppercase tracking-wider text-center py-0.5 text-xs">
                                IV &nbsp;- &nbsp;REMARKS
                            </td>
                        </tr>

                        {/* Rows 49-51: Remarks text */}
                        <tr>
                            <td colSpan={6} className="text-xs border-x border-black pl-3 pt-0.5">
                                ( This space is reserved for any remarks the Disbursing officer or Executive Engineer
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={6} className="text-xs border-x border-black pl-3">
                                &nbsp;may wish to record in respect of the execution of the work check of measurement of the Contractor&apos;s
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={6} className="text-xs border-x border-black pl-3 pb-0.5">
                                account Checked.)
                            </td>
                        </tr>

                        {/* Row 53: Clerk & Accountant */}
                        <tr className="border-t border-black">
                            <td colSpan={2} className="font-bold text-center border-l border-b border-black pt-2 pb-1 text-xs">
                                Clerk
                            </td>
                            <td colSpan={2} className="border-b border-black"></td>
                            <td colSpan={2} className="font-bold text-center border-r border-b border-black pt-2 pb-1 text-xs">
                                Accountant
                            </td>
                        </tr>
                    </tbody>
                </table>
            </main>

            <style jsx global>{`
                @page {
                    size: A4 portrait;
                    margin: 4mm 5mm;
                }
                @media print {
                    html, body {
                        width: 100% !important;
                        height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        color: black !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print { display: none !important; }
                    #bill-print-area {
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        max-width: 100% !important;
                        width: 100% !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    table {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        width: 100% !important;
                    }
                    tr {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                }
            `}</style>
        </div>
    );
}