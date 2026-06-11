'use client';

import Link from 'next/link';
import { ArrowLeft, Printer, Download, Edit3 } from 'lucide-react';
import { useEffect } from 'react';

interface LOALetterClientProps {
    packageData: any;
    tender: any;
    loa: any;
    workOrder: any;
    agency: any;
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
    if (!dateInput) return new Date().getFullYear().toString();
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return new Date().getFullYear().toString();
    return d.getFullYear().toString();
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

export default function LOALetterClient({
    packageData,
    tender,
    loa,
    workOrder,
    agency,
    approval,
    dtp
}: LOALetterClientProps) {

    const exportToDoc = () => {
        const element = document.getElementById('print-area');
        if (!element) return;
        const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
        const postHtml = "</body></html>";
        let html = element.innerHTML;
        html = preHtml + html + postHtml;
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
        const filename = 'Letter_of_Acceptance.doc';
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

    // Add/remove loa-printing class on body so print CSS is scoped only to this page
    useEffect(() => {
        const onBefore = () => document.body.classList.add('loa-printing');
        const onAfter = () => document.body.classList.remove('loa-printing');
        window.addEventListener('beforeprint', onBefore);
        window.addEventListener('afterprint', onAfter);
        return () => {
            window.removeEventListener('beforeprint', onBefore);
            window.removeEventListener('afterprint', onAfter);
            document.body.classList.remove('loa-printing');
        };
    }, []);

    // Prep variables
    const rawContractorAddress = agency?.address || '';
    const formattedContractorAddress = wrapAddress(rawContractorAddress);
    const mobileNo = agency?.mobileNo || '';

    const loaNo = loa.acceptanceLetterWorksheetNo || '-';
    const loaDateStr = formatDateToOutput(loa.acceptanceLetterDate);

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

    const subDivision = packageData.subDivision || '-';

    // Calculate Security Deposit (5% of Contract Price) or fall back to workOrder value
    const sdAmountVal = workOrder?.securityDepositAmount || (tender.contractPrice ? (tender.contractPrice * 0.05) : 0);
    const sdAmountFormatted = sdAmountVal
        ? sdAmountVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '-';

    const stampDutyFormatted = loa.stampDuty
        ? loa.stampDuty.toLocaleString('en-IN')
        : '-';

    const workDurationMonths = loa.workDurationMonths || tender.workDurationMonths || '-';

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
                            <Edit3 className="w-4 h-4 text-slate-400" /> Print Letter of Acceptance (LOA)
                        </h1>
                        <p className="text-sm text-slate-400">Click anywhere on the document below to edit before printing/exporting.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={exportToDoc} className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 cursor-pointer">
                        <Download className="w-4 h-4" /> Export to Word
                    </button>
                    <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 cursor-pointer">
                        <Printer className="w-4 h-4" /> Print Document
                    </button>
                </div>
            </div>

            {/* Editable Document Preview */}
            <div id="print-area" className="print-only">
                <div className="printable-container text-black bg-white" contentEditable suppressContentEditableWarning style={{ outline: "none", fontFamily: 'Cambria, Georgia, serif', fontSize: '14px', lineHeight: '1.5', padding: '40px 60px', color: '#000', boxSizing: 'border-box' }}>
                    
                    {/* Office Header */}
                    <div className="loa-header" style={{ textAlign: 'center', marginBottom: '12px', lineHeight: '1.3' }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                            District Panchayat Office, Panchayat Road and Building Division
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '2px' }}>Balvantray Maheta Bhavan, Near Motibag, Bhavnagar-364001</div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '2px' }}>Phone: - 0278-2422548, Email ID: - exernb-ddo-bav@gujarat.gov.in</div>
                        <div style={{ borderBottom: '2px solid black', marginTop: '6px' }} />
                    </div>

                    {/* Reference and Date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0', fontSize: '14px' }}>
                        <div><span style={{ fontWeight: 'bold' }}>No. </span>DP/R&B/Tender/{loaNo}/{getYearFromDate(loa.acceptanceLetterDate)}</div>
                        <div><span style={{ fontWeight: 'bold' }}>Dt. - &nbsp;&nbsp;&nbsp;</span>{loaDateStr}</div>
                    </div>

                    {/* Delivery Indicator */}
                    <div className="loa-delivery" style={{ fontWeight: 'bold', fontSize: '12px', textDecoration: 'underline', marginBottom: '6px', marginTop: '0' }}>
                        Register A.D.
                    </div>

                    {/* Main Document Header */}
                    <div className="loa-doc-header" style={{ textAlign: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Letter of Acceptance
                        </span>
                    </div>

                    {/* Contractor Address Block */}
                    <div className="loa-contractor" style={{ marginBottom: '10px', fontSize: '14px', lineHeight: '1.4' }}>
                        <div style={{ fontWeight: 'bold' }}>To,</div>
                        <div style={{ marginLeft: '24px', textTransform: 'uppercase' }}>{tender.contractorName || '-'}</div>
                        <div style={{ marginLeft: '24px', whiteSpace: 'pre-wrap' }}>{formattedContractorAddress}</div>
                        {mobileNo && <div style={{ marginLeft: '24px' }}>Mo. {mobileNo}</div>}
                    </div>

                    {/* Subject Line */}
                    <div className="loa-subject" style={{ marginBottom: '10px', fontSize: '14px', display: 'flex', gap: '8px', lineHeight: '1.4', paddingLeft: '3em' }}>
                        <div style={{ fontWeight: 'bold', flexShrink: 0, width: '90px' }}>Subject: -</div>
                        <div style={{ flex: 1, textTransform: 'uppercase', fontWeight: 'bold' }}>
                            Acceptance of Tender for the work of: {packageData.packageName}
                        </div>
                    </div>

                    {/* References Block */}
                    <div className="loa-references" style={{ marginBottom: '10px', fontSize: '14px', display: 'flex', gap: '8px', lineHeight: '1.4', paddingLeft: '3em' }}>
                        <div style={{ fontWeight: 'bold', flexShrink: 0, width: '90px' }}>Reference: -</div>
                        <div style={{ flex: 1, textAlign: 'justify' }}>
                            <div style={{ marginBottom: '4px' }}>
                                1. Tender Notice No. {tender.noticeNo || '-'} (Sr. No. {tender.srNo || '-'}) Dt. - {formatDateToOutput(tender.tenderCreationDate)}
                            </div>
                            {approval && (
                                <div>
                                    2. Superintending Engineer, Panchayat Road and Building Circle-2, Rajkot Letter No. {approval.tenderApprovalNo || tender.tenderApprovalNo || '-'} Dt. - {formatDateToOutput(approval.tenderApprovalDate || tender.tenderApprovalDate)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dear Sir Block */}
                    <div className="loa-salutation" style={{ marginBottom: '8px', fontSize: '14px', lineHeight: '1.4' }}>
                        Dear Sirs,
                    </div>

                    {/* Paragraph 1 - Acceptance Announcement */}
                    <div className="loa-para" style={{ textAlign: 'justify', textIndent: '3em', marginBottom: '8px', fontSize: '14px', lineHeight: '1.5' }}>
                        This is to notify you that your bid Dt. {formatDateToOutput(tender.tenderOpeningDate)} for execution of the work: <span style={{ fontWeight: 'bold' }}>{packageData.packageName}</span> (estimated price Rs. <span style={{ fontWeight: 'bold' }}>{estAmountFormatted}</span>) at the offered contract bid price of Rs. <span style={{ fontWeight: 'bold' }}>{contractPriceFormatted}</span> (<span style={{ fontWeight: 'bold' }}>{aboveBelowRate}</span>) is hereby accepted on behalf of the District Panchayat Bhavnagar.
                    </div>

                    {/* Paragraph 2 - Guarantees and Deadlines instructions */}
                    <div className="loa-para" style={{ textAlign: 'justify', textIndent: '3em', marginBottom: '12px', fontSize: '14px', lineHeight: '1.5' }}>
                        You are hereby requested to submit the performance security / security deposit and fulfill the contract criteria within 15 days of receipt of this letter:
                    </div>

                    {/* Requirements list */}
                    <div className="loa-section" style={{ marginBottom: '16px', fontSize: '14px', paddingLeft: '3em', lineHeight: '1.5' }}>
                        <div style={{ marginBottom: '6px' }}>
                            1. Security Deposit Amount: <span style={{ fontWeight: 'bold' }}>Rs. {sdAmountFormatted}</span> (being 5% of Contract Price) in the form of FDR/BG.
                        </div>
                        {stampDutyFormatted !== '-' && (
                            <div style={{ marginBottom: '6px' }}>
                                2. Stamp duty of <span style={{ fontWeight: 'bold' }}>Rs. {stampDutyFormatted}</span> on the contract agreement.
                            </div>
                        )}
                        <div>
                            3. Please execute the contract agreement within the stipulated period, failing which necessary action will be taken.
                        </div>
                    </div>

                    {/* Paragraph 3 */}
                    <div className="loa-para" style={{ textAlign: 'justify', textIndent: '3em', marginBottom: '12px', fontSize: '14px', lineHeight: '1.5' }}>
                        The time limit for completion of the work is <span style={{ fontWeight: 'bold' }}>{workDurationMonths}</span> months from the date of issue of the work order.
                    </div>

                    <div className="loa-valediction" style={{ marginBottom: '24px', fontSize: '14px', lineHeight: '1.4', paddingLeft: '3em' }}>
                        Yours faithfully,
                    </div>

                    {/* Executive Engineer Signature Block */}
                    <div className="loa-sig-section" style={{ display: 'flex', justifySelf: 'flex-end', justifyContent: 'flex-end', marginBottom: '8px', fontSize: '14px', marginTop: '12px' }}>
                        <div style={{ textAlign: 'center', width: '280px', lineHeight: '1.4' }}>
                            <div style={{ marginBottom: '12px' }}>&nbsp;</div>
                            <div style={{ fontWeight: 'bold' }}>Executive Engineer</div>
                            <div>Panchayat R & B Division</div>
                            <div>Bhavnagar</div>
                        </div>
                    </div>

                    {/* Copy Forwarded Block */}
                    <div className="loa-copy-section" style={{ fontSize: '12px', lineHeight: '1.4', borderTop: '1px solid #ccc', paddingTop: '10px', marginTop: '10px' }}>
                        <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '2px' }}>Copy forwarded with respect to:</div>
                        <ul style={{ listStyleType: 'decimal', paddingLeft: '20px', margin: '2px 0 6px 0' }}>
                            <li>Superintending Engineer, Panchayat Road and Building Circle-2, Rajkot.</li>
                            <li>Executive Engineer, Quality control (R&B), Bahumali Bhavan, Bhavnagar.</li>
                        </ul>
                        <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '2px' }}>Copy forwarded to:</div>
                        <ul style={{ listStyleType: 'decimal', paddingLeft: '20px', margin: '2px 0 0 0' }}>
                            <li>Deputy Executive Engineer, Panchayat R & B Sub Division, <span style={{ fontWeight: 'semibold' }}>{subDivision}</span> for information & necessary action.</li>
                            <li>Divisional Accountant/ Work Branch/ P.B. Branch.</li>
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
                    body.loa-printing *,
                    body.loa-printing *::before,
                    body.loa-printing *::after {
                        height: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        overflow: visible !important;
                    }

                    body.loa-printing {
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }

                    body.loa-printing .screen-only,
                    body.loa-printing header,
                    body.loa-printing nav,
                    body.loa-printing aside,
                    body.loa-printing button,
                    body.loa-printing svg,
                    body.loa-printing [role="navigation"] {
                        display: none !important;
                    }

                    body.loa-printing .print-only {
                        display: block !important;
                        position: static !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }

                    body.loa-printing #print-area {
                        display: block !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    body.loa-printing .printable-container {
                        padding: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        box-sizing: border-box !important;
                        font-size: 13px !important;
                        line-height: 1.35 !important;
                    }

                    body.loa-printing .printable-container div,
                    body.loa-printing .printable-container span,
                    body.loa-printing .printable-container td,
                    body.loa-printing .printable-container th,
                    body.loa-printing .printable-container li {
                        font-size: 13px !important;
                    }

                    body.loa-printing .loa-header div { font-size: 11px !important; }
                    body.loa-printing .loa-header div:first-child { font-size: 14px !important; }
                    body.loa-printing .loa-header div:nth-child(2) { font-size: 12px !important; }
                    body.loa-printing .loa-doc-header span { font-size: 14px !important; }

                    body.loa-printing .loa-header,
                    body.loa-printing .loa-delivery,
                    body.loa-printing .loa-doc-header,
                    body.loa-printing .loa-contractor,
                    body.loa-printing .loa-subject,
                    body.loa-printing .loa-references,
                    body.loa-printing .loa-salutation,
                    body.loa-printing .loa-para,
                    body.loa-printing .loa-section,
                    body.loa-printing .loa-sig-section,
                    body.loa-printing .loa-copy-section {
                        margin-top: 3px !important;
                        margin-bottom: 3px !important;
                    }
                    body.loa-printing .loa-header { margin-bottom: 6px !important; }
                    body.loa-printing .loa-contractor { margin-bottom: 6px !important; }
                    body.loa-printing .loa-sig-section { margin-top: 15px !important; margin-bottom: 3px !important; }
                    body.loa-printing .loa-copy-section { margin-top: 6px !important; padding-top: 3px !important; }

                    @page {
                        size: A4;
                        margin: 0.8cm 1.2cm;
                    }
                }
            `}</style>

        </>
    );
}
