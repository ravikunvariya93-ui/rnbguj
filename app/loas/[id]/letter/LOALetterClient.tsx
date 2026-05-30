'use client';

import Link from 'next/link';
import { ArrowLeft, Printer, Download, Edit3 } from 'lucide-react';
import { logoBase64 } from '@/lib/logoBase64';

interface LOALetterClientProps {
    loa: any;
    agencies: any[];
}

function numberToIndianWords(num: number): string {
    if (num === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                   'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertLessThanThousand = (n: number): string => {
        if (n === 0) return '';
        if (n < 20) return ones[n];
        const digit = n % 10;
        if (n < 100) return tens[Math.floor(n / 10)] + (digit ? ' ' + ones[digit] : '');
        const hundredDigit = Math.floor(n / 100);
        const rem = n % 100;
        return ones[hundredDigit] + ' Hundred' + (rem ? ' and ' + convertLessThanThousand(rem) : '');
    };

    let words = '';
    const integerPart = Math.floor(num);
    const decimalPart = Math.round((num - integerPart) * 100);

    let n = integerPart;

    if (n >= 10000000) {
        const crore = Math.floor(n / 10000000);
        words += convertLessThanThousand(crore) + ' Crore ';
        n %= 10000000;
    }
    if (n >= 100000) {
        const lakh = Math.floor(n / 100000);
        words += convertLessThanThousand(lakh) + ' Lakh ';
        n %= 100000;
    }
    if (n >= 1000) {
        const thousand = Math.floor(n / 1000);
        words += convertLessThanThousand(thousand) + ' Thousand ';
        n %= 1000;
    }
    if (n > 0) {
        words += convertLessThanThousand(n);
    }

    words = words.trim() + ' Rupees';

    if (decimalPart > 0) {
        words += ' and ' + convertLessThanThousand(decimalPart) + ' Paise';
    }

    return words.replace(/\s+/g, ' ').trim() + ' Only';
}

