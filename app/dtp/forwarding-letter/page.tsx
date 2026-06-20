'use client';

import { useState } from 'react';
import { FileText, Printer, X, Loader2, Download, Edit3 } from 'lucide-react';
import { logoBase64 } from '@/lib/logoBase64';

interface DTPRecord {
    _id: string;
    dtpSendingNo: string;
    dtpSendingDate: string;
    tenderAmount?: number;
    tsId: { _id: string; packageName: string };
}

function formatToUTCDateStr(dateInput?: string | Date) {
    if (!dateInput) return '-';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
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

    const is591 = wsNumber.trim().includes('591');
    const year = is591 ? '2025' : getYear();
    const cleanWsNumber = wsNumber.trim().replace('/2026', '');
    const fullWsNo = `DP/R&B/Tender/${cleanWsNumber}/${year}`;

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
                        formatToUTCDateStr(dtp.dtpSendingDate) === letterDate.trim();

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
    const fmtDate = (d?: string) => d ? formatToUTCDateStr(d) : '-';

    return (
        <>
            <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-16 screen-only">
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
                                        onClick={exportToDoc}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 shadow cursor-pointer transition-all"
                                    >
                                        <Download className="w-4 h-4" /> Export to Word
                                    </button>
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
                            <div className="bg-white shadow-2xl rounded-lg">
                                <LetterContent wsNo={fullWsNo} letterDate={letterDate} dtps={dtps} fmt={fmt} fmtDate={fmtDate} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Dedicated Hidden Printable Area outside parent max-w and positioning wrappers */}
            {showLetter && (
                <div id="print-area" className="print-only">
                    <LetterContent wsNo={fullWsNo} letterDate={letterDate} dtps={dtps} fmt={fmt} fmtDate={fmtDate} />
                </div>
            )}

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

                    /* Reset only the layout wrapper chain (not their deep children).
                       Structure: body > div(flex h-screen overflow-hidden)
                                       > main(overflow-y-auto md:ml-64)
                                           > div(max-w-7xl)
                                               > Fragment children */
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
                        padding: 1cm 2cm !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        box-sizing: border-box !important;
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


    const exportToDoc = () => {
        const element = document.getElementById('print-area');
        if (!element) return;
        const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
        const postHtml = "</body></html>";
        let html = element.innerHTML;
        html = preHtml + html + postHtml;
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
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

function LetterContent({ wsNo, letterDate, dtps, fmt, fmtDate }: {
    wsNo: string; letterDate: string; dtps: DTPRecord[];
    fmt: (n?: number) => string; fmtDate: (d?: string) => string;
}) {

    return (
        <div className="printable-container" id="print-area" contentEditable suppressContentEditableWarning style={{ outline: "none", fontFamily: 'Cambria, Georgia, serif', fontSize: '14px', lineHeight: '1.5', padding: '40px 60px', color: '#000', boxSizing: 'border-box' }}>

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
                <div><span style={{ fontWeight: 'bold' }}>No. </span>{wsNo}</div>
                <div><span style={{ fontWeight: 'bold' }}>Dt. - &nbsp;&nbsp;&nbsp;</span>{letterDate}</div>
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
                    {dtps.map((dtp, i) => (
                        <tr key={dtp._id}>
                            <td style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'center', verticalAlign: 'top' }}>{i + 1}</td>
                            <td style={{ border: '1px solid black', padding: '6px 8px', verticalAlign: 'top' }}>{dtp.tsId?.packageName}</td>
                            <td style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'right', verticalAlign: 'top', fontFamily: 'monospace' }}>{fmt(dtp.tenderAmount)}</td>
                        </tr>
                    ))}
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

    );
}
