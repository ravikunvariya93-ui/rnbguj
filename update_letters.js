const fs = require('fs');

function updateFile(filePath, isLOA) {
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Imports
    if (content.includes('lucide-react')) {
        content = content.replace(/import { (.*?) } from 'lucide-react';/, (match, p1) => {
            const imports = p1.split(',').map(i => i.trim());
            if (!imports.includes('Download')) imports.push('Download');
            if (!imports.includes('Edit3')) imports.push('Edit3');
            return `import { ${imports.join(', ')} } from 'lucide-react';\nimport { logoBase64 } from '@/lib/logoBase64';`;
        });
    } else {
        content = content.replace(/import (.*?) from (.*?);/, `import $1 from $2;\nimport { Download, Edit3, Printer, ArrowLeft } from 'lucide-react';\nimport { logoBase64 } from '@/lib/logoBase64';`);
    }

    // 2. Export Func
    const exportFunc = `
    const exportToDoc = () => {
        const element = document.getElementById('print-area');
        if (!element) return;
        const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
        const postHtml = "</body></html>";
        let html = element.innerHTML;
        html = preHtml + html + postHtml;
        const blob = new Blob(['\\ufeff', html], { type: 'application/msword' });
        const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
        const filename = '${isLOA ? 'LOA_Letter' : 'DTP_Forwarding_Letter'}.doc';
        const downloadLink = document.createElement('a');
        document.body.appendChild(downloadLink);
        if (navigator.msSaveOrOpenBlob) {
            navigator.msSaveOrOpenBlob(blob, filename);
        } else {
            downloadLink.href = url;
            downloadLink.download = filename;
            downloadLink.click();
        }
        document.body.removeChild(downloadLink);
    };
`;

    if (isLOA) {
        content = content.replace(/    const \[printed, setPrinted\] = useState\(false\);\n\n    \/\/ Auto-trigger[\s\S]*?    \}, \[\]\);/, exportFunc.trim());
        
        // Remove the huge dialog UI
        content = content.replace(/{ \/\* Screen UI[\s\S]*?{ \/\* Dedicated Hidden/, `{/* Action Bar */}
            <div className="bg-slate-800 py-4 px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 screen-only sticky top-0 z-50 shadow-md">
                <div className="flex items-center gap-4">
                    <Link href={\`/loas/\${loa._id}\`} className="p-2 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-300" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Edit3 className="w-4 h-4 text-slate-400" /> Edit LOA Letter</h1>
                        <p className="text-sm text-slate-400">Click anywhere on the document below to edit before printing/exporting.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={exportToDoc} className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export to Word
                    </button>
                    <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2">
                        <Printer className="w-4 h-4" /> Print Letter
                    </button>
                </div>
            </div>

            {/* Dedicated Hidden`);
    } else {
        // DTP letter
        content = content.replace('function LetterContent({ wsNo, letterDate, dtps, fmt, fmtDate }: {', exportFunc + '\nfunction LetterContent({ wsNo, letterDate, dtps, fmt, fmtDate }: {');
        
        const dtpUI = `{/* Action Bar */}
            <div className="bg-slate-800 py-4 px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 screen-only sticky top-0 z-50 shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.history.back()} className="p-2 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-300" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Edit3 className="w-4 h-4 text-slate-400" /> Edit DTP Forwarding Letter</h1>
                        <p className="text-sm text-slate-400">Click anywhere on the document below to edit before printing/exporting.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={exportToDoc} className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export to Word
                    </button>
                    <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2">
                        <Printer className="w-4 h-4" /> Print Letter
                    </button>
                </div>
            </div>`;
        
        content = content.replace(/<div className="flex justify-between items-center mb-6 screen-only">[\s\S]*?<\/button>\s*<\/div>\s*<\/div>/, dtpUI);
    }

    // Make editable
    content = content.replace('className="printable-container"', 'className="printable-container" id="print-area" contentEditable suppressContentEditableWarning');
    content = content.replace('className="printable-container text-black bg-white"', 'className="printable-container text-black bg-white" id="print-area" contentEditable suppressContentEditableWarning');
    content = content.replace(/outline: 'none', /g, '');
    content = content.replace(/style={{/, 'style={{ outline: "none",');

    // Fix image
    content = content.replace(/src="\/logo\.jpg"/g, 'src={logoBase64}');

    // Fix CSS
    content = content.replace(/@media screen {[\s\S]*?}/, `@media screen {
                    .print-only, .printable-container {
                        margin: 2rem auto;
                        box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
                        max-width: 21cm;
                    }
                    body { background-color: #f1f5f9; }
                }`);

    fs.writeFileSync(filePath, content);
    console.log('Updated ' + filePath);
}

updateFile('app/loas/[id]/letter/LOALetterClient.tsx', true);
updateFile('app/dtp/forwarding-letter/page.tsx', false);
