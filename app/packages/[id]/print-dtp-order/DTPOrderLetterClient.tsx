'use client';

import Link from 'next/link';
import { ArrowLeft, Printer, Download, Edit3 } from 'lucide-react';
import { useEffect } from 'react';

interface DTPOrderLetterClientProps {
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

function numberToIndianWords(num: number): string {
    if (isNaN(num) || num <= 0) return '';
    
    const strNum = num.toFixed(2);
    const [intStr, decStr] = strNum.split('.');
    const intVal = parseInt(intStr, 10);
    const decVal = parseInt(decStr, 10);

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertLessThanThousand(n: number): string {
        let out = '';
        if (n >= 100) {
            out += ones[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n >= 20) {
            out += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        }
        if (n > 0) {
            out += ones[n] + ' ';
        }
        return out.trim();
    }

    let result = '';
    let temp = intVal;

    if (temp >= 10000000) {
        const crores = Math.floor(temp / 10000000);
        result += convertLessThanThousand(crores) + ' Crore ';
        temp %= 10000000;
    }

    if (temp >= 100000) {
        const lakhs = Math.floor(temp / 100000);
        result += convertLessThanThousand(lakhs) + ' Lakh ';
        temp %= 100000;
    }

    if (temp >= 1000) {
        const thousands = Math.floor(temp / 1000);
        result += convertLessThanThousand(thousands) + ' Thousand ';
        temp %= 1000;
    }

    if (temp > 0) {
        result += convertLessThanThousand(temp) + ' ';
    }

    result = result.trim();
    
    let finalString = 'Rupees ' + result + ' Rupees';

    if (decVal > 0) {
        let decWords = '';
        if (decVal >= 20) {
            decWords = tens[Math.floor(decVal / 10)] + ' ' + ones[decVal % 10];
        } else {
            decWords = ones[decVal];
        }
        finalString += ' and ' + decWords.trim() + ' Paise';
    }

    finalString += ' Only';
    return finalString.replace(/\s+/g, ' ').trim();
}

export default function DTPOrderLetterClient({ packageData, dtp }: DTPOrderLetterClientProps) {
    const exportToDoc = () => {
        const element = document.getElementById('print-area');
        if (!element) return;
        const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
        const postHtml = "</body></html>";
        let html = element.innerHTML;
        html = preHtml + html + postHtml;
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
        const filename = 'DTP_Order.doc';
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

    // Add/remove dtp-printing class on body so print CSS is scoped only to this page
    useEffect(() => {
        const onBefore = () => document.body.classList.add('dtp-printing');
        const onAfter = () => document.body.classList.remove('dtp-printing');
        window.addEventListener('beforeprint', onBefore);
        window.addEventListener('afterprint', onAfter);
        return () => {
            window.removeEventListener('beforeprint', onBefore);
            window.removeEventListener('afterprint', onAfter);
            document.body.classList.remove('dtp-printing');
        };
    }, []);

    // Prep variables
    const approvalNo = dtp.dtpApprovalNo || '';
    const is591 = approvalNo.includes('591');
    const currentYear = is591 ? '2025' : getYearFromDate(dtp.dtpApprovalDate);
    const cleanApprovalNo = approvalNo.replace('/2026', '');
    const fullApprovalNo = approvalNo.includes('/') 
        ? approvalNo.replace('591/2026', '591/2025') 
        : `DP/R&B/Tender/${cleanApprovalNo}/${currentYear}`;

    const approvalDateFormatted = formatDateToOutput(dtp.dtpApprovalDate);
    const tenderAmountFormatted = dtp.tenderAmount 
        ? dtp.tenderAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '-';

    const subDivision = packageData.subDivision || 'Bhavnagar';

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
                            <Edit3 className="w-4 h-4 text-slate-400" /> Print DTP Order
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
                    
                    {/* Top Table / Header Layout */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                        <tbody>
                            <tr>
                                <td style={{ verticalAlign: 'top', width: '40%', fontSize: '14px', padding: '0' }}>
                                    <strong>No. </strong>{fullApprovalNo}
                                </td>
                                <td style={{ verticalAlign: 'top', width: '60%', textAlign: 'right', fontSize: '14px', padding: '0', fontWeight: 'bold', lineHeight: '1.3' }}>
                                    Panchayat R & B Division, Bhavnagar.<br />
                                    District Panchayat Office<br />
                                    <span style={{ fontWeight: 'normal', fontSize: '14px' }}>Dt. - &nbsp;&nbsp;&nbsp;{approvalDateFormatted}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Office Order Title */}
                    <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px', textDecoration: 'underline', marginBottom: '16px', letterSpacing: '0.5px' }}>
                        OFFICE ORDER
                    </div>

                    {/* Subject / Body Statement */}
                    <div style={{ textAlign: 'justify', fontSize: '14px', lineHeight: '1.5', marginBottom: '16px', textIndent: '3em' }}>
                        Standard Bidding Document (S.B.D.) for the work of <strong>{packageData.packageName}</strong> amounting Rs. <strong>{tenderAmountFormatted}</strong> ({numberToIndianWords(dtp.tenderAmount || 0)}) is hereby approved subject to following conditions.
                    </div>

                    {/* Conditions Section */}
                    <div style={{ fontSize: '14px', marginBottom: '16px' }}>
                        <strong style={{ fontSize: '14px' }}>Conditions: -</strong>
                        <ol style={{ paddingLeft: '24px', marginTop: '4px', listStyleType: 'decimal', fontSize: '14px' }}>
                            <li style={{ marginBottom: '8px', textAlign: 'justify', lineHeight: '1.5' }}>
                                Necessary correction made in S.B.D. shall be checked thoroughly before issuing the tender copy to the contractor or online submission.
                            </li>
                            <li style={{ marginBottom: '8px', textAlign: 'justify', lineHeight: '1.5' }}>
                                Page number to all tender papers be given before issuing the final copy.
                            </li>
                            <li style={{ marginBottom: '8px', textAlign: 'justify', lineHeight: '1.5' }}>
                                Instruction contained in the technical note of T.S. Order shall be scrupulously followed.
                            </li>
                        </ol>
                    </div>

                    {/* Executive Engineer Signature Block */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>
                        <div style={{ lineHeight: '1.3' }}>
                            <div style={{ marginBottom: '24px' }}>&nbsp;</div>
                            <div style={{ fontWeight: 'bold' }}>Executive Engineer</div>
                            <div>Panchayat R & B Division</div>
                            <div>Bhavnagar</div>
                        </div>
                    </div>

                    {/* Copy To Block */}
                    <div style={{ fontSize: '14px', marginTop: '12px', lineHeight: '1.4', textAlign: 'left' }}>
                        <strong>Copy to: -</strong><br />
                        Deputy Executive Engineer,<br />
                        Panchayat R&amp;B Sub Division,<br />
                        {subDivision}.
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
                    body.dtp-printing *,
                    body.dtp-printing *::before,
                    body.dtp-printing *::after {
                        height: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        overflow: visible !important;
                    }

                    body.dtp-printing {
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }

                    body.dtp-printing .screen-only,
                    body.dtp-printing header,
                    body.dtp-printing nav,
                    body.dtp-printing aside,
                    body.dtp-printing button,
                    body.dtp-printing svg,
                    body.dtp-printing [role="navigation"] {
                        display: none !important;
                    }

                    body.dtp-printing .print-only {
                        display: block !important;
                        position: static !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }

                    body.dtp-printing #print-area {
                        display: block !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    body.dtp-printing .printable-container {
                        padding: 1cm 2cm !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        box-sizing: border-box !important;
                        font-size: 14px !important;
                        line-height: 1.5 !important;
                    }

                    body.dtp-printing .printable-container div,
                    body.dtp-printing .printable-container span,
                    body.dtp-printing .printable-container td,
                    body.dtp-printing .printable-container th,
                    body.dtp-printing .printable-container li {
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
