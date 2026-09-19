'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, Download, Edit3 } from 'lucide-react';
import { formatDate, formatDateDMYIST, getISTYear } from '@/lib/dateUtils';

interface NoticeLetterClientProps {
    packageData: any;
    tender: any;
    loa: any;
    notice: any;
    noticeIndex: number;
    notices: any[];
    agency: any;
}

function toGujaratiDigits(str: string | number): string {
    const gujaratiDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
    return String(str).replace(/[0-9]/g, (w) => gujaratiDigits[parseInt(w, 10)]);
}

function formatDateDash(dateInput?: string) {
    return formatDateDMYIST(dateInput);
}

function formatDateSlash(dateInput?: string) {
    return formatDate(dateInput);
}

function getYearFromDate(dateInput?: string) {
    return getISTYear(dateInput);
}

const NOTICE_ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];

export default function NoticeLetterClient({ packageData, tender, loa, notice, noticeIndex, notices, agency }: NoticeLetterClientProps) {
    // Add/remove notice-printing class on body so print CSS is scoped only to this page
    useEffect(() => {
        const onBefore = () => document.body.classList.add('notice-printing');
        const onAfter = () => document.body.classList.remove('notice-printing');
        window.addEventListener('beforeprint', onBefore);
        window.addEventListener('afterprint', onAfter);
        return () => {
            window.removeEventListener('beforeprint', onBefore);
            window.removeEventListener('afterprint', onAfter);
            document.body.classList.remove('notice-printing');
        };
    }, []);

    const exportToDoc = () => {
        const element = document.getElementById('print-area');
        if (!element) return;
        const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
        const postHtml = "</body></html>";
        const html = preHtml + element.innerHTML + postHtml;
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
        const filename = `Notice_${noticeIndex + 1}.doc`;
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

    const ordinal = NOTICE_ORDINALS[noticeIndex] || `${noticeIndex + 1}th`;
    const isFirstNotice = noticeIndex === 0;
    const wsNo = notice?.wsNo || '-';
    const noticeYear = getYearFromDate(notice?.noticeDate);
    const noticeDateOut = formatDateDash(notice?.noticeDate);
    const contractorName = tender?.contractorName || '-';
    const contractorAddress = agency?.address || '';
    const mobileNo = agency?.mobileNo || '';
    const workName = tender?.packageName || packageData?.packageName || '-';
    const refNo = loa?.acceptanceLetterWorksheetNo || '-';
    const refYear = getYearFromDate(loa?.acceptanceLetterDate);
    const refDate = formatDateSlash(loa?.acceptanceLetterDate);

    // Previous notices become સંદર્ભ (૨), (૩), … for second notice onwards
    const prevNotices = (Array.isArray(notices) ? notices : []).slice(0, noticeIndex);
    const prevRefNames = prevNotices.map((_: any, k: number) => `સંદર્ભપત્ર-(${toGujaratiDigits(k + 2)})`);
    let prevRefsText = '';
    if (prevRefNames.length === 1) prevRefsText = prevRefNames[0];
    else if (prevRefNames.length === 2) prevRefsText = `${prevRefNames[0]} અને ${prevRefNames[1]}`;
    else if (prevRefNames.length > 2) prevRefsText = `${prevRefNames.slice(0, -1).join(', ')} અને ${prevRefNames[prevRefNames.length - 1]}`;

    return (
        <>
            {/* Action Bar */}
            <div className="bg-slate-800 py-4 px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 screen-only sticky top-0 z-50 shadow-md">
                <div className="flex items-center gap-4">
                    <Link href={`/packages/${packageData._id}`} className="p-2 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-300" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Edit3 className="w-4 h-4 text-slate-400" /> {ordinal} Notice</h1>
                        <p className="text-sm text-slate-400">Click anywhere on the document below to edit before printing/exporting.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={exportToDoc} className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export to Word
                    </button>
                    <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2">
                        <Printer className="w-4 h-4" /> Print Notice
                    </button>
                </div>
            </div>

            {/* Editable Document Preview */}
            <div id="print-area" className="print-only">
                <div className="printable-container text-black bg-white" contentEditable suppressContentEditableWarning style={{ outline: 'none', fontFamily: "'Noto Sans Gujarati', 'Nirmala UI', Arial, sans-serif", fontSize: '14px', lineHeight: '1.6', padding: '40px 60px', color: '#000', boxSizing: 'border-box' }}>

                    {/* Office Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <img src="/notice-logo.jpeg" alt="logo" style={{ width: '64px', height: '64px', objectFit: 'contain', flexShrink: 0 }} />
                        <div style={{ textAlign: 'center', flex: 1, lineHeight: '1.4' }}>
                            <div style={{ fontSize: '15px', fontWeight: 'bold' }}>જિલ્લા પંચાયત કચેરી, પંચાયત માર્ગ અને મકાન વિભાગ, મોતીબાગ, ભાવનગર-૩૬૪૦૦૧</div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '2px' }}>ફોનઃ૦૨૭૮-૨૪૨૨૫૪૮, E-Mail :- exernb-ddo-bav@gujarat.gov.in</div>
                        </div>
                    </div>
                    <div style={{ borderBottom: '2px solid black', marginBottom: '8px' }} />

                    {/* Kraman + Date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                        <div>ક્રમાંક: ડીપી/મામવિ/ટેન્ડર/વશી/{wsNo}/{noticeYear}</div>
                        <div>તા. {noticeDateOut}</div>
                    </div>

                    {/* Title */}
                    <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', marginBottom: '8px', textDecoration: 'underline' }}>{isFirstNotice ? 'નોટીસ' : 'આખરી નોટીસ'}</div>

                    <div style={{ fontSize: '14px', textDecoration: 'underline' }}>Register AD,</div>
                    <div style={{ fontSize: '14px', marginTop: '4px' }}>પ્રતિ,</div>
                    <div style={{ fontSize: '14px', marginTop: '4px' }}>{contractorName},</div>
                    {contractorAddress && <div style={{ fontSize: '14px' }}>{contractorAddress}</div>}
                    {mobileNo && <div style={{ fontSize: '14px' }}>Mo. {mobileNo}</div>}

                    {/* Subject / Work / Reference — indented, values in one aligned column */}
                    <table style={{ fontSize: '14px', marginTop: '0', marginLeft: '110px', borderCollapse: 'collapse', lineHeight: '1.7' }}>
                        <tbody>
                            <tr>
                                <td style={{ verticalAlign: 'top', whiteSpace: 'nowrap', paddingRight: '28px' }}>વિષય :-</td>
                                <td>મંજુર થયેલ ટેન્ડરના કરાર માટે ડીપોઝીટ રજુ કરવા બાબત</td>
                            </tr>
                            <tr>
                                <td style={{ verticalAlign: 'top', whiteSpace: 'nowrap', paddingRight: '28px' }}>કામનું નામ:-</td>
                                <td>{workName}</td>
                            </tr>
                            <tr>
                                <td style={{ verticalAlign: 'top', whiteSpace: 'nowrap', paddingRight: '28px' }}>સંદર્ભ :-</td>
                                <td>
                                    {isFirstNotice ? (
                                        <>અત્રેની કચેરીના પત્ર નં.ડીપી/મામવિ/ટેન્ડર/વશી/{refNo}/{refYear}, તા.{refDate}</>
                                    ) : (
                                        <>
                                            <div>(૧) અત્રેની કચેરીના પત્ર નં.ડીપી/મામવિ/ટેન્ડર/વશી/{refNo}/{refYear}, તા.{refDate}</div>
                                            {prevNotices.map((pn: any, k: number) => (
                                                <div key={k}>({toGujaratiDigits(k + 2)}) અત્રેની કચેરીના નોટિસ નં.ડીપી/મામવિ/ટેન્ડર/વશી/{pn?.wsNo || '-'}/{getYearFromDate(pn?.noticeDate)}, Dt.{formatDateDash(pn?.noticeDate)}</div>
                                            ))}
                                        </>
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Body */}
                    {isFirstNotice ? (
                        <div style={{ textAlign: 'justify', marginTop: '10px', fontSize: '14px', lineHeight: '1.7', textIndent: '5ch' }}>
                            ઉપરોકત વિષય અન્વયે જણાવવાનું કે, અત્રેના વિભાગ હસ્તકનું ઉપરોક્ત કામનું તમારૂ ટેન્ડર મંજુર થયેલ છે. જે અન્વયે સંદર્ભના પત્રથી તમોને આ કામના કરાર કરવા માટેનો ટેન્ડર સ્વીકાર પત્ર મોકલવામાં આવેલ અને દિન-૧૦ માં ડીપોઝીટ તથા સ્ટેમ્પ ડયુટી રજુ કરવા જણાવેલ હતું. તેમ છતા તમારા તરફથી આજ દિન સુધી કરાર માટેની ડીપોઝીટ રજુ થયેલ નથી. જેથી આ નોટીસથી તમોને તાકીદ કરવામાં આવે છે કે, આ નોટીસ મળ્યે દિન-૫ (પાંચ) માં સંદર્ભના પત્રમાં જણાવ્યા મુજબની ડીપોઝીટ રજુ કરશો, જો સમય મર્યાદામાં તમારા તરફથી ડીપોઝીટ રજુ કરી કરાર કરવામાં નહીં આવે તો સ્ટાન્ડર્ડ બીડીંગ ડોક્યુમેન્ટની શરતો અનુસારની કાર્યવાહી કરવામાં આવશે, જેની સંપૂર્ણ જવાબદારી તમારી અંગત રહેશે જેની નોંધ લેશો.
                        </div>
                    ) : (
                        <>
                            <div style={{ textAlign: 'justify', marginTop: '10px', fontSize: '14px', lineHeight: '1.7', textIndent: '5ch' }}>
                                ઉપરોકત વિષય અન્વયે જણાવવાનું કે, અત્રેના વિભાગ હસ્તકનું ઉપરોક્ત કામનું તમારૂ ટેન્ડર મંજુર થયેલ છે. જે અન્વયે સંદર્ભપત્ર-(૧) થી આપને આ કામના કરાર કરવા માટેનો ટેન્ડર સ્વીકાર પત્ર મોકલવામાં આવેલ અને દિન-૧૦ માં ડીપોઝીટ તથા સ્ટેમ્પ ડયુટી રજુ કરવા જણાવેલ હતું. તેમ છતા તમારા તરફથી કરાર માટેની ડીપોઝીટ રજુ ન થતા {prevRefsText} ની નોટીસથી આપને તાકીદ કરવામાં આવેલ કે, સદરહું નોટીસ મળ્યેથી દિન-૫ (પાંચ) માં સંદર્ભપત્ર-(૧) માં જણાવ્યા મુજબની ડીપોઝીટ રજુ કરશો, જો સમય મર્યાદામાં તમારા તરફથી ડીપોઝીટ રજુ કરી કરાર કરવામાં નહીં આવે તો સ્ટાન્ડર્ડ બીડીંગ ડોક્યુમેન્ટની શરતો અનુસારની કાર્યવાહી કરવામાં આવશે, જેની સંપૂર્ણ જવાબદારી તમારી અંગત રહેશે.
                            </div>
                            <div style={{ textAlign: 'justify', marginTop: '8px', fontSize: '14px', lineHeight: '1.7' }}>
                                ઉપરોક્ત કામનો કરાર આજદિન સુધી કરવામાં આવેલ નથી. જેથી આ આખરી નોટીસથી આપને તાકીદ કરવામાં આવે છે કે, આ નોટીસ મળ્યેથી દિન-૩ (ત્રણ) માં સંદર્ભપત્ર-(૧) માં જણાવ્યા મુજબની ડીપોઝીટ રજુ કરશો, જો સમય મર્યાદામાં તમારા તરફથી ડીપોઝીટ રજુ કરી કરાર કરવામાં નહીં આવે તો સ્ટાન્ડર્ડ બીડીંગ ડોક્યુમેન્ટની શરતો અનુસારની કાર્યવાહી કરવામાં આવશે, જેની સંપૂર્ણ જવાબદારી તમારી અંગત રહેશે.
                            </div>
                            <div style={{ textAlign: 'justify', marginTop: '8px', fontSize: '14px', lineHeight: '1.7' }}>
                                વધુમાં જણાવવાનું કે, જો આપના દ્વારા દિન-૩ માં સંદર્ભપત્ર-(૧) માં જણાવ્યા મુજબની ડીપોઝીટ રજુ કરવામાં ન આવે તો આ કામનું રી-ટેન્ડર કરી આપની સામે સ્ટાન્ડર્ડ બીડીંગ ડોક્યુમેન્ટની શરતો અનુસારની શિક્ષાત્મક કાર્યવાહી કેમ ન કરવી તે અંગેનો ખુલાસો રજુ કરશો.
                            </div>
                        </>
                    )}

                    {/* Signature */}
                    <div style={{ fontSize: '14px', lineHeight: '1.7' }}>&nbsp;</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', fontSize: '14px' }}>
                        <div style={{ textAlign: 'center', lineHeight: '1.6' }}>
                            <div>કાર્યપાલક ઇજનેર</div>
                            <div>પંચાયત માર્ગ અને મકાન વિભાગ</div>
                            <div>ભાવનગર</div>
                        </div>
                    </div>

                    {/* Copies — only on first notice, as per the docs */}
                    {isFirstNotice && (
                        <div style={{ marginTop: '16px', fontSize: '14px' }}>
                            <div style={{ textDecoration: 'underline' }}>નકલ સવિનય રવાના:-</div>
                            <div>(૧) મુખ્ય ઇજનેર સાહેબ, ગુણવત્તા નિયમન, મા.મ.વિભાગ, સચિવાલય, ગાંધીનગર</div>
                            <div>(ર) અધિક્ષક ઇજનેરશ્રી, પંચા.મા.મ. વર્તુળ-ર, રાજકોટ</div>
                        </div>
                    )}
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
                    body.notice-printing *,
                    body.notice-printing *::before,
                    body.notice-printing *::after {
                        height: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        overflow: visible !important;
                    }
                    body.notice-printing {
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    body.notice-printing .screen-only,
                    body.notice-printing header,
                    body.notice-printing nav,
                    body.notice-printing aside,
                    body.notice-printing button,
                    body.notice-printing svg,
                    body.notice-printing [role="navigation"] {
                        display: none !important;
                    }
                    body.notice-printing .print-only {
                        display: block !important;
                        position: static !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                    body.notice-printing #print-area {
                        display: block !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    body.notice-printing .printable-container {
                        padding: 1cm 2cm !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        box-sizing: border-box !important;
                        min-height: 0 !important;
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