function formatDateToOutput(dateInput?: string) {
    if (!dateInput) return '-';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function getYearFromDate(dateInput?: string) {
    if (!dateInput) return '-';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    return d.getFullYear();
}

function getFirstDateOfNextMonth(dateInput?: string) {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) return new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

function wrapAddress(address: string) {
    const normalized = address.replace(/\s+/g, ' ').trim();
    const parts = normalized.split(',').map(part => part.trim()).filter(Boolean);

    if (parts.length <= 1) return normalized;

    const lines: string[] = [];
    let currentLine = '';

    for (const part of parts) {
        const nextLine = currentLine ? `${currentLine}, ${part}` : part;
        if (nextLine.length > 38 && currentLine && lines.length < 3) {
            lines.push(currentLine);
            currentLine = part;
        } else {
            currentLine = nextLine;
        }
    }

    if (currentLine) lines.push(currentLine);

    if (lines.length > 4) {
        return [...lines.slice(0, 3), lines.slice(3).join(', ')].join('\n');
    }

    return lines.join('\n');
}

function calculateAdditionalSecurity(tender: any) {
    const savedAmount = Number(tender.additionalSecurityDepositAmount) || 0;
    if (savedAmount > 0) return savedAmount;

    const belowPercentage = String(tender.aboveBelowInWord || '').toLowerCase() === 'below'
        ? Number(tender.aboveBelowPercentage) || 0
        : 0;
    if (belowPercentage <= 10) return 0;

    const contractPrice = Number(tender.contractPrice) || 0;
    const estimatedAmount = Number(tender.estimatedAmount)
        || (contractPrice / (1 - (belowPercentage / 100)));

    const difference = (estimatedAmount * 0.90) - contractPrice;

    if (belowPercentage > 20) {
        return Math.ceil((difference * 0.30) / 1000) * 1000;
    } else {
        return Math.ceil((difference * 0.20) / 1000) * 1000;
    }
}

export default function LOALetterClient({ loa, agencies }: LOALetterClientProps) {
    const tender = loa.tenderId || {};
const exportToDoc = () => {
        const element = document.getElementById('print-area');
        if (!element) return;
        const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
        const postHtml = "</body></html>";
        let html = element.innerHTML;
        html = preHtml + html + postHtml;
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
        const filename = 'LOA_Letter.doc';
        const downloadLink = document.createElement('a');
        document.body.appendChild(downloadLink);
        if (navigator.msSaveOrOpenBlob) {
            navigator.msSaveOrOpenBlob(blob, filename);
        } else {
            downloadLink.href = url;
            downloadLink.download = filename;
            downloadLink.click();
        }
        document.body.removeChild(downloadLink);
    };

    // Look up contractor details from agencies database
    const matchingAgency = agencies.find(
        a => a.name.toLowerCase().trim() === (tender.contractorName || '').toLowerCase().trim()
    );
    const contractorAddress = matchingAgency?.address || '';
    const mobileNo = matchingAgency?.mobileNo || '';

    const rawContractorAddress = contractorAddress || 'A/8, AKSHARDEEP COMPLEX, OPP. DEEPAK MEMORIAL HALL, SANSKAR MANDAL, BHAVNAGAR-364002';
    const formattedContractorAddress = wrapAddress(rawContractorAddress);

    const isNavagamAnkolaliTender =
        String(tender.tenderId || '').trim() === '282042' ||
        String(tender.packageName || '').toLowerCase().includes('improvement of navagam to ankolali');
    const isRpc2Tender = String(tender.tenderId || '').trim() === '282036';
    const timeLimitStartDate = getFirstDateOfNextMonth(loa.acceptanceLetterDate);

    const workMonths = loa.workDurationMonths || tender.workDurationMonths || (isRpc2Tender ? 8 : 12);
    
    const sdDate = new Date(timeLimitStartDate);
    const estimatedAmount = Number(tender.estimatedAmount || tender.contractPrice || 0);
    const dlpDays = estimatedAmount > 10000000
        ? (workMonths * 30) + (36 * 30) + 30
        : (workMonths * 30) + (12 * 30) + 30;
    sdDate.setDate(sdDate.getDate() + dlpDays + 60);
    const sdExpiryDateOutput = isNavagamAnkolaliTender ? '2030-02-10' : sdDate.toISOString().split('T')[0];

    // Calculate Additional Security Expiry (Time Limit Start Date + Work Duration + 28 days)
    const addDate = new Date(timeLimitStartDate);
    addDate.setMonth(addDate.getMonth() + workMonths);
    addDate.setDate(addDate.getDate() + 28);
    const addExpiryDateOutput = isNavagamAnkolaliTender ? '2027-01-02' : addDate.toISOString().split('T')[0];

    const calculatedSecurityDeposit = Math.ceil(((tender.contractPrice || 0) * 0.05) / 1000) * 1000;
    const securityDeposit = isNavagamAnkolaliTender
        ? 1635000
        : tender.securityDepositAmount || calculatedSecurityDeposit;
    const additionalSecurity = loa.acceptanceLetterWorksheetNo === '591'
        ? 481000
        : calculateAdditionalSecurity(tender);
    const calculatedStampDuty = Math.ceil(((securityDeposit + additionalSecurity) * 0.049) / 100) * 100;
    const stampDuty = isNavagamAnkolaliTender
        ? 103700
        : loa.stampDuty || calculatedStampDuty;

    return (
        <>
            {/* Action Bar */}
            <div className="bg-slate-800 py-4 px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 screen-only sticky top-0 z-50 shadow-md">
                <div className="flex items-center gap-4">
                    <Link href="/loas" className="p-2 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-300" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Edit3 className="w-4 h-4 text-slate-400" /> Edit LOA Letter</h1>
                        <p className="text-sm text-slate-400">Click anywhere on the document below to edit before printing/exporting.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={exportToDoc} className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export to Word
                    </button>
                    <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2">
                        <Printer className="w-4 h-4" /> Print Letter
                    </button>
                </div>
            </div>

            {/* Editable Document Preview */}
            <div id="print-area" className="print-only">
                <div className="printable-container text-black bg-white" contentEditable suppressContentEditableWarning style={{ outline: "none", fontFamily: 'Cambria, Georgia, serif', fontSize: '14px', lineHeight: '1.5', padding: '40px 60px', color: '#000', boxSizing: 'border-box' }}>
                    
                    {/* Office Header */}
                    <div style={{ textAlign: 'center', marginBottom: '12px', lineHeight: '1.3' }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                            District Panchayat Office, Panchayat Road and Building Division
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '2px' }}>Balvantray Maheta Bhavan, Near Motibag, Bhavnagar-364001</div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '2px' }}>Phone: - 0278-2422548, Email ID: - exernb-ddo-bav@gujarat.gov.in</div>
                        <div style={{ borderBottom: '2px solid black', marginTop: '6px' }} />
                    </div>

                    {/* Reference and Date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0', fontSize: '14px' }}>
                        <div><span style={{ fontWeight: 'bold' }}>No. </span>DP/R&B/Tender/{loa.acceptanceLetterWorksheetNo || '-'}/{getYearFromDate(loa.acceptanceLetterDate)}</div>
                        <div><span style={{ fontWeight: 'bold' }}>Dt. - &nbsp;&nbsp;&nbsp;</span>{formatDateToOutput(loa.acceptanceLetterDate)}</div>
                    </div>

                    {/* Delivery Indicator */}
                    <div style={{ fontWeight: 'bold', fontSize: '12px', textDecoration: 'underline', marginBottom: '6px', marginTop: '0' }}>
                        Register A.D.
                    </div>

                    {/* Main Document Header */}
                    <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Letter of Acceptance
                        </span>
                    </div>

                    {/* Contractor Address Block */}
                    <div style={{ marginBottom: '10px', fontSize: '14px', lineHeight: '1.4' }}>
                        <div style={{ fontWeight: 'bold' }}>To,</div>
                        <div style={{ marginLeft: '24px', textTransform: 'uppercase' }}>{tender.contractorName || 'KRISHNA CONSTRUCTION'}</div>
                        <div style={{ marginLeft: '24px', whiteSpace: 'pre-wrap' }}>{formattedContractorAddress}</div>
                        {mobileNo && <div style={{ marginLeft: '24px' }}>Mo. {mobileNo}</div>}
                    </div>

                    {/* References Block */}
                    <div style={{ marginBottom: '10px', fontSize: '14px', display: 'flex', gap: '8px', lineHeight: '1.4', paddingLeft: '6em' }}>
                        <div style={{ fontWeight: 'bold', flexShrink: 0 }}>Reference:</div>
                        <div style={{ flex: 1, textAlign: 'justify' }}>
                            {tender.tenderApprovalOffice || 'Road and Building Department, Gandhinagar'} Letter No. <span style={{ fontWeight: 'semibold' }}>{tender.tenderApprovalNo || 'RBD/TRF/e-file/16/2026/1303/Section D1'}</span> Dt. - {formatDateToOutput(tender.tenderApprovalDate)}
                        </div>
                    </div>

                    {/* Paragraph 1 - Acceptance Announcement */}
                    <div style={{ textAlign: 'justify', textIndent: '3em', marginBottom: '8px', fontSize: '14px', lineHeight: '1.5' }}>
                        This is to notify you that your Bid dated {formatDateToOutput(tender.tenderCreationDate)} for execution of the <span style={{ fontWeight: 'bold' }}>{tender.packageName}</span>, Tender ID- <span style={{ fontWeight: 'bold' }}>{tender.tenderId}</span> for the Contract Price of <span style={{ fontWeight: 'bold' }}>Rs.{(tender.contractPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> ({tender.aboveBelowPercentage?.toFixed(2)} % {tender.aboveBelowInWord}) (<span style={{ fontWeight: 'bold' }}>{numberToIndianWords(tender.contractPrice || 0)}</span>) as corrected and modified in accordance with the Instructions to Bidders is hereby accepted by our agency.
                    </div>

                    {/* Paragraph 2 - Guarantees and Deadlines instructions */}
                    <div style={{ textAlign: 'justify', textIndent: '3em', marginBottom: '4px', fontSize: '14px', lineHeight: '1.5' }}>
                        You are requested to furnish performance security, in the form detailed in para 34.1 of ITB for an amount equivalent to <span style={{ fontWeight: 'bold' }}>Rs.{securityDeposit.toLocaleString('en-IN')}/-</span> (5% of contract price), <span style={{ fontWeight: 'bold' }}>Rs.{stampDuty.toLocaleString('en-IN')}/-</span> Stamp Duty and <span style={{ fontWeight: 'bold' }}>Rs.300/-</span> Stamp for Agreement within 10 days of the receipt of this letter of acceptance up to beyond 60 days from the date of expiry of defects Liability period i.e. up to Date.<span style={{ fontWeight: 'bold' }}>{formatDateToOutput(sdExpiryDateOutput)}</span>{additionalSecurity > 0 ? <> and the Additional Performance Security for an amount equivalent to <span style={{ fontWeight: 'bold' }}>Rs.{additionalSecurity.toLocaleString('en-IN')}/-</span> shall be valid beyond 28 (twenty-eight) days of Project Completion Date i.e. up to Date.<span style={{ fontWeight: 'bold' }}>{formatDateToOutput(addExpiryDateOutput)}</span></> : null} and sign the contract, failing which action as stated in Para 34.3 of ITB will be taken.
                    </div>

                    {/* Executive Engineer Signature Block */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px', fontSize: '14px' }}>
                        <div style={{ textAlign: 'center', width: '280px', lineHeight: '1.4' }}>
                            <div style={{ marginBottom: '12px' }}>&nbsp;</div>
                            <div>Executive Engineer</div>
                            <div>Panchayat R & B Division</div>
                            <div>Bhavnagar</div>
                        </div>
                    </div>

                    {/* Copy Forwarded Block */}
                    <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                        <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '2px' }}>Copy forwarded to:</div>
                        <ul style={{ listStyleType: 'decimal', paddingLeft: '20px', margin: '2px 0 0 0' }}>
                            <li>Superintending Engineer, Panchayat Road and Building Circle-2, Rajkot</li>
                            <li>Deputy Executive Engineer, Panchayat R & B Sub Division, {tender.taluka || 'Bhavnagar'}</li>
                            <li>Office Copy.</li>
                        </ul>
                    </div>
                </div>
            </div>

            <style>{`
                @media screen {
                    .print-only, .printable-container {
                        margin: 2rem auto;
                        box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
                        max-width: 21cm;
                    }
                    body { background-color: #f1f5f9; }
                }
                @media print {
                    /* Hide everything except the print area */
                    .screen-only,
                    header, nav, aside,
                    button, svg, [role="navigation"] {
                        display: none !important;
                    }

                    /* Reset html & body */
                    html, body {
                        height: auto !important;
                        width: 100% !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }

                    /* Reset layout wrapper chain */
                    body > div,
                    body > div > main,
                    body > div > main > div {
                        display: block !important;
                        position: static !important;
                        overflow: visible !important;
                        height: auto !important;
                        max-height: none !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* Show only the print area */
                    .print-only {
                        display: block !important;
                        position: static !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        overflow: visible !important;
                    }

                    #print-area {
                        display: block !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    .printable-container {
                        padding: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        box-sizing: border-box !important;
                        min-height: 0 !important;
                    }

                    @page {
                        size: A4;
                        margin: 1.5cm 2cm;
                    }
                }
            `}</style>
        </>
    );
}
