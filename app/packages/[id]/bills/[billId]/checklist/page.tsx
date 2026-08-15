import React from 'react';
import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import Package from '@/models/Package';
import Agency from '@/models/Agency';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import PrintButton from './PrintButton';

// Ensure models are registered
void WorkOrder;
void LOA;
void Tender;
void Package;
void Agency;

function ordinaleGu(n: number): string {
    // Gujarati ordinal: ૧લ, ૨જ, ૩જ, ૪થ …
    const guNums: Record<number, string> = { 1: '૧', 2: '૨', 3: '૩', 4: '૪', 5: '૫', 6: '૬', 7: '૭', 8: '૮', 9: '૯', 10: '૧૦' };
    const guN = guNums[n] ?? String(n);
    if (n === 1) return `${guN}લ`;
    if (n === 2) return `${guN}જ`;
    if (n === 3) return `${guN}જ`;
    return `${guN}મ`;
}

function formatDateDMY(d: Date | null | undefined): string {
    if (!d) return '-';
    const date = new Date(d);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
}

function fmtNum(n: number | null | undefined): string {
    if (n == null) return '-';
    return Math.round(n).toLocaleString('en-IN');
}

export default async function PackageBillChecklistPage({ 
    params 
}: { 
    params: Promise<{ id: string; billId: string }> 
}) {
    await dbConnect();
    const { id: packageId, billId } = await params;

    const bill = await Bill.findById(billId)
        .populate({
            path: 'workOrderId',
            populate: {
                path: 'loaId',
                populate: {
                    path: 'tenderId',
                    populate: { path: 'packageId' }
                }
            }
        })
        .lean();

    if (!bill) notFound();

    const workOrder = bill.workOrderId as any;
    const loa = workOrder?.loaId as any;
    const tender = loa?.tenderId as any;
    const pkg = tender?.packageId as any;

    const workName = tender?.packageName || pkg?.packageName || '-';
    const yojanaName = pkg?.budgetHead || '-';
    const saiddhantikAmount = pkg?.estimatedAmount ?? null;
    const adminApprovalAmount = tender?.estimatedAmount ?? null;
    const workOrderAmount = tender?.contractPrice ?? null;
    const contractorName = tender?.contractorName || '-';
    let contractorGstNo = '';
    if (tender?.contractorName) {
        const agency = await Agency.findOne({ name: tender.contractorName }).lean();
        contractorGstNo = agency?.gstNo || '';
    }
    const contractorDisplay = contractorName !== '-' && contractorGstNo 
        ? `${contractorName} (GST No: ${contractorGstNo})` 
        : contractorName;

    const billNum = bill.runningBillNumber || 1;
    const billSuffix = billNum === 1 ? 'st' : billNum === 2 ? 'nd' : billNum === 3 ? 'rd' : 'th';
    const billLabel = `${billNum}${billSuffix} and ${bill.billType} Bill`;

    const workOrderDate = formatDateDMY(workOrder?.workOrderDate);
    const completionDate = formatDateDMY(workOrder?.stipulatedCompletionDate);

    const mbNumber = (bill as any).mbNumber || '-';

    const rows: { no: string; text: string; sub?: string; included: string; }[] = [
        { no: '૧', text: 'સદર કામની સૈધ્ધાંતીક મંજુરી સામેલ છે. જેમાં સક્ષમ અધિકારીશ્રીની સહી થયેલ છે', included: 'હા' },
        { no: '૨', text: 'સદર કામની વહિવટી મંજુરી સામેલ છે. જેમાં સક્ષમ અધિકારીશ્રીની સહી થયેલ છે', included: 'હા' },
        { no: '૩', text: 'સદર કામની તાંત્રીક મંજુરી સામેલ છે. જેમાં સક્ષમ અધિકારીશ્રીની સહી થયેલ છે.', included: 'હા' },
        { no: '૪', text: 'સદર કામના એસ્ટીમેન્ટ સામેલ છે. જેમાં સક્ષમ અધિકારીશ્રીની સહી થયેલ છે', included: 'હા' },
        { no: '૫', text: 'સદર કામના શેડ્‌યુલ બી ની નકલ સામેલ છે. જેમાં સક્ષમ અધિ.શ્રીની સહી થયેલ છે', included: 'હા' },
        {
            no: '૬',
            text: 'સદર કામનો વર્ક ઓર્ડર સામેલ છે. જેમાં સક્ષમ અધિકારીશ્રીની સહી થયેલ છે',
            sub: `વર્ક ઓર્ડર આપ્યા તારીખ: ${workOrderDate}      કામ પૂર્ણ કરવાની તારીખ: ${completionDate}`,
            included: 'હા'
        },
        { no: '૭', text: 'સદર કામના મટીરીયલ્સના અસલ બિલો સામેલ છે / પ્રમાણીત નકલ સામેલ છે.', included: 'હા' },
        { no: '૮', text: 'સદર કામના ફોટોગ્રાફસ સામેલ છે ? જેમા કામનું નામ અને સક્ષમ અધિ.શ્રીની સહી થયેલ છે.', included: '--' },
        { no: '૯', text: 'સદર કામના ટેસ્ટીંગ રીઝલ્ટ સામેલ છે.', included: 'હા' },
        { no: '૧૦', text: 'સદર કામ સમય મર્યાદામાં પૂર્ણ થયેલ છે', included: 'હા' },
        { no: '૧૧', text: 'જો ના તો સદર કામનું નિયમાનુસાર વિલંબ વળતર કાપવામાં આવેલ છે', included: '--' },
        { no: '૧૨', text: `સદર કામની એમ.બી. સામેલ છે - ${mbNumber}`, included: 'હા' },
        { no: '૧૩', text: 'સદર કામની એમ.બી. માં નોંધ કરવામાં આવેલ છે એબ્સ્ટ્રેક સહિત પાના નં.-', included: 'હા' },
        { no: '૧૪', text: 'સદર કામનું એમ.બી.માં નિયમાનુસારનું ચેકીંગ દર્શાવેલ છે એમ.બી. પાના નં.', included: 'હા' },
        { no: '૧૫', text: 'PRAISA સૉફ્ટવૅરમાં બિલ તૈયાર કરવામાં આવેલ છે બિલ ન.', included: 'હા' },
        { no: '૧૬', text: 'સદર બિલમાં સરકારશ્રીના નિયમાનુસારની તમામ કપાત કરવામાં આવેલ છે', included: 'હા' },
        { no: '૧૭', text: 'સદર ઑનલાઇન અને ઑફલાઇન બિલમાં અને એમ.બી.માં પાસ ફૉર પેમેન્ટ કરવામાં આવેલ છે અને જેમાં ઑડીટર/ ડી.વી.એકા./સક્ષમ અધિકારીશ્રીની સહી થયેલ છે', included: 'હા' },
        { no: '૧૮', text: 'સદર કામનું એક્સેસ પત્રક સામેલ છે અને સક્ષમ અધિકારીશ્રીની સહી થયેલ છે. જો એક્સેસ થયેલ હોય તો બિલમાંથી થયેલ એક્સેસની કપાત નિયમાનુસાર કરવામાં આવેલ છે.', included: 'હા' },
        { no: '૧૯', text: 'ફાઇનલ બિલ હોય તો સ્ટાર રેઇટ ના બિલો સામેલ રાખેલ છે જેમાં સક્ષમ અધિકારીશ્રીની સહી થયેલ છે. જો સ્ટાર રેઇટ માઇનસ હોય તો બિલમાંથી કપાત કરવામાં આવેલ છે.', included: 'હા' },
        { no: '૨૦', text: 'A2 બિલ હોય તો ટૅન્ડરમાં એજન્સી અને સક્ષમ અધિકારીશ્રીની સહી થયેલ છે.', included: '--' },
        { no: '૨૧', text: 'વાર્ષિક ભાવો મુજબ કામ આપવામાં આવેલ હોય તો સક્ષમ કક્ષાએથી મંજૂર કરવામાં આવેલ ભાવોના આધારો સામેલ રાખેલ છે.', included: '--' },
        { no: '૨૨', text: 'સદર કામનું કૉમ્પ્લીશન સર્ટિફિકેટ સામેલ છે જેમાં સક્ષમ અધિકારીશ્રીની સહી થયેલ છે', included: 'હા' },
        { no: '૨૩', text: 'બિલમાં ગ્રાન્ટની વિગતો દર્શાવવામાં આવેલ છે', included: 'હા' },
        { no: '૨૪', text: 'બિલમાં ઑડીટરશ્રી દ્વારા એરિથ્મેટિક ચેકીંગ દર્શાવેલ છે.', included: 'હા' },
    ];

    return (
        <>
            {/* Screen toolbar - hidden on print */}
            <div className="no-print bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <Link 
                        href={`/packages/${packageId}/bills?billId=${billId}`} 
                        className="text-gray-500 hover:text-gray-700 transition-colors p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
                        title="Back to Bill"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <span className="font-semibold text-gray-800">Bill Checklist — {billLabel}</span>
                </div>
                <PrintButton />
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { margin: 0; }
                    @page { size: A4 portrait; margin: 8mm 8mm 8mm 8mm; }
                    .checklist-page { padding: 0 !important; max-width: 100% !important; }
                    .checklist-table th, .checklist-table td,
                    .header-table td, .info-table td {
                        font-size: 9.5pt !important;
                        padding: 2px 5px !important;
                        line-height: 1.3 !important;
                    }
                    .header-table td { font-size: 10pt !important; }
                    .sign-row { margin-top: 10px !important; }
                    .sign-line { margin-top: 20px !important; }
                    p { font-size: 9pt !important; margin-top: 6px !important; }
                }
                body { font-family: 'Noto Sans Gujarati', 'Noto Sans', Arial, sans-serif; }
                .checklist-table { border-collapse: collapse; width: 100%; }
                .checklist-table th, .checklist-table td {
                    border: 1px solid #222;
                    padding: 3px 6px;
                    vertical-align: top;
                    font-size: 11.5px;
                    line-height: 1.35;
                }
                .checklist-table th { background: #f0f0f0; font-weight: bold; text-align: center; }
                .header-table { border-collapse: collapse; width: 100%; margin-bottom: 4px; }
                .header-table td { border: 1px solid #222; padding: 3px 6px; font-size: 11.5px; }
                .info-table { border-collapse: collapse; width: 100%; margin-bottom: 3px; }
                .info-table td { border: 1px solid #222; padding: 2px 6px; font-size: 11.5px; }
                .dynamic { font-weight: 700; }
                .sign-row { margin-top: 16px; display: flex; justify-content: space-between; }
                .sign-cell { text-align: center; font-size: 11.5px; width: 32%; }
                .sign-line { border-top: 1px solid #444; padding-top: 4px; margin-top: 30px; }
            `}</style>

            {/* Printable area */}
            <div className="checklist-page" style={{ padding: '16px 24px', maxWidth: '860px', margin: '0 auto', fontFamily: "'Noto Sans Gujarati', 'Noto Sans', Arial, sans-serif" }}>
                
                {/* Office header */}
                <table className="header-table">
                    <tbody>
                        <tr>
                            <td colSpan={2} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px', padding: '8px' }}>
                                જિલ્લા પંચાયત કચેરી, ભાવનગર
                            </td>
                            <td colSpan={4} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px', padding: '8px' }}>
                                કામના બિલો સાથે રાખવાનું ચેકલિસ્ટ
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Project info table */}
                <table className="info-table">
                    <tbody>
                        <tr>
                            <td style={{ width: '3%', textAlign: 'center' }}>૧</td>
                            <td style={{ width: '22%' }}>કામનું નામ:-</td>
                            <td className="dynamic" colSpan={4}>{workName}</td>
                        </tr>
                        <tr>
                            <td style={{ textAlign: 'center' }}>૨</td>
                            <td>યોજનાનું નામ:-</td>
                            <td className="dynamic" colSpan={4}>{yojanaName}</td>
                        </tr>
                        <tr>
                            <td style={{ textAlign: 'center' }}>૩</td>
                            <td>સૈધ્ધાંતીક મંજૂરીની રકમ:-</td>
                            <td className="dynamic" colSpan={4}>{saiddhantikAmount != null ? fmtNum(saiddhantikAmount) : '-'}</td>
                        </tr>
                        <tr>
                            <td style={{ textAlign: 'center' }}>૪</td>
                            <td>વહિવટી મંજૂરીની રકમ:-</td>
                            <td className="dynamic" colSpan={4}>{adminApprovalAmount != null ? fmtNum(adminApprovalAmount) : '-'}</td>
                        </tr>
                        <tr>
                            <td style={{ textAlign: 'center' }}>૫</td>
                            <td>વર્ક ઓર્ડરની રકમ:-</td>
                            <td className="dynamic" colSpan={4}>{workOrderAmount != null ? fmtNum(workOrderAmount) : '-'}</td>
                        </tr>
                        <tr>
                            <td style={{ textAlign: 'center' }}>૬</td>
                            <td className="dynamic">{billLabel}</td>
                            <td className="dynamic" colSpan={4}>{contractorDisplay}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Checklist table */}
                <table className="checklist-table">
                    <thead>
                        <tr>
                            <th style={{ width: '5%' }}>ક્રમ</th>
                            <th style={{ width: '72%' }}>વિગત</th>
                            <th style={{ width: '10%' }}>સામેલ</th>
                            <th style={{ width: '13%' }}>પાના નંબર</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <React.Fragment key={row.no}>
                                <tr>
                                    <td style={{ textAlign: 'center', verticalAlign: row.sub ? 'top' : 'middle' }} rowSpan={row.sub ? 2 : 1}>{row.no}</td>
                                    <td>{row.text}</td>
                                    <td style={{ textAlign: 'center' }}>{row.included}</td>
                                    <td rowSpan={row.sub ? 2 : 1}>&nbsp;</td>
                                </tr>
                                {row.sub && (
                                    <tr>
                                        <td className="dynamic" style={{ fontSize: '12px' }}>{row.sub}</td>
                                        <td style={{ textAlign: 'center' }}>{row.included}</td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>

                {/* Signature row */}
                <div className="sign-row" style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between' }}>
                    <div className="sign-cell" style={{ textAlign: 'center', fontSize: '13px', width: '32%' }}>
                        <div className="sign-line" style={{ borderTop: '1px solid #444', paddingTop: '4px', marginTop: '40px' }}>ઓડીટરશ્રી</div>
                    </div>
                    <div className="sign-cell" style={{ textAlign: 'center', fontSize: '13px', width: '32%' }}>
                        <div className="sign-line" style={{ borderTop: '1px solid #444', paddingTop: '4px', marginTop: '40px' }}>ડી.વી.એકા.શ્રી</div>
                    </div>
                    <div className="sign-cell" style={{ textAlign: 'center', fontSize: '13px', width: '32%' }}>
                        <div className="sign-line" style={{ borderTop: '1px solid #444', paddingTop: '4px', marginTop: '40px' }}>કા.ઇ.શ્રી</div>
                    </div>
                </div>
            </div>
        </>
    );
}
