'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, Download, Edit3 } from 'lucide-react';
import { logoBase64 } from '@/lib/logoBase64';

interface AdditionalSDPrintClientProps {
    packageData: any;
    tender: any;
    loa: any;
    workOrder: any;
    agency: any;
    depositRefund: any;
    defaultActualCompletionDate?: string | Date | null;
}

const SUBDIVISION_GUJARATI: Record<string, string> = {
    'Talaja': 'તળાજા',
    'talaja': 'તળાજા',
    'Bhavnagar': 'ભાવનગર',
    'bhavnagar': 'ભાવનગર',
    'Palitana': 'પાલિતાણા',
    'palitana': 'પાલિતાણા',
    'Mahuva': 'મહુવા',
    'mahuva': 'મહુવા',
    'Sihor': 'સિહોર',
    'sihor': 'સિહોર',
    'Gariadhar': 'ગારીયાધાર',
    'gariadhar': 'ગારીયાધાર',
    'Vallabhipur': 'વલ્લભીપુર',
    'vallabhipur': 'વલ્લભીપુર',
    'Ghogha': 'ઘોઘા',
    'ghogha': 'ઘોઘા',
    'Jesar': 'જેસર',
    'jesar': 'જેસર',
    'Umrala': 'ઉમરાળા',
    'umrala': 'ઉમરાળા',
};

function toGujaratiDigits(str: string | number): string {
    const gujaratiDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
    return String(str).replace(/[0-9]/g, (w) => gujaratiDigits[parseInt(w, 10)]);
}

function formatDateToOutput(dateInput?: string | Date | null, useGujaratiDigits = true): string {
    if (!dateInput) return '-';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const formatted = `${day}/${month}/${year}`;
    return useGujaratiDigits ? toGujaratiDigits(formatted) : formatted;
}

function getYearFromDate(dateInput?: string | Date | null, useGujaratiDigits = true): string {
    if (!dateInput) {
        const yr = new Date().getFullYear().toString();
        return useGujaratiDigits ? toGujaratiDigits(yr) : yr;
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
        const yr = new Date().getFullYear().toString();
        return useGujaratiDigits ? toGujaratiDigits(yr) : yr;
    }
    const yr = d.getFullYear().toString();
    return useGujaratiDigits ? toGujaratiDigits(yr) : yr;
}

