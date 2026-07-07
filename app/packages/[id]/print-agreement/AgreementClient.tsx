'use client';

import Link from 'next/link';
import { ArrowLeft, Printer, Download, Edit3 } from 'lucide-react';
import { useEffect } from 'react';

interface AgreementClientProps {
    packageData: any;
    tender: any;
    loa: any;
    workOrder: any;
    agency: any;
    dtp: any;
}

function formatDateToAgreement(dateInput?: string) {
    if (!dateInput) return '(write Agreement Date)';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '(write Agreement Date)';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
}

export default function AgreementClient({
    packageData,
    tender,
    loa,
    workOrder,
    agency,
    dtp
}: AgreementClientProps) {

    const exportToDoc = () => {
        const element = document.getElementById('print-area');
        if (!element) return;
        const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
        const postHtml = "</body></html>";
        let html = element.innerHTML;
        html = preHtml + html + postHtml;
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
        const filename = 'Agreement_Form.doc';
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

    // Add/remove agreement-printing class on body so print CSS is scoped only to this page
    useEffect(() => {
        const onBefore = () => document.body.classList.add('agreement-printing');
        const onAfter = () => document.body.classList.remove('agreement-printing');
        window.addEventListener('beforeprint', onBefore);
        window.addEventListener('afterprint', onAfter);
        return () => {
            window.removeEventListener('beforeprint', onBefore);
            window.removeEventListener('afterprint', onAfter);
            document.body.classList.remove('agreement-printing');
        };
    }, []);

    // Prep variables
    const agreementDateStr = formatDateToAgreement(
        workOrder.agreementDate || 
        tender.agreementDate || 
        workOrder.workOrderDate || 
        tender.workOrderDate || 
        loa?.acceptanceLetterDate
    );
    const contractorName = tender.contractorName || '_________________';
    const contractorAddress = agency?.address || '_________________';
    const workName = packageData.packageName || tender.packageName || '_________________';

    const contractPriceFormatted = tender.contractPrice
        ? tender.contractPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '0.00';

    const agreementDetails = workOrder.agreementNo && workOrder.agreementYear
        ? `${workOrder.agreementNo} of ${workOrder.agreementYear}`
        : '_______ of year _______';

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
                            <Edit3 className="w-4 h-4 text-slate-400" /> Print Agreement
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
                <div className="printable-container text-black bg-white" contentEditable suppressContentEditableWarning style={{ outline: "none", fontFamily: 'Cambria, Georgia, serif', fontSize: '15px', lineHeight: '1.25', padding: '40px 60px', color: '#000', boxSizing: 'border-box' }}>
                    
                    <p style={{ textAlign: 'center', marginBottom: '10px' }}>
                        <strong style={{ fontSize: '18px', textDecoration: 'underline', textTransform: 'uppercase' }}>AGREEMENT FORM</strong>
                    </p>

                    <p style={{ textAlign: 'justify', marginBottom: '8px', textIndent: '3em' }}>
                        This agreement, made on the Date <span style={{ fontWeight: 'bold' }}>{agreementDateStr}</span> between <span style={{ fontWeight: 'bold' }}>Executive Engineer Panchayat R&amp;B Division, Bhavnagar, District Panchayat Road and Building Division, Nr. Moti Baug, Bhavnagar.</span> (name and address of Employer) (Hereinafter called “the Employer) and <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{contractorName}</span>, <span style={{ fontWeight: 'semibold' }}>{contractorAddress}</span> (name and address of contractor) hereinafter called “the Contractor” of the other part.
                    </p>

                    <p style={{ textAlign: 'justify', marginBottom: '8px', textIndent: '3em' }}>
                        Whereas the Employer is desirous that the Contractor execute <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{workName}</span> Name and identification number of contract (hereinafter called “the works”) and the employer has accepted the Bid by the Contractor for the execution and completion of such works and the remedying of any defects therein, at a cost of Rs.<span style={{ fontWeight: 'bold' }}>{contractPriceFormatted}</span>
                    </p>

                    <p style={{ textAlign: 'center', fontWeight: 'bold', margin: '12px 0 8px 0', fontSize: '15px' }}>
                        NOW THIS AGREEMENT WITNESSETH AS FOLLOWS
                    </p>

                    <ol style={{ paddingLeft: '24px', margin: '0 0 10px 0', listStyleType: 'decimal' }}>
                        <li style={{ textAlign: 'justify', marginBottom: '6px', paddingLeft: '6px' }}>
                            In this Agreement, words and expression shall have the same meanings as are respectively assigned to them in the conditions of contract hereinafter referred to and they shall be deemed to form and be read construed as part of this Agreement.
                        </li>
                        <li style={{ textAlign: 'justify', marginBottom: '6px', paddingLeft: '6px' }}>
                            In Consideration of the payment to be made by the Employer to the contractor as hereinafter mentioned, the Contractor hereby covenants with the Employer to executive and complete the works and remedy any defects therein in conformity in all aspects with the provisions of the contracts.
                        </li>
                        <li style={{ textAlign: 'justify', marginBottom: '6px', paddingLeft: '6px' }}>
                            The employer hereby covenants to pay the Contractor in consideration of the execution and completion of the works and the remedying the defects wherein contract price or such other sum as may become payable under the provisions of the Contract at the times and in the manner prescribed by the contract.
                        </li>
                        <li style={{ textAlign: 'justify', marginBottom: '6px', paddingLeft: '6px' }}>
                            The Following documents shall be deemed to form and be ready and construed as part of this Agreement viz
                            <ol style={{ paddingLeft: '20px', marginTop: '4px', listStyleType: 'lower-roman' }}>
                                <li style={{ marginBottom: '2px' }}>Letter of Acceptance</li>
                                <li style={{ marginBottom: '2px' }}>Notice to proceed with the works:</li>
                                <li style={{ marginBottom: '2px' }}>Contractor’s Bid</li>
                                <li style={{ marginBottom: '2px' }}>Conditions of contract: General and Special</li>
                                <li style={{ marginBottom: '2px' }}>Contract Data</li>
                                <li style={{ marginBottom: '2px' }}>Additional conditions</li>
                                <li style={{ marginBottom: '2px' }}>Drawings</li>
                                <li style={{ marginBottom: '2px' }}>Bill of Quantities and</li>
                                <li style={{ marginBottom: '2px' }}>Any Other documents listed in the Contract data as forming part of the Contract.</li>
                            </ol>
                        </li>
                    </ol>

                    <p style={{ fontWeight: 'bold', margin: '14px 0 10px 0', fontSize: '15px' }}>
                        Agreement No.: - {agreementDetails}
                    </p>

                    <p style={{ textAlign: 'justify', marginBottom: '8px', textIndent: '3em' }}>
                        In witness where of the parties there to have caused this Agreement to be executed the day and year first before written
                    </p>

                    <p style={{ textAlign: 'justify', marginBottom: '8px' }}>
                        The Common seal of……………………. Was hereunto affixed in the presence of:
                    </p>

                    <p style={{ textAlign: 'justify', marginBottom: '16px' }}>
                        Signed, sealed and Delivered by the said in the presence of
                    </p>

                    <table style={{ width: '100%', marginTop: '16px', borderCollapse: 'collapse', border: 'none' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '33%', verticalAlign: 'top', padding: '6px 5px', fontSize: '13px', lineHeight: '1.25' }}>
                                    <div style={{ borderTop: '1px dashed #000', paddingTop: '6px', fontWeight: 'bold', textAlign: 'center' }}>
                                        Binding Signature of Contractor
                                    </div>
                                </td>
                                <td style={{ width: '33%', verticalAlign: 'top', padding: '6px 5px', fontSize: '13px', lineHeight: '1.25' }}>
                                    <div style={{ borderTop: '1px dashed #000', paddingTop: '6px', fontWeight: 'bold', textAlign: 'center' }}>
                                        Divisional Accountant
                                    </div>
                                    <div style={{ textAlign: 'center', color: '#333', marginTop: '2px' }}>
                                        Panchayat R &amp; B Division, Bhavnagar
                                    </div>
                                </td>
                                <td style={{ width: '33%', verticalAlign: 'top', padding: '6px 5px', fontSize: '13px', lineHeight: '1.25' }}>
                                    <div style={{ borderTop: '1px dashed #000', paddingTop: '6px', fontWeight: 'bold', textAlign: 'center' }}>
                                        Executive Engineer
                                    </div>
                                    <div style={{ textAlign: 'center', color: '#333', marginTop: '2px' }}>
                                        Panchayat R &amp; B Division, Bhavnagar
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

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
                    body.agreement-printing *,
                    body.agreement-printing *::before,
                    body.agreement-printing *::after {
                        height: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        overflow: visible !important;
                    }

                    body.agreement-printing {
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }

                    body.agreement-printing .screen-only,
                    body.agreement-printing header,
                    body.agreement-printing nav,
                    body.agreement-printing aside,
                    body.agreement-printing button,
                    body.agreement-printing svg,
                    body.agreement-printing [role="navigation"] {
                        display: none !important;
                    }

                    body.agreement-printing .print-only {
                        display: block !important;
                        position: static !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }

                    body.agreement-printing #print-area {
                        display: block !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    body.agreement-printing .printable-container {
                        padding: 1.5cm 2cm !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        box-sizing: border-box !important;
                        font-size: 14px !important;
                        line-height: 1.25 !important;
                    }

                    body.agreement-printing .printable-container div,
                    body.agreement-printing .printable-container span,
                    body.agreement-printing .printable-container td,
                    body.agreement-printing .printable-container th,
                    body.agreement-printing .printable-container li {
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
