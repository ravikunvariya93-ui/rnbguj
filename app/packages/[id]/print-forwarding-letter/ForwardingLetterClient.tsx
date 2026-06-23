'use client';

import Link from 'next/link';
import { ArrowLeft, Printer, Download, Edit3 } from 'lucide-react';
import { useEffect } from 'react';

interface ForwardingLetterClientProps {
    packageData: any;
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

export default function ForwardingLetterClient({ packageData, dtp }: ForwardingLetterClientProps) {
    const exportToDoc = () => {
        const element = document.getElementById('print-area');
        if (!element) return;
        const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
        const postHtml = "</body></html>";
        let html = element.innerHTML;
        html = preHtml + html + postHtml;
        const blob = new Blob(['\\ufeff', html], { type: 'application/msword' });
        const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
        const filename = 'DTP_Forwarding_Letter.doc';
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

    // Add/remove forwarding-printing class on body so print CSS is scoped only to this page
    useEffect(() => {
        const onBefore = () => document.body.classList.add('forwarding-printing');
        const onAfter = () => document.body.classList.remove('forwarding-printing');
        window.addEventListener('beforeprint', onBefore);
        window.addEventListener('afterprint', onAfter);
        return () => {
            window.removeEventListener('beforeprint', onBefore);
            window.removeEventListener('afterprint', onAfter);
            document.body.classList.remove('forwarding-printing');
        };
    }, []);

    // Prep variables
    const wsNumber = dtp.dtpSendingNo || '';
    const is591 = wsNumber.includes('591');
    const currentYear = is591 ? '2025' : getYearFromDate(dtp.dtpSendingDate);
    const cleanWsNumber = wsNumber.replace('/2026', '');
    const fullWsNo = wsNumber.includes('/') 
        ? wsNumber.replace('591/2026', '591/2025') 
        : `DP/R&B/Tender/${cleanWsNumber}/${currentYear}`;

    const letterDateFormatted = formatDateToOutput(dtp.dtpSendingDate);
    const tenderAmountFormatted = dtp.tenderAmount 
        ? dtp.tenderAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
                            <Edit3 className="w-4 h-4 text-slate-400" /> Print Forwarding Letter
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
                    <div style={{ textAlign: 'center', marginBottom: '12px', lineHeight: '1.3' }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                            District Panchayat Office, Panchayat Road and Building Division
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '2px' }}>Balvantray Maheta Bhavan, Near Motibag, Bhavnagar-364001</div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '2px' }}>Phone: - 0278-2422548, Email ID: - exernb-ddo-bav@gujarat.gov.in</div>
                        <div style={{ borderBottom: '2px solid black', marginTop: '6px' }} />
                    </div>

                    {/* No. and Date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '14px' }}>
                        <div><span style={{ fontWeight: 'bold' }}>No. </span>{fullWsNo}</div>
                        <div><span style={{ fontWeight: 'bold' }}>Dt. - &nbsp;&nbsp;&nbsp;</span>{letterDateFormatted}</div>
                    </div>

                    {/* To */}
                    <div style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.4' }}>
                        <div style={{ fontWeight: 'bold' }}>To,</div>
                        <div style={{ marginLeft: '24px' }}>The Superintending Engineer,</div>
                        <div style={{ marginLeft: '24px' }}>Panchayat Road and Building Circle - 2,</div>
                        <div style={{ marginLeft: '24px' }}>Rajkot.</div>
                    </div>

                    {/* Subject */}
                    <div style={{ marginBottom: '10px', fontSize: '14px', lineHeight: '1.4', paddingLeft: '4em' }}>
                        <span style={{ fontWeight: 'bold' }}>Subject:</span>
                        <span style={{ display: 'inline-block', width: '1em' }}></span>
                        <span style={{ fontWeight: 'bold' }}>Regarding Approval of Standard Bidding Document (S.B.D.)</span>
                    </div>

                    {/* Body */}
                    <div style={{ marginBottom: '12px', fontSize: '14px', textAlign: 'justify', lineHeight: '1.5' }}>
                        <p style={{ margin: '0', textIndent: '2em' }}>
                            Respectfully, with reference to the above cited subject, it is submitted that the Standard Bidding Document (S.B.D.) in respect of the works detailed in the table below, pertaining to this Division, have been prepared and are hereby forwarded for approval.
                        </p>
                    </div>

                    {/* Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '10px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f3f4f6' }}>
                                <th style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'center', width: '46px' }}>Sr.<br />No.</th>
                                <th style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'center' }}>Name of Work</th>
                                <th style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'center', width: '150px' }}>DTP Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'center', verticalAlign: 'top' }}>1</td>
                                <td style={{ border: '1px solid black', padding: '6px 8px', verticalAlign: 'top' }}>{packageData.packageName}</td>
                                <td style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'right', verticalAlign: 'top', fontFamily: 'monospace' }}>{tenderAmountFormatted}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Signature */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', fontSize: '14px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ marginBottom: '24px' }}>&nbsp;</div>
                            <div style={{ fontWeight: 'bold' }}>Executive Engineer</div>
                            <div>Panchayat R & B Division</div>
                            <div>Bhavnagar</div>
                        </div>
                    </div>

                    {/* Enclosure */}
                    <div style={{ marginTop: '16px', fontSize: '14px' }}>
                        <span style={{ fontWeight: 'bold' }}>Enclosure: </span>As above.
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
                    body.forwarding-printing *,
                    body.forwarding-printing *::before,
                    body.forwarding-printing *::after {
                        height: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        overflow: visible !important;
                    }

                    body.forwarding-printing {
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }

                    body.forwarding-printing .screen-only,
                    body.forwarding-printing header,
                    body.forwarding-printing nav,
                    body.forwarding-printing aside,
                    body.forwarding-printing button,
                    body.forwarding-printing svg,
                    body.forwarding-printing [role="navigation"] {
                        display: none !important;
                    }

                    body.forwarding-printing .print-only {
                        display: block !important;
                        position: static !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }

                    body.forwarding-printing #print-area {
                        display: block !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    body.forwarding-printing .printable-container {
                        padding: 1cm 2cm !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        box-sizing: border-box !important;
                        font-size: 14px !important;
                        line-height: 1.5 !important;
                    }

                    body.forwarding-printing .printable-container div,
                    body.forwarding-printing .printable-container span,
                    body.forwarding-printing .printable-container td,
                    body.forwarding-printing .printable-container th,
                    body.forwarding-printing .printable-container li {
                        font-size: 14px !important;
                    }

                    @page {
                        size: A4;
                        margin: 0 !important;
                    }
                }
            `}</style>
        </>
    );
}
