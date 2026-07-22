'use client';

import Link from 'next/link';
import { ArrowLeft, Printer, Download, Edit3 } from 'lucide-react';
import { useEffect } from 'react';

interface WorkOrderLetterClientProps {
    packageData: any;
    tender: any;
    loa: any;
    workOrder: any;
    agency: any;
    budgetHeads: string[];
    approval: any;
    dtp: any;
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

export default function WorkOrderLetterClient({
    packageData,
    tender,
    loa,
    workOrder,
    agency,
    budgetHeads,
    approval,
    dtp
}: WorkOrderLetterClientProps) {
    
    const exportToDoc = () => {
        const element = document.getElementById('print-area');
        if (!element) return;
        const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
        const postHtml = "</body></html>";
        let html = element.innerHTML;
        html = preHtml + html + postHtml;
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
        const filename = 'Work_Order.doc';
        const downloadLink = document.createElement('a');
        document.body.appendChild(downloadLink);
        if ((navigator as any).msSaveOrOpenBlob) {
            (navigator as any).msSaveOrOpenBlob(blob, filename);
        } else {
            downloadLink.href = url;
            downloadLink.download = filename;
            downloadLink.click();
        }
        document.body.removeChild(downloadLink);
    };

    // Add/remove wo-printing class on body so print CSS is scoped only to this page
    useEffect(() => {
        const onBefore = () => document.body.classList.add('wo-printing');
        const onAfter = () => document.body.classList.remove('wo-printing');
        window.addEventListener('beforeprint', onBefore);
        window.addEventListener('afterprint', onAfter);
        return () => {
            window.removeEventListener('beforeprint', onBefore);
            window.removeEventListener('afterprint', onAfter);
            document.body.classList.remove('wo-printing');
        };
    }, []);

    // Prep variables
    const rawContractorAddress = agency?.address || '';
    const formattedContractorAddress = wrapAddress(rawContractorAddress);
    const mobileNo = agency?.mobileNo || '';

    const workNames = packageData.works ? packageData.works.map((w: any) => w.workName) : [];
    const workNamesList = workNames.length > 0 ? workNames.join(' and ') : packageData.packageName;

    const workOrderNo = workOrder.workOrderWorksheetNo || '-';
    const workOrderDateStr = formatDateToOutput(workOrder.workOrderDate);
    const timeLimitStartsStr = formatDateToOutput(workOrder.timeLimitStartsFrom);

    const estAmount = (dtp?.tenderAmount !== undefined && dtp?.tenderAmount !== null) ? dtp.tenderAmount : tender.estimatedAmount;
    const estAmountFormatted = estAmount 
        ? estAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '-';
    const contractPriceFormatted = tender.contractPrice
        ? tender.contractPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '-';

    const aboveBelowRate = tender.aboveBelowPercentage !== undefined
        ? `${tender.aboveBelowPercentage}% ${tender.aboveBelowInWord || ''}`
        : '-';

    const budgetHeadStr = budgetHeads.length > 0 ? budgetHeads.join(', ') : '-';
    const subDivision = packageData.subDivision || '-';

    // Security Deposit details
    const sdBank = workOrder.securityDepositBankName || '-';
    const sdNo = `${workOrder.securityDepositType || 'FDR'}: ${workOrder.securityDepositNumber || '-'}`;
    const sdAmount = workOrder.securityDepositAmount 
        ? `${workOrder.securityDepositAmount.toLocaleString('en-IN')}/-` 
        : '-';
    const sdDate = formatDateToOutput(workOrder.securityDepositDate);

    // Additional Security Deposit details
    const showASD = workOrder.additionalSecurityDepositAmount > 0;
    const asdBank = workOrder.additionalSecurityDepositBankName || '-';
    const asdNo = `${workOrder.additionalSecurityDepositType || 'FDR'}: ${workOrder.additionalSecurityDepositNumber || '-'}`;
    const asdAmount = workOrder.additionalSecurityDepositAmount
        ? `${workOrder.additionalSecurityDepositAmount.toLocaleString('en-IN')}/-`
        : '-';
    const asdDate = formatDateToOutput(workOrder.additionalSecurityDepositDate);

    const agreementDetails = workOrder.agreementNo && workOrder.agreementYear
        ? `${workOrder.agreementNo} of ${workOrder.agreementYear}`
        : '-';

    return (
        <>
            {/* Action Bar */}
            <div className="bg-slate-800 py-4 px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 screen-only sticky top-0 z-50 shadow-md">
                <div className="flex items-center gap-4">
                    <Link href={`/packages/${packageData._id}`} className="p-2 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-300" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            <Edit3 className="w-4 h-4 text-slate-400" /> Print Work Order
                        </h1>
                        <p className="text-sm text-slate-400">Click anywhere on the document below to edit before printing/exporting.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={exportToDoc} className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export to Word
                    </button>
                    <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2">
                        <Printer className="w-4 h-4" /> Print Document
                    </button>
                </div>
            </div>

            {/* Editable Document Preview */}
            <div id="print-area" className="print-only">
                <div className="printable-container text-black bg-white" contentEditable suppressContentEditableWarning style={{ outline: "none", fontFamily: 'Cambria, Georgia, serif', fontSize: '14px', lineHeight: '1.5', padding: '40px 60px', color: '#000', boxSizing: 'border-box' }}>
                    
                    {/* Office Header */}
                    <div className="wo-header" style={{ textAlign: 'center', marginBottom: '12px', lineHeight: '1.3' }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                            District Panchayat Office, Panchayat Road and Building Division
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '2px' }}>Balvantray Maheta Bhavan, Near Motibag, Bhavnagar-364001</div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '2px' }}>Phone: - 0278-2422548, Email ID: - exernb-ddo-bav@gujarat.gov.in</div>
                        <div style={{ borderBottom: '2px solid black', marginTop: '6px' }} />
                    </div>

                    {/* Reference and Date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0', fontSize: '14px' }}>
                        <div><span style={{ fontWeight: 'bold' }}>No. </span>DP/R&B/Tender/{workOrderNo}/{getYearFromDate(workOrder.workOrderDate)}</div>
                        <div><span style={{ fontWeight: 'bold' }}>Dt. - &nbsp;&nbsp;&nbsp;</span>{workOrderDateStr}</div>
                    </div>

                    {/* Delivery Indicator */}
                    <div className="wo-delivery" style={{ fontWeight: 'bold', fontSize: '12px', textDecoration: 'underline', marginBottom: '6px', marginTop: '0' }}>
                        Register A.D.
                    </div>

                    {/* Main Document Header */}
                    <div className="wo-doc-header" style={{ textAlign: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Issue of Notice to proceed with the work
                        </span>
                    </div>

                    {/* Contractor Address Block */}
                    <div className="wo-contractor" style={{ marginBottom: '10px', fontSize: '14px', lineHeight: '1.4' }}>
                        <div style={{ fontWeight: 'bold' }}>To,</div>
                        <div style={{ marginLeft: '24px', textTransform: 'uppercase' }}>{tender.contractorName || '-'}</div>
                        <div style={{ marginLeft: '24px', whiteSpace: 'pre-wrap' }}>{formattedContractorAddress}</div>
                        {mobileNo && <div style={{ marginLeft: '24px' }}>Mo. {mobileNo}</div>}
                    </div>

                    {/* Subject Line */}
                    <div className="wo-subject" style={{ marginBottom: '10px', fontSize: '14px', display: 'flex', gap: '8px', lineHeight: '1.4', paddingLeft: '3em' }}>
                        <div style={{ fontWeight: 'bold', flexShrink: 0, width: '90px' }}>Subject: -</div>
                        <div style={{ flex: 1, textTransform: 'uppercase', fontWeight: 'bold' }}>
                            {packageData.packageName}
                        </div>
                    </div>

                    {/* References Block */}
                    <div className="wo-references" style={{ marginBottom: '10px', fontSize: '14px', display: 'flex', gap: '8px', lineHeight: '1.4', paddingLeft: '3em' }}>
                        <div style={{ fontWeight: 'bold', flexShrink: 0, width: '90px' }}>Reference: -</div>
                        <div style={{ flex: 1, textAlign: 'justify' }}>
                            {loa && (
                                <div style={{ marginBottom: '4px' }}>
                                    1. Our Office Letter No. DP/R&B/Tender/{loa.acceptanceLetterWorksheetNo || '-'}/{getYearFromDate(loa.acceptanceLetterDate)} Dt. - {formatDateToOutput(loa.acceptanceLetterDate)}
                                </div>
                            )}
                            {approval && (
                                <div>
                                    2. {approval.tenderApprovalOffice || tender.tenderApprovalOffice || 'Road and Building Department'} Letter No. {approval.tenderApprovalNo || tender.tenderApprovalNo || '-'} Dt. - {formatDateToOutput(approval.tenderApprovalDate || tender.tenderApprovalDate)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Paragraph 1 - Acceptance Announcement */}
                    <div className="wo-para" style={{ textAlign: 'justify', textIndent: '3em', marginBottom: '8px', fontSize: '14px', lineHeight: '1.5' }}>
                        Pursuant to your furnishing the requisite security in ITB Clause 34.1 and signing of the Contract for the <span style={{ fontWeight: 'bold' }}>{packageData.packageName}</span> (estimated price Rs. <span style={{ fontWeight: 'bold' }}>{estAmountFormatted}</span>) at bid Price of Rs. <span style={{ fontWeight: 'bold' }}>{contractPriceFormatted}</span> (<span style={{ fontWeight: 'bold' }}>{aboveBelowRate}</span>).
                    </div>

                    {/* Paragraph 2 - Guarantees and Deadlines instructions */}
                    <div className="wo-para" style={{ textAlign: 'justify', textIndent: '3em', marginBottom: '4px', fontSize: '14px', lineHeight: '1.5' }}>
                        You are hereby instructed to proceed with the execution of the said works in accordance with the contract documents. Time Limit starts from Dt. <span style={{ fontWeight: 'bold' }}>{timeLimitStartsStr}</span> and valid for <span style={{ fontWeight: 'bold' }}>{workOrder.workDurationMonths || loa?.workDurationMonths || '-'}</span> months.
                    </div>

                    {/* Security Deposit Table */}
                    <div className="wo-section" style={{ marginBottom: '12px', fontSize: '14px', marginTop: '12px' }}>
                        <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '6px', textTransform: 'uppercase', fontSize: '12px' }}>Security Deposit Details:</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f9fafb' }}>
                                    <th style={{ border: '1px solid black', padding: '6px 12px', textAlign: 'left', fontWeight: 'bold' }}>Bank Name</th>
                                    <th style={{ border: '1px solid black', padding: '6px 12px', textAlign: 'left', fontWeight: 'bold' }}>FDR/BG Number</th>
                                    <th style={{ border: '1px solid black', padding: '6px 12px', textAlign: 'right', fontWeight: 'bold' }}>FDR/BG Amount</th>
                                    <th style={{ border: '1px solid black', padding: '6px 12px', textAlign: 'center', fontWeight: 'bold' }}>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ border: '1px solid black', padding: '6px 12px' }}>{sdBank}</td>
                                    <td style={{ border: '1px solid black', padding: '6px 12px', fontFamily: 'monospace' }}>{sdNo}</td>
                                    <td style={{ border: '1px solid black', padding: '6px 12px', textAlign: 'right', fontWeight: 'bold' }}>₹{sdAmount}</td>
                                    <td style={{ border: '1px solid black', padding: '6px 12px', textAlign: 'center' }}>{sdDate}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Additional Security Deposit Table */}
                    {showASD && (
                        <div className="wo-section" style={{ marginBottom: '12px', fontSize: '14px', marginTop: '12px' }}>
                            <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '6px', textTransform: 'uppercase', fontSize: '12px' }}>Additional Security Deposit Details:</div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '12px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f9fafb' }}>
                                        <th style={{ border: '1px solid black', padding: '6px 12px', textAlign: 'left', fontWeight: 'bold' }}>Bank Name</th>
                                        <th style={{ border: '1px solid black', padding: '6px 12px', textAlign: 'left', fontWeight: 'bold' }}>FDR/BG Number</th>
                                        <th style={{ border: '1px solid black', padding: '6px 12px', textAlign: 'right', fontWeight: 'bold' }}>FDR/BG Amount</th>
                                        <th style={{ border: '1px solid black', padding: '6px 12px', textAlign: 'center', fontWeight: 'bold' }}>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ border: '1px solid black', padding: '6px 12px' }}>{asdBank}</td>
                                        <td style={{ border: '1px solid black', padding: '6px 12px', fontFamily: 'monospace' }}>{asdNo}</td>
                                        <td style={{ border: '1px solid black', padding: '6px 12px', textAlign: 'right', fontWeight: 'bold' }}>₹{asdAmount}</td>
                                        <td style={{ border: '1px solid black', padding: '6px 12px', textAlign: 'center' }}>{asdDate}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Agreement & Budget Info */}
                    <div className="wo-section" style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.4', marginTop: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ fontWeight: 'bold' }}>Agreement Details:</span>
                            <span>Agreement No. {agreementDetails}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                            <span style={{ fontWeight: 'bold' }}>Budget Head:</span>
                            <span>{budgetHeadStr}</span>
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div className="wo-section" style={{ marginBottom: '12px', fontSize: '12px', color: '#333', lineHeight: '1.4', display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <span style={{ fontWeight: 'bold' }}>Note: -</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div>(1) As Per SBD Clause No-48 Para-25 The Retention Money Shall Be Deducted 6% From Each Bill Subjected to Maximum Of 5% Of Final Contract Price.</div>
                            <div>(2) Bills will be paid within the limits of available grants.</div>
                        </div>
                    </div>

                    {/* Executive Engineer Signature Block */}
                    <div className="wo-sig-section" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px', fontSize: '14px', marginTop: '12px' }}>
                        <div style={{ textAlign: 'center', width: '280px', lineHeight: '1.4' }}>
                            <div style={{ marginBottom: '12px' }}>&nbsp;</div>
                            <div>Executive Engineer</div>
                            <div>Panchayat R & B Division</div>
                            <div>Bhavnagar</div>
                        </div>
                    </div>

                    {/* Copy Forwarded Block */}
                    <div className="wo-copy-section" style={{ fontSize: '12px', lineHeight: '1.4', borderTop: '1px solid #ccc', paddingTop: '10px', marginTop: '10px' }}>
                        <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '2px' }}>Copy forwarded with respect to:</div>
                        <ul style={{ listStyleType: 'decimal', paddingLeft: '20px', margin: '2px 0 6px 0' }}>
                            <li>Superintending Engineer, Panchayat Road and Building Circle-2, Rajkot.</li>
                            <li>Executive Engineer, Quality control (R&B), Bahumali Bhavan, Bhavnagar.</li>
                        </ul>
                        <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '2px' }}>Copy forwarded to:</div>
                        <ul style={{ listStyleType: 'decimal', paddingLeft: '20px', margin: '2px 0 0 0' }}>
                            <li>Deputy Executive Engineer, Panchayat R & B Sub Division, <span style={{ fontWeight: 'semibold' }}>{subDivision}</span> for information & necessary action.</li>
                            <li>Divisional Accountant/ Work Branch/ P.B. Branch.</li>
                            <li>Geological Officer, Geological’s Office, Collector Office Bhavnagar.</li>
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
                    /* Only apply when on this specific print page */
                    body.wo-printing *,
                    body.wo-printing *::before,
                    body.wo-printing *::after {
                        height: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        overflow: visible !important;
                    }

                    body.wo-printing {
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }

                    body.wo-printing .screen-only,
                    body.wo-printing header,
                    body.wo-printing nav,
                    body.wo-printing aside,
                    body.wo-printing button,
                    body.wo-printing svg,
                    body.wo-printing [role="navigation"] {
                        display: none !important;
                    }

                    body.wo-printing .print-only {
                        display: block !important;
                        position: static !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }

                    body.wo-printing #print-area {
                        display: block !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    body.wo-printing .printable-container {
                        padding: 0.8cm 1.2cm !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        box-sizing: border-box !important;
                        font-size: 13px !important;
                        line-height: 1.35 !important;
                    }

                    body.wo-printing .printable-container div,
                    body.wo-printing .printable-container span,
                    body.wo-printing .printable-container td,
                    body.wo-printing .printable-container th,
                    body.wo-printing .printable-container li {
                        font-size: 13px !important;
                    }

                    body.wo-printing .wo-header div { font-size: 11px !important; }
                    body.wo-printing .wo-header div:first-child { font-size: 14px !important; }
                    body.wo-printing .wo-header div:nth-child(2) { font-size: 12px !important; }
                    body.wo-printing .wo-doc-header span { font-size: 14px !important; }

                    body.wo-printing .wo-header,
                    body.wo-printing .wo-delivery,
                    body.wo-printing .wo-doc-header,
                    body.wo-printing .wo-contractor,
                    body.wo-printing .wo-subject,
                    body.wo-printing .wo-references,
                    body.wo-printing .wo-para,
                    body.wo-printing .wo-section,
                    body.wo-printing .wo-sig-section,
                    body.wo-printing .wo-copy-section {
                        margin-top: 3px !important;
                        margin-bottom: 3px !important;
                    }
                    body.wo-printing .wo-header { margin-bottom: 6px !important; }
                    body.wo-printing .wo-contractor { margin-bottom: 6px !important; }
                    body.wo-printing .wo-sig-section { margin-top: 15px !important; margin-bottom: 3px !important; }
                    body.wo-printing .wo-copy-section { margin-top: 6px !important; padding-top: 3px !important; }

                    @page {
                        size: A4;
                        margin: 0 !important;
                    }
                }
            `}</style>

        </>
    );
}
