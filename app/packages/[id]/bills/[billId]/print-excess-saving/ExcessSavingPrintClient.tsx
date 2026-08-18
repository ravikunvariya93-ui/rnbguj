'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, FileSpreadsheet } from 'lucide-react';

interface ExcessSavingPrintClientProps {
    packageData: any;
    tender: any;
    loa: any;
    workOrder: any;
    agency: any;
    bill: any;
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

export default function ExcessSavingPrintClient({
    packageData,
    tender,
    loa,
    workOrder,
    agency,
    bill
}: ExcessSavingPrintClientProps) {
    const printRef = useRef<HTMLDivElement>(null);

    const items: any[] = bill?.items || [];

    const workName = tender?.packageName || packageData?.packageName || '-';
    const budgetHead = packageData?.budgetHead || '-';
    const contractorName = tender?.contractorName || '-';
    const contractorGstNo = agency?.gstNo || '';
    const workOrderNo = workOrder?.workOrderNo || '-';
    const workOrderDate = formatDateDMY(workOrder?.workOrderDate);
    const tenderAmount = tender?.contractPrice || tender?.estimatedAmount || 0;
    const tenderPercent = tender?.aboveBelowPercentage != null ? `${tender.aboveBelowPercentage}% ${tender.aboveBelowInWord || ''}` : '';

    const billNum = bill?.runningBillNumber || 1;
    const billSuffix = billNum === 1 ? 'st' : billNum === 2 ? 'nd' : billNum === 3 ? 'rd' : 'th';
    const billLabel = `${billNum}${billSuffix} and ${bill?.billType || 'Running'} Bill`;
    const billDate = formatDateDMY(bill?.billDate);
    const grossAmount = bill?.grossAmount || 0;

    // Totals
    const totalTender = items.reduce((s: number, i: any) => s + ((Number(i.boqQuantity || 0)) * (Number(i.fullRate || 0))), 0);
    const totalBill = items.reduce((s: number, i: any) => s + (Number(i.uptoDateAmount != null ? i.uptoDateAmount : ((Number(i.quantity || 0)) * Number(i.partRate || i.fullRate || 0)))), 0);

    const totalExcess = items.reduce((s: number, i: any) => {
        const tAmt = (Number(i.boqQuantity || 0)) * (Number(i.fullRate || 0));
        const bAmt = Number(i.uptoDateAmount != null ? i.uptoDateAmount : ((Number(i.quantity || 0)) * Number(i.partRate || i.fullRate || 0)));
        const diff = bAmt - tAmt;
        return s + (diff > 0 ? diff : 0);
    }, 0);

    const totalSaving = items.reduce((s: number, i: any) => {
        const tAmt = (Number(i.boqQuantity || 0)) * (Number(i.fullRate || 0));
        const bAmt = Number(i.uptoDateAmount != null ? i.uptoDateAmount : ((Number(i.quantity || 0)) * Number(i.partRate || i.fullRate || 0)));
        const diff = bAmt - tAmt;
        return s + (diff < 0 ? Math.abs(diff) : 0);
    }, 0);

    const netDiff = totalExcess - totalSaving;
    const isNetExcess = netDiff >= 0;
    const netPercentage = totalTender > 0 ? ((Math.abs(netDiff) / totalTender) * 100).toFixed(2) : '0.00';

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        const rows = [
            ['DISTRICT PANCHAYAT ROAD & BUILDING DIVISION, BHAVNAGAR'],
            ['EXCESS / SAVING STATEMENT (એક્સેસ / સેવિંગ પત્રક)'],
            ['Work Name:', `"${workName.replace(/"/g, '""')}"`],
            ['Scheme / Budget Head:', `"${budgetHead.replace(/"/g, '""')}"`],
            ['Contractor Name:', `"${contractorName} ${contractorGstNo ? `(GST: ${contractorGstNo})` : ''}"`],
            ['Work Order No & Date:', `"${workOrderNo} Dt. ${workOrderDate}"`],
            ['Bill No & Date:', `"${billLabel} Dt. ${billDate}"`],
            ['Tender Amount:', totalTender.toFixed(2)],
            ['Gross Bill Amount:', grossAmount.toFixed(2)],
            [],
            [
                'Item No',
                'Description',
                'Unit',
                'Tender Qty',
                'Tender Rate',
                'Tender Amount',
                'Bill Qty',
                'Bill Rate',
                'Bill Amount',
                'Excess Qty',
                'Excess Amount',
                'Saving Qty',
                'Saving Amount'
            ]
        ];

        items.forEach((item: any) => {
            const tQty = Number(item.boqQuantity || 0);
            const tRate = Number(item.fullRate || 0);
            const tAmt = tQty * tRate;

            const bQty = Number(item.quantity || 0);
            const bRate = Number(item.partRate != null ? item.partRate : item.fullRate || 0);
            const bAmt = Number(item.uptoDateAmount != null ? item.uptoDateAmount : (bQty * bRate));

            const diffQty = bQty - tQty;
            const diffAmt = bAmt - tAmt;

            const excessQty = diffQty > 0 ? diffQty : 0;
            const excessAmt = diffAmt > 0 ? diffAmt : 0;
            const savingQty = diffQty < 0 ? Math.abs(diffQty) : 0;
            const savingAmt = diffAmt < 0 ? Math.abs(diffAmt) : 0;

            rows.push([
                `"${item.itemNo}"`,
                `"${(item.description || '').replace(/"/g, '""')}"`,
                `"${item.unit || ''}"`,
                tQty.toFixed(2),
                tRate.toFixed(2),
                tAmt.toFixed(2),
                bQty.toFixed(2),
                bRate.toFixed(2),
                bAmt.toFixed(2),
                excessQty > 0 ? excessQty.toFixed(2) : '0.00',
                excessAmt > 0 ? excessAmt.toFixed(2) : '0.00',
                savingQty > 0 ? savingQty.toFixed(2) : '0.00',
                savingAmt > 0 ? savingAmt.toFixed(2) : '0.00'
            ]);
        });

        rows.push([]);
        rows.push([
            'TOTAL',
            '',
            '',
            '',
            '',
            totalTender.toFixed(2),
            '',
            '',
            totalBill.toFixed(2),
            '',
            totalExcess.toFixed(2),
            '',
            totalSaving.toFixed(2)
        ]);
        rows.push([
            `NET STATEMENT (${isNetExcess ? 'EXCESS' : 'SAVING'})`,
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            isNetExcess ? netDiff.toFixed(2) : '',
            '',
            !isNetExcess ? Math.abs(netDiff).toFixed(2) : ''
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(',')).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Excess_Saving_Statement_${packageData?.packageName || 'Package'}_Bill_${billNum}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-slate-100 print:bg-white">
            {/* Top Toolbar - Screen Only */}
            <div className="no-print bg-slate-900 text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50 shadow-md">
                <div className="flex items-center gap-3">
                    <Link
                        href={`/packages/${packageData?._id}/bills?billId=${bill?._id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Bill
                    </Link>
                    <div className="border-l border-slate-700 pl-3">
                        <h1 className="text-sm font-bold text-white flex items-center gap-2">
                            Excess / Saving Statement
                            <span className="text-[11px] font-normal px-2 py-0.5 bg-emerald-800 text-emerald-100 rounded-md border border-emerald-600">
                                {billLabel}
                            </span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer shadow-xs"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export Excel / CSV
                    </button>
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                    >
                        <Printer className="w-4 h-4" /> Print Statement
                    </button>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                        color: #000 !important;
                        font-family: 'Noto Sans Gujarati', 'Noto Sans', Arial, sans-serif !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    @page {
                        size: A4 landscape;
                        margin: 6mm 6mm 6mm 6mm;
                    }
                    .statement-container {
                        padding: 0 !important;
                        margin: 0 !important;
                        max-width: 100% !important;
                        box-shadow: none !important;
                        background: transparent !important;
                    }
                    .statement-table th, .statement-table td,
                    .header-info-table th, .header-info-table td {
                        font-size: 8pt !important;
                        padding: 2px 4px !important;
                        line-height: 1.2 !important;
                    }
                    .statement-title {
                        font-size: 11pt !important;
                        margin-bottom: 2px !important;
                    }
                    .statement-subtitle {
                        font-size: 9pt !important;
                        margin-bottom: 4px !important;
                    }
                    .sign-row {
                        margin-top: 18px !important;
                        page-break-inside: avoid !important;
                    }
                    .sign-line {
                        margin-top: 24px !important;
                    }
                }

                .statement-table {
                    border-collapse: collapse;
                    width: 100%;
                }
                .statement-table th, .statement-table td {
                    border: 1px solid #1f2937;
                    padding: 4px 6px;
                    vertical-align: middle;
                    font-size: 11px;
                    line-height: 1.25;
                }
                .statement-table th {
                    background-color: #f1f5f9;
                    font-weight: 700;
                    text-align: center;
                }
                .header-info-table {
                    border-collapse: collapse;
                    width: 100%;
                    margin-bottom: 6px;
                }
                .header-info-table td {
                    border: 1px solid #374151;
                    padding: 3px 6px;
                    font-size: 11px;
                    line-height: 1.3;
                }
            `}</style>

            {/* Printable Statement Sheet */}
            <div className="py-6 px-4 sm:px-6 print:p-0">
                <div
                    ref={printRef}
                    className="statement-container max-w-[1100px] mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-slate-200 print:border-none print:rounded-none print:shadow-none"
                    style={{ fontFamily: "'Noto Sans Gujarati', 'Noto Sans', Arial, sans-serif" }}
                >
                    {/* Header */}
                    <div className="text-center mb-3">
                        <h2 className="statement-title font-extrabold text-base sm:text-lg text-slate-900 uppercase tracking-wide">
                            જિલ્લા પંચાયત માર્ગ અને મકાન વિભાગ, ભાવનગર
                        </h2>
                        <div className="statement-subtitle font-bold text-sm sm:text-base text-slate-800 uppercase tracking-wider underline mt-0.5">
                            EXCESS / SAVING STATEMENT (વધારો / બચત પત્રક)
                        </div>
                    </div>

                    {/* Metadata Box */}
                    <table className="header-info-table">
                        <tbody>
                            <tr>
                                <td style={{ width: '16%', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>કામનું નામ (Name of Work):</td>
                                <td colSpan={3} style={{ fontWeight: 'bold', color: '#0f172a' }}>{workName}</td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>યોજના (Budget Head):</td>
                                <td style={{ width: '34%' }}>{budgetHead}</td>
                                <td style={{ width: '16%', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>એજન્સીનું નામ (Agency):</td>
                                <td style={{ width: '34%', fontWeight: 'bold' }}>
                                    {contractorName} {contractorGstNo ? `(GST: ${contractorGstNo})` : ''}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>વર્ક ઓર્ડર નં. અને તારીખ:</td>
                                <td>{workOrderNo} Dt. {workOrderDate}</td>
                                <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>ટેન્ડર રકમ (Tender Amount):</td>
                                <td style={{ fontWeight: 'bold' }}>
                                    ₹{fmtNum(tenderAmount)} {tenderPercent ? `(${tenderPercent})` : ''}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>બિલની વિગત (Bill Details):</td>
                                <td style={{ fontWeight: 'bold', color: '#047857' }}>
                                    {billLabel} — Dt. {billDate}
                                </td>
                                <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>કુલ બિલ રકમ (Gross Bill):</td>
                                <td style={{ fontWeight: 'bold', color: '#047857' }}>
                                    ₹{fmtNum(grossAmount)}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Statement Table */}
                    <table className="statement-table">
                        <thead>
                            <tr style={{ backgroundColor: '#e2e8f0' }}>
                                <th rowSpan={2} style={{ width: '4%' }}>Item No.</th>
                                <th rowSpan={2} style={{ width: '26%', textAlign: 'left' }}>Description of Item</th>
                                <th rowSpan={2} style={{ width: '5%' }}>Unit</th>
                                <th colSpan={3} style={{ backgroundColor: '#dbeafe', width: '21%' }}>As per Tender (ટેન્ડર મુજબ)</th>
                                <th colSpan={3} style={{ backgroundColor: '#e0e7ff', width: '21%' }}>As per Bill / Executed (બિલ મુજબ)</th>
                                <th colSpan={2} style={{ backgroundColor: '#ffe4e6', width: '11%' }}>Excess (વધારો)</th>
                                <th colSpan={2} style={{ backgroundColor: '#dcfce7', width: '12%' }}>Saving (બચત)</th>
                            </tr>
                            <tr>
                                <th style={{ backgroundColor: '#eff6ff', width: '6%' }}>Qty</th>
                                <th style={{ backgroundColor: '#eff6ff', width: '7%' }}>Rate (₹)</th>
                                <th style={{ backgroundColor: '#eff6ff', width: '8%' }}>Amount (₹)</th>
                                
                                <th style={{ backgroundColor: '#eef2ff', width: '6%' }}>Qty</th>
                                <th style={{ backgroundColor: '#eef2ff', width: '7%' }}>Rate (₹)</th>
                                <th style={{ backgroundColor: '#eef2ff', width: '8%' }}>Amount (₹)</th>
                                
                                <th style={{ backgroundColor: '#fff1f2', width: '5%' }}>Qty</th>
                                <th style={{ backgroundColor: '#fff1f2', width: '6%' }}>Amount (₹)</th>
                                
                                <th style={{ backgroundColor: '#f0fdf4', width: '5%' }}>Qty</th>
                                <th style={{ backgroundColor: '#f0fdf4', width: '7%' }}>Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={13} style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                                        No line items logged in this bill.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item: any, idx: number) => {
                                    const tQty = Number(item.boqQuantity || 0);
                                    const tRate = Number(item.fullRate || 0);
                                    const tAmt = tQty * tRate;

                                    const bQty = Number(item.quantity || 0);
                                    const bRate = Number(item.partRate != null ? item.partRate : item.fullRate || 0);
                                    const bAmt = Number(item.uptoDateAmount != null ? item.uptoDateAmount : (bQty * bRate));

                                    const diffQty = bQty - tQty;
                                    const diffAmt = bAmt - tAmt;

                                    const excessQty = diffQty > 0 ? diffQty : 0;
                                    const excessAmt = diffAmt > 0 ? diffAmt : 0;

                                    const savingQty = diffQty < 0 ? Math.abs(diffQty) : 0;
                                    const savingAmt = diffAmt < 0 ? Math.abs(diffAmt) : 0;

                                    return (
                                        <tr key={idx} style={{ pageBreakInside: 'avoid' }}>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.itemNo}</td>
                                            <td style={{ textAlign: 'left', wordBreak: 'break-word' }}>
                                                {item.description}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{item.unit}</td>

                                            {/* Tender */}
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtNum(tQty)}</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtNum(tRate)}</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: '600' }}>{fmtNum(tAmt)}</td>

                                            {/* Bill */}
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtNum(bQty)}</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtNum(bRate)}</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: '600' }}>{fmtNum(bAmt)}</td>

                                            {/* Excess */}
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: excessQty > 0 ? '#b91c1c' : '#64748b' }}>
                                                {excessQty > 0 ? fmtNum(excessQty) : '-'}
                                            </td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: excessAmt > 0 ? 'bold' : 'normal', color: excessAmt > 0 ? '#991b1b' : '#64748b' }}>
                                                {excessAmt > 0 ? fmtNum(excessAmt) : '-'}
                                            </td>

                                            {/* Saving */}
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: savingQty > 0 ? '#047857' : '#64748b' }}>
                                                {savingQty > 0 ? fmtNum(savingQty) : '-'}
                                            </td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: savingAmt > 0 ? 'bold' : 'normal', color: savingAmt > 0 ? '#065f46' : '#64748b' }}>
                                                {savingAmt > 0 ? fmtNum(savingAmt) : '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        <tfoot>
                            {/* Total Row */}
                            <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', borderTop: '2px solid #0f172a' }}>
                                <td colSpan={3} style={{ textAlign: 'right', textTransform: 'uppercase' }}>
                                    Grand Total (કુલ રકમ):
                                </td>
                                <td colSpan={2}></td>
                                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                    ₹{fmtNum(totalTender)}
                                </td>
                                <td colSpan={2}></td>
                                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                    ₹{fmtNum(totalBill)}
                                </td>
                                <td></td>
                                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#991b1b' }}>
                                    ₹{fmtNum(totalExcess)}
                                </td>
                                <td></td>
                                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#065f46' }}>
                                    ₹{fmtNum(totalSaving)}
                                </td>
                            </tr>

                            {/* Net Summary Row */}
                            <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                                <td colSpan={9} style={{ textAlign: 'right', textTransform: 'uppercase', fontSize: '11.5px' }}>
                                    Net Statement Summary ({isNetExcess ? 'Net Excess / ચોખ્ખો વધારો' : 'Net Saving / ચોખ્ખી બચત'}):
                                </td>
                                <td
                                    colSpan={4}
                                    style={{
                                        textAlign: 'right',
                                        fontFamily: 'monospace',
                                        fontWeight: '900',
                                        fontSize: '12px',
                                        color: isNetExcess ? '#b91c1c' : '#047857'
                                    }}
                                >
                                    {isNetExcess
                                        ? `+ ₹${fmtNum(netDiff)} (Net Excess - ${netPercentage}%)`
                                        : `- ₹${fmtNum(Math.abs(netDiff))} (Net Saving - ${netPercentage}%)`}
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Signatures Block */}
                    <div className="sign-row" style={{ marginTop: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', pageBreakInside: 'avoid' }}>
                        <div style={{ textAlign: 'center', width: '22%' }}>
                            <div className="sign-line" style={{ borderTop: '1px solid #475569', paddingTop: '4px', marginTop: '36px', fontSize: '11px', fontWeight: 'bold' }}>
                                અધિક મદદનીશ ઈજનેર / સે.ઓ.<br />
                                (AAE / Section Officer)
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', width: '22%' }}>
                            <div className="sign-line" style={{ borderTop: '1px solid #475569', paddingTop: '4px', marginTop: '36px', fontSize: '11px', fontWeight: 'bold' }}>
                                નાયબ કાર્યપાલક ઈજનેર<br />
                                (Deputy Executive Engineer)
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', width: '22%' }}>
                            <div className="sign-line" style={{ borderTop: '1px solid #475569', paddingTop: '4px', marginTop: '36px', fontSize: '11px', fontWeight: 'bold' }}>
                                ડી.વી.એકાઉન્ટન્ટ / ઓડીટર<br />
                                (Div. Accountant / Auditor)
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', width: '22%' }}>
                            <div className="sign-line" style={{ borderTop: '1px solid #475569', paddingTop: '4px', marginTop: '36px', fontSize: '11px', fontWeight: 'bold' }}>
                                કાર્યપાલક ઈજનેર<br />
                                (Executive Engineer)
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