export default function AdditionalSDPrintClient({
    packageData,
    tender,
    loa,
    workOrder,
    agency,
    depositRefund,
    defaultActualCompletionDate
}: AdditionalSDPrintClientProps) {

    const exportToDoc = () => {
        const element = document.getElementById('print-area');
        if (!element) return;
        const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Additional SD Refund Order</title></head><body>";
        const postHtml = "</body></html>";
        let html = element.innerHTML;
        html = preHtml + html + postHtml;
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
        const filename = `Additional_SD_Refund_${(packageData?.subDivision || 'Package').replace(/\s+/g, '_')}.doc`;
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

    // Scoped print styling
    useEffect(() => {
        const onBefore = () => document.body.classList.add('sd-printing');
        const onAfter = () => document.body.classList.remove('sd-printing');
        window.addEventListener('beforeprint', onBefore);
        window.addEventListener('afterprint', onAfter);
        return () => {
            window.removeEventListener('beforeprint', onBefore);
            window.removeEventListener('afterprint', onAfter);
            document.body.classList.remove('sd-printing');
        };
    }, []);

    // Prep variables
    const rawSubDiv = packageData?.subDivision || tender?.taluka || 'તળાજા';
    const subDivisionGuj = SUBDIVISION_GUJARATI[rawSubDiv] || rawSubDiv;

    const orderNoRaw = depositRefund?.orderNo || '૨૧૯';
    const orderNo = /^[0-9]+$/.test(orderNoRaw) ? toGujaratiDigits(orderNoRaw) : orderNoRaw;
    
    const orderDateInput = depositRefund?.orderDate || new Date();
    const orderYear = getYearFromDate(orderDateInput);
    const orderDateFormatted = formatDateToOutput(orderDateInput);

    const contractorName = tender?.contractorName || agency?.name || 'ઇજારદારશ્રી';
    const packageName = packageData?.packageNameGujarati || packageData?.packageName || tender?.packageName || 'સદર કામ';

    const startDate = workOrder?.timeLimitStartsFrom || workOrder?.workOrderDate || loa?.acceptanceLetterDate;
    const startDateFormatted = formatDateToOutput(startDate);

    const workDuration = toGujaratiDigits(workOrder?.workDurationMonths || loa?.workDurationMonths || tender?.workDurationMonths || '૭');
    
    const stipulatedDate = workOrder?.stipulatedCompletionDate;
    const stipulatedDateFormatted = formatDateToOutput(stipulatedDate);

    const actualDate = depositRefund?.actualCompletionDate || defaultActualCompletionDate || stipulatedDate || new Date();
    const actualDateFormatted = formatDateToOutput(actualDate);

    const bankName = depositRefund?.bankName || workOrder?.additionalSecurityDepositBankName || 'સેન્ટ્રલ બેંક ઓફ ઇન્ડિયા';
    const fdrNumber = depositRefund?.fdrNumber || workOrder?.additionalSecurityDepositNumber || '01360IBG25000003';
    
    const fdrDate = depositRefund?.fdrDate || workOrder?.additionalSecurityDepositDate || workOrder?.workOrderDate;
    const fdrDateFormatted = formatDateToOutput(fdrDate);

    const amountNum = Number(depositRefund?.amount || workOrder?.additionalSecurityDepositAmount || 225000);
    const formattedAmountNumber = amountNum.toLocaleString('en-IN');
    const amountGujarati = `${toGujaratiDigits(formattedAmountNumber)}/-`;

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
                            <Edit3 className="w-4 h-4 text-slate-400" /> Additional SD Refund Order
                        </h1>
                        <p className="text-sm text-slate-400">Click anywhere on the document below to edit before printing/exporting.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={exportToDoc} className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 cursor-pointer">
                        <Download className="w-4 h-4" /> Export to Word (.doc)
                    </button>
                    <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 cursor-pointer">
                        <Printer className="w-4 h-4" /> Print Document
                    </button>
                </div>
            </div>

            {/* Editable Document Preview */}
            <div id="print-area" className="print-only">
                <div 
                    className="printable-container text-black bg-white" 
                    contentEditable 
                    suppressContentEditableWarning 
                    style={{ 
                        outline: "none", 
                        fontFamily: "'Shruti', 'Gujarati Sangam MN', 'Nirmala UI', 'Segoe UI', 'Arial', sans-serif", 
                        fontSize: '15px', 
                        lineHeight: '1.6', 
                        padding: '40px 60px', 
                        color: '#000', 
                        boxSizing: 'border-box' 
                    }}
                >
                    
                    {/* Top Letterhead Header */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '75px', verticalAlign: 'middle', textAlign: 'left', paddingRight: '10px' }} rowSpan={2}>
                                    <img src={logoBase64} alt="Emblem" style={{ width: '60px', height: 'auto', display: 'block' }} />
                                </td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '0 4px' }} colSpan={3}>
                                    <div style={{ fontSize: '17px', fontWeight: 'bold', lineHeight: '1.4' }}>કાર્યપાલક ઇજનેરશ્રીની કચેરી,</div>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: '1.4' }}>પંચાયત માર્ગ અને મકાન વિભાગ, જિલ્લા પંચાયત ભાવનગર</div>
                                </td>
                                <td style={{ width: '75px' }} rowSpan={2}></td>
                            </tr>
                            <tr>
                                <td style={{ fontSize: '13px', fontWeight: 'bold', textAlign: 'left', paddingTop: '6px' }}>
                                    ફોનઃ ૦૨૭૮-૨૪૨૨૫૪૮ (Ext.૨૦૩૧)
                                </td>
                                <td style={{ fontSize: '13px', fontWeight: 'bold', textAlign: 'right', paddingTop: '6px' }} colSpan={2}>
                                    E-Mail: <span style={{ textDecoration: 'underline' }}>exernb-ddo-bav@gujarat.gov.in</span>
                                </td>
                            </tr>
                            <tr>
                                <td colSpan={5} style={{ borderTop: '2px solid #000', padding: '0', margin: '0' }}></td>
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'left', fontSize: '14px', paddingTop: '8px' }} colSpan={3}>
                                    <strong>ક્રમાંક: </strong>ડીપી/મામવિ/ઓ. {subDivisionGuj}/વશી/{orderNo}/{orderYear}
                                </td>
                                <td style={{ textAlign: 'right', fontSize: '14px', paddingTop: '8px' }} colSpan={2}>
                                    <strong>તા.</strong>{orderDateFormatted}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Reference / વંચાણે લીધા */}
                    <div style={{ marginBottom: '14px', fontSize: '15px', lineHeight: '1.6' }}>
                        <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '2px' }}>વંચાણે લીધાઃ-</div>
                        <div style={{ paddingLeft: '16px' }}>
                            (૧) {contractorName} ની અરજી
                        </div>
                    </div>

                    {/* Order / આદેશ */}
                    <div style={{ marginBottom: '14px', fontSize: '15px', lineHeight: '1.8', textAlign: 'justify' }}>
                        <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>આદેશઃ-</div>
                        <p style={{ margin: '0', textIndent: '2.5em' }}>
                            અત્રેના વિભાગ હેઠળના <strong>{packageName}</strong> નું કામ <strong>{contractorName}</strong> ને ઇજારાથી સુપ્રત કરવામાં આવેલ હતુ. વર્કઓર્ડર મુજબ આ કામ તા.<strong>{startDateFormatted}</strong> થી શરૂ કરી <strong>{workDuration}</strong> માસની મુદ્દતમાં એટલે કે તા.<strong>{stipulatedDateFormatted}</strong> સુધીમાં પુર્ણ કરવાનું હતુ. ઇજારદારશ્રીએ આ કામ તા.<strong>{actualDateFormatted}</strong> ના રોજ પુર્ણ કરેલ છે.
                        </p>
                        <p style={{ marginTop: '10px', marginBottom: '0', textIndent: '2.5em' }}>
                            ઇજારદારશ્રીએ તેઓના પત્રથી એડીશનલ પર્ફોમન્સ સિકયોરીટી ડીપોઝીટ પેટે રજુ કરેલ એફ.ડી.આર. પરત મળવાની માંગણી કરેલ છે. ઇજારદારશ્રીએ નીચેની વિગતે એડીશનલ પર્ફોમન્સ સિકયોરીટી ડીપોઝીટ પેટે રજુ કરેલ એફ.ડી.આર. રજુ કરેલ છે.
                        </p>
                    </div>

                    {/* Table of Additional SD FDRs */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', margin: '16px 0', border: '1px solid black' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                <th style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'center', width: '50px' }}>ક્રમ</th>
                                <th style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'left' }}>બેન્‍ક નું નામ</th>
                                <th style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'center', width: '190px' }}>એફ.ડી.આર. નંબર</th>
                                <th style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'center', width: '120px' }}>ઇશ્યુ તારીખ</th>
                                <th style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'right', width: '130px' }}>રકમ રૂા.</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'center' }}>૧</td>
                                <td style={{ border: '1px solid black', padding: '6px 8px' }}>{bankName}</td>
                                <td style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'center', fontFamily: 'monospace' }}>{fdrNumber}</td>
                                <td style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'center' }}>{fdrDateFormatted}</td>
                                <td style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{amountGujarati}</td>
                            </tr>
                            <tr style={{ fontWeight: 'bold' }}>
                                <td style={{ border: '1px solid black', padding: '6px 8px' }}></td>
                                <td style={{ border: '1px solid black', padding: '6px 8px' }} colSpan={3}>કુલ:-</td>
                                <td style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'right' }}>{amountGujarati}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* ITB Clause & Order Details */}
                    <div style={{ margin: '16px 0', fontSize: '15px', lineHeight: '1.8', textAlign: 'justify' }}>
                        <p style={{ margin: '0', textIndent: '2.5em' }}>
                            સબબ, ટેન્ડરના આઇ.ટી.બી. કલોઝ નં.૩૪.૧(બી) મુજબ કામ પૂર્ણ થયાનાં ૨૮ દિવસ પછી રજુ કરેલ એડીશનલ પર્ફોમન્સ સિકયોરીટી ડીપોઝીટ પેટે રજુ કરેલ એફ.ડી.આર. પરત કરવાની રહે છે. સદર કામ એજન્સીએ તા.<strong>{actualDateFormatted}</strong> નાં રોજ પૂર્ણ કરેલ હોય, ઉપર મુજબની એડીશનલ પર્ફોમન્સ સિકયોરીટી ડીપોઝીટ પેટે રજુ કરેલ એફ.ડી.આર. પરત કરવા હુકમ કરવામાં આવે છે.
                        </p>
                    </div>

                    {/* Executive Engineer Signature Block */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '28px', marginBottom: '24px', fontSize: '15px' }}>
                        <div style={{ textAlign: 'center', lineHeight: '1.3' }}>
                            <div style={{ height: '36px' }}>&nbsp;</div>
                            <div style={{ fontWeight: 'bold' }}>કાર્યપાલક ઇજનેર</div>
                            <div>પંચાયત (મા. મ.) વિભાગ</div>
                            <div>ભાવનગર</div>
                        </div>
                    </div>

                    {/* Copy to Block */}
                    <div style={{ fontSize: '14px', lineHeight: '1.5', marginTop: '20px', borderTop: '1px dashed #94a3b8', paddingTop: '12px' }}>
                        <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>નકલ રવાનાઃ-</div>
                        <div style={{ paddingLeft: '16px' }}>
                            (૧) નાયબ કાર્યપાલક ઇજનેરશ્રી, પંચાયત મા.મ.પે.વિ. {subDivisionGuj}
                        </div>
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
                    .screen-only {
                        display: none !important;
                    }
                    .print-only, .printable-container {
                        display: block !important;
                        margin: 0 !important;
                        padding: 20px 30px !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        box-shadow: none !important;
                        background: white !important;
                        font-size: 14px !important;
                    }
                    body {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    @page {
                        size: A4 portrait;
                        margin: 1.5cm 1.5cm;
                    }
                }
            `}</style>
        </>
    );
}
