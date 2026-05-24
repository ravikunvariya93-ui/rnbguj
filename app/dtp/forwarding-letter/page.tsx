'use client';

import { useState } from 'react';
import { FileText, Printer, X, Loader2 } from 'lucide-react';

interface DTPRecord {
    _id: string;
    dtpSendingNo: string;
    dtpSendingDate: string;
    tenderAmount?: number;
    tsId: { _id: string; packageName: string };
}

export default function DTPForwardingLetterPage() {
    const [wsNumber, setWsNumber] = useState('');
    const [letterDate, setLetterDate] = useState('');
    const [dtps, setDtps] = useState<DTPRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [showLetter, setShowLetter] = useState(false);

    const getYear = () => {
        const parts = letterDate.split('/');
        return parts.length === 3 && parts[2].length === 4 ? parts[2] : new Date().getFullYear().toString();
    };

    const fullWsNo = `DP/R&B/Tender/${wsNumber}/${getYear()}`;

    const handleGenerate = async () => {
        if (!wsNumber.trim() || !letterDate.trim()) return;
        setLoading(true);
        try {
            const res = await fetch('/api/dtps');
            const data = await res.json();
            if (data.success) {
                // Filter: dtpSendingNo must contain entered number,
                // and dtpSendingDate must match the entered date (DD/MM/YYYY)
                const filtered = data.data.filter((dtp: DTPRecord) => {
                    // Match WS number (field may store just "587" or full string)
                    const noMatch = dtp.dtpSendingNo &&
                        dtp.dtpSendingNo.toString().includes(wsNumber.trim());

                    // Match date
                    const dateMatch = dtp.dtpSendingDate &&
                        new Date(dtp.dtpSendingDate).toLocaleDateString('en-GB') === letterDate.trim();

                    return noMatch && dateMatch;
                });

                if (filtered.length === 0) {
                    alert(`No DTP found with WS No. containing "${wsNumber}" and sending date "${letterDate}". Please check the DTP records.`);
                    return;
                }

                setDtps(filtered);
                setShowLetter(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const fmt = (amt?: number) => amt ? amt.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-';
    const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB') : '-';

    return (
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="mb-10 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-4">
                    <FileText className="w-7 h-7 text-blue-700" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">DTP Forwarding Letter</h1>
                <p className="text-sm text-gray-500 mt-1">Enter the letter details to generate the forwarding letter for all DTPs.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Letter / WS No. <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={wsNumber}
                        onChange={e => setWsNumber(e.target.value)}
                        placeholder="587"
                        className="block w-full border border-gray-300 rounded-xl px-4 py-3 text-lg font-semibold tracking-wide text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Date of Letter <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={letterDate}
                        onChange={e => setLetterDate(e.target.value)}
                        placeholder="21/05/2026"
                        className="block w-full border border-gray-300 rounded-xl px-4 py-3 text-lg font-semibold tracking-wide text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={!wsNumber.trim() || !letterDate.trim() || loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-blue-600 text-white text-sm font-bold rounded-xl shadow hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    {loading ? 'Generating…' : 'Generate Letter'}
                </button>
            </div>

            {/* Letter Modal */}
            {showLetter && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8 px-4">
                    <div className="w-full max-w-5xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-white font-semibold text-sm">DTP Forwarding Letter Preview</h2>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => window.print()}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow"
                                >
                                    <Printer className="w-4 h-4" /> Print / Save as PDF
                                </button>
                                <button
                                    onClick={() => setShowLetter(false)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20"
                                >
                                    <X className="w-4 h-4" /> Close
                                </button>
                            </div>
                        </div>
                        <div id="printable-letter" className="bg-white shadow-2xl rounded-lg">
                            <LetterContent wsNo={fullWsNo} letterDate={letterDate} dtps={dtps} fmt={fmt} fmtDate={fmtDate} />
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #printable-letter, #printable-letter * { visibility: visible; }
                    #printable-letter {
                        position: fixed; top: 0; left: 0;
                        width: 100%; height: auto;
                        box-shadow: none; border-radius: 0;
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

function LetterContent({ wsNo, letterDate, dtps, fmt, fmtDate }: {
    wsNo: string; letterDate: string; dtps: DTPRecord[];
    fmt: (n?: number) => string; fmtDate: (d?: string) => string;
}) {
    const total = dtps.reduce((s, d) => s + (d.tenderAmount || 0), 0);

    return (
        <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '14px', lineHeight: '1.9', padding: '60px 72px', color: '#000' }}>

            {/* Office Header */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{ fontSize: '15px', fontWeight: 'bold' }}>Panchayat Road and Building Division</div>
                <div style={{ fontSize: '15px', fontWeight: 'bold' }}>District Panchayat Office</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Moti Bagh, Bhavnagar - 364 001</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Phone: 0278-2422548 &nbsp;|&nbsp; E-Mail: exernb-ddo-bav@gujarat.gov.in</div>
                <div style={{ borderBottom: '2px solid black', marginTop: '12px' }} />
            </div>

            {/* No. and Date */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '28px', fontSize: '14px' }}>
                <div><span style={{ fontWeight: 'bold' }}>No. </span>{wsNo}</div>
                <div><span style={{ fontWeight: 'bold' }}>Date: </span>{letterDate}</div>
            </div>

            {/* To */}
            <div style={{ marginBottom: '24px', fontSize: '14px' }}>
                <div style={{ fontWeight: 'bold' }}>To,</div>
                <div style={{ marginLeft: '24px' }}>The Superintending Engineer,</div>
                <div style={{ marginLeft: '24px' }}>Panchayat Road and Building Circle - 2,</div>
                <div style={{ marginLeft: '24px' }}>Rajkot.</div>
            </div>

            {/* Subject */}
            <div style={{ marginBottom: '20px', fontSize: '14px', lineHeight: '1.8', paddingLeft: '4em' }}>
                <span style={{ fontWeight: 'bold' }}>Subject:</span>
                <span style={{ display: 'inline-block', width: '1em' }}></span>
                <span style={{ fontWeight: 'bold' }}>Regarding Approval of Standard Bidding Document (S.B.D.)</span>
            </div>

            {/* Body */}
            <div style={{ marginBottom: '24px', fontSize: '14px', textAlign: 'justify', lineHeight: '2' }}>
                <p style={{ margin: '0', textIndent: '2em' }}>
                    Respectfully, with reference to the above cited subject, it is submitted that the Standard Bidding Document (S.B.D.) in respect of the works detailed in the table below, pertaining to this Division, have been prepared and are hereby forwarded for approval.
                </p>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '16px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                        <th style={{ border: '1px solid black', padding: '8px 10px', textAlign: 'center', width: '46px' }}>Sr.<br />No.</th>
                        <th style={{ border: '1px solid black', padding: '8px 10px', textAlign: 'center' }}>Name of Work</th>
                        <th style={{ border: '1px solid black', padding: '8px 10px', textAlign: 'center', width: '150px' }}>DTP Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    {dtps.map((dtp, i) => (
                        <tr key={dtp._id}>
                            <td style={{ border: '1px solid black', padding: '8px 10px', textAlign: 'center', verticalAlign: 'top' }}>{i + 1}</td>
                            <td style={{ border: '1px solid black', padding: '8px 10px', verticalAlign: 'top' }}>{dtp.tsId?.packageName}</td>
                            <td style={{ border: '1px solid black', padding: '8px 10px', textAlign: 'right', verticalAlign: 'top', fontFamily: 'monospace' }}>{fmt(dtp.tenderAmount)}</td>
                        </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold', backgroundColor: '#f9fafb' }}>
                        <td colSpan={2} style={{ border: '1px solid black', padding: '8px 10px', textAlign: 'right' }}>Total</td>
                        <td style={{ border: '1px solid black', padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(total)}</td>
                    </tr>
                </tbody>
            </table>

            {/* Signature */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', fontSize: '14px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: '48px' }}>&nbsp;</div>
                    <div style={{ fontWeight: 'bold' }}>Executive Engineer</div>
                    <div>Panchayat Road and Building Division</div>
                    <div>Bhavnagar</div>
                </div>
            </div>

            {/* Enclosure */}
            <div style={{ marginTop: '32px', fontSize: '14px' }}>
                <span style={{ fontWeight: 'bold' }}>Enclosure: </span>As above.
            </div>
        </div>
    );
}
