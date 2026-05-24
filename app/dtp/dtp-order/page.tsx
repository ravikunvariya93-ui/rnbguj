'use client';

import { useState } from 'react';
import { FileText, Printer, X, Loader2 } from 'lucide-react';

interface DTPRecord {
    _id: string;
    dtpApprovalNo: string;
    dtpApprovalDate: string;
    tenderAmount?: number;
    tsId: { _id: string; packageName: string; subDivision?: string };
}

export default function DTPOrderPage() {
    const [approvalNo, setApprovalNo] = useState('');
    const [approvalDate, setApprovalDate] = useState('');
    const [dtps, setDtps] = useState<DTPRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [showOrders, setShowOrders] = useState(false);

    const getYear = () => {
        const parts = approvalDate.split('/');
        return parts.length === 3 && parts[2].length === 4 ? parts[2] : new Date().getFullYear().toString();
    };

    const handleGenerate = async () => {
        if (!approvalNo.trim() || !approvalDate.trim()) return;
        setLoading(true);
        try {
            const res = await fetch('/api/dtps');
            const data = await res.json();
            if (data.success) {
                // Filter: dtpApprovalNo must contain entered number,
                // and dtpApprovalDate must match the entered date (DD/MM/YYYY)
                const filtered = data.data.filter((dtp: DTPRecord) => {
                    const noMatch = dtp.dtpApprovalNo &&
                        dtp.dtpApprovalNo.toString().includes(approvalNo.trim());

                    const dateMatch = dtp.dtpApprovalDate &&
                        new Date(dtp.dtpApprovalDate).toLocaleDateString('en-GB') === approvalDate.trim();

                    return noMatch && dateMatch;
                });

                if (filtered.length === 0) {
                    alert(`No DTP found with DTP Approval No. containing "${approvalNo}" and Approval Date "${approvalDate}". Please check the DTP records.`);
                    return;
                }

                setDtps(filtered);
                setShowOrders(true);
            }
        } catch (error) {
            console.error('Error fetching DTPs:', error);
            alert('Failed to fetch DTP records. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fmt = (amt?: number) => amt ? amt.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-';

    return (
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="mb-10 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-4">
                    <FileText className="w-7 h-7 text-blue-700" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 font-sans">Generate DTP Order</h1>
                <p className="text-sm text-gray-500 mt-1">Enter the DTP approval details to generate the printable office orders.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        DTP Approval No. <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={approvalNo}
                        onChange={e => setApprovalNo(e.target.value)}
                        placeholder="588"
                        className="block w-full border border-gray-300 rounded-xl px-4 py-3 text-lg font-semibold tracking-wide text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        DTP Approval Date <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={approvalDate}
                        onChange={e => setApprovalDate(e.target.value)}
                        placeholder="21/05/2026"
                        className="block w-full border border-gray-300 rounded-xl px-4 py-3 text-lg font-semibold tracking-wide text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={!approvalNo.trim() || !approvalDate.trim() || loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-blue-600 text-white text-sm font-bold rounded-xl shadow hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    {loading ? 'Generating…' : 'Generate Order'}
                </button>
            </div>

            {/* Print Modal */}
            {showOrders && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8 px-4">
                    <div className="w-full max-w-4xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-white font-semibold text-sm">DTP Order Preview ({dtps.length} {dtps.length === 1 ? 'order' : 'orders'} found)</h2>
                            <div className="flex gap-3 text-sans">
                                <button
                                    onClick={() => window.print()}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow cursor-pointer transition-all"
                                >
                                    <Printer className="w-4 h-4" /> Print / Save as PDF
                                </button>
                                <button
                                    onClick={() => setShowOrders(false)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 cursor-pointer transition-all"
                                >
                                    <X className="w-4 h-4" /> Close
                                </button>
                            </div>
                        </div>
                        <div id="printable-orders" className="bg-white shadow-2xl rounded-lg overflow-hidden">
                            {dtps.map((dtp, idx) => (
                                <OrderContent
                                    key={dtp._id}
                                    dtp={dtp}
                                    enteredApprovalNo={approvalNo.trim()}
                                    approvalDate={approvalDate.trim()}
                                    getYear={getYear}
                                    fmt={fmt}
                                    style={{ pageBreakAfter: idx === dtps.length - 1 ? 'auto' : 'always' }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #printable-orders, #printable-orders * { visibility: visible; }
                    #printable-orders {
                        position: fixed; top: 0; left: 0;
                        width: 100%; height: auto;
                        box-shadow: none; border-radius: 0;
                        background: white;
                    }
                    @page {
                        margin: 0;
                        size: A4;
                    }
                }
            `}</style>
        </div>
    );
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

function OrderContent({ dtp, enteredApprovalNo, approvalDate, getYear, fmt, style }: {
    dtp: DTPRecord; enteredApprovalNo: string; approvalDate: string;
    getYear: () => string; fmt: (n?: number) => string;
    style?: React.CSSProperties;
}) {
    // Determine the full approval number
    // If the database has a full reference containing slashes (e.g., "PB/BVN/SBD/422"), use it.
    // Otherwise construct the default standard format
    const fullApprovalNo = dtp.dtpApprovalNo && dtp.dtpApprovalNo.includes('/') 
        ? dtp.dtpApprovalNo 
        : `DP/R&B/Tender/${enteredApprovalNo}/${getYear()}`;

    return (
        <div style={{
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '15px',
            lineHeight: '1.9',
            padding: '60px 72px',
            color: '#000',
            backgroundColor: '#fff',
            ...style
        }}>
            {/* Top Table / Header Layout */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '36px' }}>
                <tbody>
                    <tr>
                        <td style={{ verticalAlign: 'top', width: '40%', fontSize: '15px', padding: '0' }}>
                            <strong>No. </strong>{fullApprovalNo}
                        </td>
                        <td style={{ verticalAlign: 'top', width: '60%', textAlign: 'right', fontSize: '15px', padding: '0', fontWeight: 'bold', lineHeight: '1.4' }}>
                            District Panchayat Office<br />
                            Panchayat Road and Building Division, Bhavnagar.<br />
                            <span style={{ fontWeight: 'normal', fontSize: '15px' }}>Dt. {approvalDate}</span>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Office Order Title */}
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', textDecoration: 'underline', marginBottom: '32px', letterSpacing: '0.5px' }}>
                OFFICE ORDER
            </div>

            {/* Subject / Body Statement */}
            <div style={{ textAlign: 'justify', fontSize: '15px', lineHeight: '2.1', marginBottom: '32px', textIndent: '3em' }}>
                Standard Bidding Document (S.B.D.) for the work of <strong>{dtp.tsId?.packageName}</strong> amounting Rs. <strong>{fmt(dtp.tenderAmount)}</strong> ({numberToIndianWords(dtp.tenderAmount || 0)}) is hereby approved subject to following conditions.
            </div>

            {/* Conditions Section */}
            <div style={{ fontSize: '15px', marginBottom: '32px' }}>
                <strong style={{ fontSize: '15px' }}>Conditions: -</strong>
                <ol style={{ paddingLeft: '24px', marginTop: '8px', listStyleType: 'decimal', fontSize: '15px' }}>
                    <li style={{ marginBottom: '12px', textAlign: 'justify', lineHeight: '1.8' }}>
                        Necessary correction made in S.B.D. shall be checked thoroughly before issuing the tender copy to the contractor or online submission.
                    </li>
                    <li style={{ marginBottom: '12px', textAlign: 'justify', lineHeight: '1.8' }}>
                        Page number to all tender papers be given before issuing the final copy.
                    </li>
                    <li style={{ marginBottom: '12px', textAlign: 'justify', lineHeight: '1.8' }}>
                        Instruction contained in the technical note of T.S. Order shall be scrupulously followed.
                    </li>
                </ol>
            </div>

            {/* Executive Engineer Signature Block */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '40px', marginBottom: '40px', fontSize: '15px', textAlign: 'center' }}>
                <div style={{ lineHeight: '1.4' }}>
                    <div style={{ marginBottom: '52px' }}>&nbsp;</div>
                    <div style={{ fontWeight: 'bold' }}>Executive Engineer</div>
                    <div>Panchayat R &amp; B Division</div>
                    <div>Bhavnagar</div>
                </div>
            </div>

            {/* Copy To Block */}
            <div style={{ fontSize: '15px', marginTop: '24px', lineHeight: '1.5', textAlign: 'left' }}>
                <strong>Copy to: -</strong><br />
                Deputy Executive Engineer,<br />
                Panchayat R&amp;B Sub Division,<br />
                {dtp.tsId?.subDivision || 'Bhavnagar'}.
            </div>
        </div>
    );
}
