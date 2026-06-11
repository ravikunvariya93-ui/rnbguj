'use client';

export default function PrintControls() {
    return (
        <div className="print:hidden bg-slate-900 text-white py-3 px-6 shadow-md flex justify-between items-center fixed top-0 left-0 right-0 z-50">
            <div className="flex items-center gap-2">
                <span className="font-bold text-sm">Work Order Document Preview</span>
            </div>
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => window.print()}
                    className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                    Print Document
                </button>
                <button 
                    onClick={() => window.close()}
                    className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                    Close Preview
                </button>
            </div>
        </div>
    );
}
