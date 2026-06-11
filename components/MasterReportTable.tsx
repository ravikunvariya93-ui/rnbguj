'use client';

import React, { useState, useMemo } from 'react';
import { utils, writeFile } from 'xlsx';
import { Download, Search, Check, RefreshCw, ChevronDown, ChevronUp, Sliders } from 'lucide-react';

interface ColumnConfig {
    key: string;
    label: string;
    category: string;
    defaultVisible: boolean;
    align?: 'left' | 'center' | 'right';
    minWidth?: string;
    isDate?: boolean;
    isBoolean?: boolean;
}

const CATEGORIES: Record<string, string> = {
    aw: 'Approved Work (AW)',
    ts: 'Technical Sanction (TS)',
    pkg: 'Package Info',
    dtp: 'DTP Details',
    tender: 'Tender Info',
    approval: 'Tender Approval',
    loa: 'LOA Details',
    wo: 'Work Order (WO)'
};

const ALL_COLUMNS: ColumnConfig[] = [
    // Approved Work
    { key: 'workName', label: 'Name of Work', category: 'aw', defaultVisible: true, minWidth: '350px' },
    { key: 'workNameGujarati', label: 'Name of Work (Gujarati)', category: 'aw', defaultVisible: false, minWidth: '200px' },
    { key: 'circle', label: 'Circle', category: 'aw', defaultVisible: false, minWidth: '150px' },
    { key: 'district', label: 'District', category: 'aw', defaultVisible: false, minWidth: '100px' },
    { key: 'subDivision', label: 'Sub Division', category: 'aw', defaultVisible: true, minWidth: '150px' },
    { key: 'taluka', label: 'Taluka', category: 'aw', defaultVisible: false, minWidth: '100px' },
    { key: 'constituencyName', label: 'Constituency Name', category: 'aw', defaultVisible: false, minWidth: '150px' },
    { key: 'budgetType', label: 'Budget Type', category: 'aw', defaultVisible: false, minWidth: '120px' },
    { key: 'wmsItemCode', label: 'WMS Item Code', category: 'aw', defaultVisible: false, minWidth: '120px' },
    { key: 'approvalYear', label: 'Approval Year', category: 'aw', defaultVisible: true, align: 'center', minWidth: '100px' },
    { key: 'jobNumberApprovalDate', label: 'Job Approval Date', category: 'aw', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'jobNumberAmount', label: 'Amount (Lakh)', category: 'aw', defaultVisible: true, align: 'right', minWidth: '120px' },
    { key: 'proposedLength', label: 'Proposed Length (km)', category: 'aw', defaultVisible: false, align: 'right', minWidth: '150px' },
    { key: 'contractProvision', label: 'Contract Provision', category: 'aw', defaultVisible: false, minWidth: '150px' },
    { key: 'rpmsCode', label: 'RPMS Code', category: 'aw', defaultVisible: false, minWidth: '120px' },
    { key: 'type', label: 'Type', category: 'aw', defaultVisible: false, minWidth: '100px' },
    { key: 'budgetHead', label: 'Budget Head', category: 'aw', defaultVisible: false, minWidth: '120px' },
    { key: 'projectType', label: 'Project Type', category: 'aw', defaultVisible: false, minWidth: '120px' },
    { key: 'mlaName', label: 'MLA Name', category: 'aw', defaultVisible: false, minWidth: '150px' },
    { key: 'roadCategory', label: 'Road Category', category: 'aw', defaultVisible: false, minWidth: '120px' },
    { key: 'workType', label: 'Work Type', category: 'aw', defaultVisible: true, minWidth: '100px' },
    { key: 'parliamentaryConstituency', label: 'Parliamentary Constituency', category: 'aw', defaultVisible: false, minWidth: '180px' },
    { key: 'mpName', label: 'MP Name', category: 'aw', defaultVisible: false, minWidth: '150px' },
    { key: 'natureOfWork', label: 'Nature of Work', category: 'aw', defaultVisible: false, minWidth: '150px' },
    { key: 'schemeName', label: 'Scheme Name', category: 'aw', defaultVisible: false, minWidth: '150px' },
    { key: 'buildingType', label: 'Building Type', category: 'aw', defaultVisible: false, minWidth: '120px' },
    { key: 'length', label: 'Length (km)', category: 'aw', defaultVisible: false, align: 'right', minWidth: '100px' },
    { key: 'chainage', label: 'Chainage', category: 'aw', defaultVisible: false, minWidth: '120px' },
    { key: 'estimateConsultant', label: 'Estimate Consultant', category: 'aw', defaultVisible: false, minWidth: '180px' },
    { key: 'remarks', label: 'Remarks', category: 'aw', defaultVisible: false, minWidth: '200px' },
    { key: 'createdAt', label: 'Created At', category: 'aw', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'updatedAt', label: 'Updated At', category: 'aw', defaultVisible: false, isDate: true, minWidth: '150px' },

    // TS
    { key: 'ts_dateSendingTS', label: 'TS Sending Date', category: 'ts', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'ts_tsAuthority', label: 'TS Authority', category: 'ts', defaultVisible: false, minWidth: '150px' },
    { key: 'ts_tsAmount', label: 'TS Amount (Lakh)', category: 'ts', defaultVisible: false, align: 'right', minWidth: '120px' },
    { key: 'ts_tsNumber', label: 'TS Number', category: 'ts', defaultVisible: true, minWidth: '120px' },
    { key: 'ts_tsDate', label: 'TS Date', category: 'ts', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'ts_remarks', label: 'TS Remarks', category: 'ts', defaultVisible: false, minWidth: '200px' },

    // Package
    { key: 'pkg_packageName', label: 'Package Name', category: 'pkg', defaultVisible: true, minWidth: '200px' },

    // DTP
    { key: 'dtp_dtpSendingNo', label: 'DTP Sending No', category: 'dtp', defaultVisible: false, minWidth: '150px' },
    { key: 'dtp_dtpSendingDate', label: 'DTP Sending Date', category: 'dtp', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'dtp_dtpApprovingAuthority', label: 'DTP Approving Authority', category: 'dtp', defaultVisible: false, minWidth: '180px' },
    { key: 'dtp_dtpApprovalNo', label: 'DTP Approval No', category: 'dtp', defaultVisible: false, minWidth: '150px' },
    { key: 'dtp_dtpApprovalDate', label: 'DTP Approval Date', category: 'dtp', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'dtp_tenderAmount', label: 'DTP Tender Amount (Lakh)', category: 'dtp', defaultVisible: false, align: 'right', minWidth: '150px' },
    { key: 'dtp_remarks', label: 'DTP Remarks', category: 'dtp', defaultVisible: false, minWidth: '200px' },

    // Tender
    { key: 'tender_tenderId', label: 'Tender ID', category: 'tender', defaultVisible: false, minWidth: '120px' },
    { key: 'tender_tenderNoticeYear', label: 'Tender Notice Year', category: 'tender', defaultVisible: false, minWidth: '120px' },
    { key: 'tender_noticeNo', label: 'Tender Notice No', category: 'tender', defaultVisible: true, minWidth: '120px' },
    { key: 'tender_srNo', label: 'Tender Sr No', category: 'tender', defaultVisible: false, align: 'center', minWidth: '100px' },
    { key: 'tender_trialNo', label: 'Tender Trial No', category: 'tender', defaultVisible: false, align: 'center', minWidth: '100px' },
    { key: 'tender_tenderCreationDate', label: 'Tender Creation Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_lastDateOfSubmission', label: 'Last Submission Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_tenderOpeningDate', label: 'Tender Opening Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_tenderValidityDate', label: 'Tender Validity Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_estimatedAmount', label: 'Tender Estimated Amount (Lakh)', category: 'tender', defaultVisible: false, align: 'right', minWidth: '180px' },
    { key: 'tender_reInvite', label: 'Tender Re-invite?', category: 'tender', defaultVisible: false, isBoolean: true, minWidth: '120px' },
    { key: 'tender_cancelled', label: 'Tender Cancelled?', category: 'tender', defaultVisible: false, isBoolean: true, minWidth: '120px' },
    { key: 'tender_cancellationReason', label: 'Cancellation Reason', category: 'tender', defaultVisible: false, minWidth: '180px' },
    { key: 'tender_contractorName', label: 'Contractor Name', category: 'tender', defaultVisible: true, minWidth: '180px' },
    { key: 'tender_contractPrice', label: 'Contract Price (Lakh)', category: 'tender', defaultVisible: true, align: 'right', minWidth: '150px' },
    { key: 'tender_aboveBelowPercentage', label: 'Above/Below %', category: 'tender', defaultVisible: false, align: 'right', minWidth: '120px' },
    { key: 'tender_aboveBelowInWord', label: 'Above/Below (At Par)', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_proposalDate', label: 'Tender Proposal Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_tenderApprovalOffice', label: 'Tender Approval Office', category: 'tender', defaultVisible: false, minWidth: '180px' },
    { key: 'tender_tenderApprovalNo', label: 'Tender Approval No', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_tenderApprovalDate', label: 'Tender Approval Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_workDurationMonths', label: 'Tender Duration (Months)', category: 'tender', defaultVisible: false, align: 'center', minWidth: '150px' },
    { key: 'tender_acceptanceLetterWorksheetNo', label: 'Acceptance WS No', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_acceptanceLetterDate', label: 'Acceptance Letter Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_agreementYear', label: 'Tender Agreement Year', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_agreementNo', label: 'Tender Agreement No', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_agreementDate', label: 'Tender Agreement Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_securityDepositType', label: 'Tender SD Type', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_securityDepositBankName', label: 'Tender SD Bank', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_securityDepositNumber', label: 'Tender SD Number', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_securityDepositAmount', label: 'Tender SD Amount', category: 'tender', defaultVisible: false, align: 'right', minWidth: '150px' },
    { key: 'tender_securityDepositDate', label: 'Tender SD Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_additionalSecurityDepositType', label: 'Tender Addl SD Type', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_additionalSecurityDepositBankName', label: 'Tender Addl SD Bank', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_additionalSecurityDepositNumber', label: 'Tender Addl SD Number', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_additionalSecurityDepositAmount', label: 'Tender Addl SD Amount', category: 'tender', defaultVisible: false, align: 'right', minWidth: '150px' },
    { key: 'tender_additionalSecurityDepositDate', label: 'Tender Addl SD Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_workOrderWorksheetNo', label: 'Tender WO Worksheet No', category: 'tender', defaultVisible: false, minWidth: '150px' },
    { key: 'tender_workOrderDate', label: 'Tender WO Date', category: 'tender', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'tender_remarks', label: 'Tender Remarks', category: 'tender', defaultVisible: false, minWidth: '200px' },

    // Approval
    { key: 'approval_notRequired', label: 'Approval Not Required?', category: 'approval', defaultVisible: false, isBoolean: true, minWidth: '150px' },
    { key: 'approval_proposalDate', label: 'Approval Proposal Date', category: 'approval', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'approval_tenderApprovalOffice', label: 'Approval Office', category: 'approval', defaultVisible: false, minWidth: '180px' },
    { key: 'approval_tenderApprovalNo', label: 'Approval No', category: 'approval', defaultVisible: false, minWidth: '150px' },
    { key: 'approval_tenderApprovalDate', label: 'Approval Date', category: 'approval', defaultVisible: false, isDate: true, minWidth: '150px' },

    // LOA
    { key: 'loa_stampDuty', label: 'LOA Stamp Duty', category: 'loa', defaultVisible: false, align: 'right', minWidth: '120px' },
    { key: 'loa_defectLiabilityPeriod', label: 'LOA DLP', category: 'loa', defaultVisible: false, minWidth: '120px' },
    { key: 'loa_workDurationMonths', label: 'LOA Duration (Months)', category: 'loa', defaultVisible: false, align: 'center', minWidth: '150px' },
    { key: 'loa_acceptanceLetterWorksheetNo', label: 'LOA Acceptance WS No', category: 'loa', defaultVisible: false, minWidth: '150px' },
    { key: 'loa_acceptanceLetterDate', label: 'LOA Acceptance Letter Date', category: 'loa', defaultVisible: false, isDate: true, minWidth: '150px' },

    // Work Order
    { key: 'wo_agreementYear', label: 'Agreement Year', category: 'wo', defaultVisible: false, minWidth: '120px' },
    { key: 'wo_agreementNo', label: 'Agreement No', category: 'wo', defaultVisible: false, minWidth: '120px' },
    { key: 'wo_agreementDate', label: 'Agreement Date', category: 'wo', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'wo_securityDepositType', label: 'SD Type', category: 'wo', defaultVisible: false, minWidth: '120px' },
    { key: 'wo_securityDepositBankName', label: 'SD Bank', category: 'wo', defaultVisible: false, minWidth: '150px' },
    { key: 'wo_securityDepositNumber', label: 'SD Number', category: 'wo', defaultVisible: false, minWidth: '150px' },
    { key: 'wo_securityDepositAmount', label: 'SD Amount', category: 'wo', defaultVisible: false, align: 'right', minWidth: '120px' },
    { key: 'wo_securityDepositDate', label: 'SD Date', category: 'wo', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'wo_additionalSecurityDepositType', label: 'Addl SD Type', category: 'wo', defaultVisible: false, minWidth: '120px' },
    { key: 'wo_additionalSecurityDepositBankName', label: 'Addl SD Bank', category: 'wo', defaultVisible: false, minWidth: '150px' },
    { key: 'wo_additionalSecurityDepositNumber', label: 'Addl SD Number', category: 'wo', defaultVisible: false, minWidth: '150px' },
    { key: 'wo_additionalSecurityDepositAmount', label: 'Addl SD Amount', category: 'wo', defaultVisible: false, align: 'right', minWidth: '120px' },
    { key: 'wo_additionalSecurityDepositDate', label: 'Addl SD Date', category: 'wo', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'wo_workOrderWorksheetNo', label: 'WO Worksheet No', category: 'wo', defaultVisible: false, minWidth: '150px' },
    { key: 'wo_workOrderDate', label: 'Work Order Date', category: 'wo', defaultVisible: true, isDate: true, minWidth: '150px' },
    { key: 'wo_timeLimitStartsFrom', label: 'WO Time Limit Start', category: 'wo', defaultVisible: false, isDate: true, minWidth: '150px' },
    { key: 'wo_stipulatedCompletionDate', label: 'WO Completion Date', category: 'wo', defaultVisible: false, isDate: true, minWidth: '150px' }
];

interface MasterReportTableProps {
    data: any[];
}

export default function MasterReportTable({ data }: MasterReportTableProps) {
    // Column state
    const [selectedColumns, setSelectedColumns] = useState<string[]>(() => 
        ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key)
    );
    const [showSelector, setShowSelector] = useState(false);
    const [columnSearch, setColumnSearch] = useState('');
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
        aw: true,
        ts: false,
        pkg: false,
        dtp: false,
        tender: false,
        approval: false,
        loa: false,
        wo: false
    });

    // Row filtering and pagination state
    const [rowSearch, setRowSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    // Helpers to handle categories toggle
    const toggleCategory = (cat: string) => {
        setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    const toggleColumn = (key: string) => {
        setSelectedColumns(prev => 
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const selectAll = () => {
        setSelectedColumns(ALL_COLUMNS.map(c => c.key));
    };

    const selectNone = () => {
        setSelectedColumns([]);
    };

    const resetToDefaults = () => {
        setSelectedColumns(ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key));
    };

    // Filter columns configuration based on selected state
    const activeColumns = useMemo(() => {
        return ALL_COLUMNS.filter(c => selectedColumns.includes(c.key));
    }, [selectedColumns]);

    // Client side row filtering
    const filteredRows = useMemo(() => {
        if (!rowSearch.trim()) return data;
        const q = rowSearch.toLowerCase().trim();
        return data.filter(row => {
            const workNameMatch = String(row.workName || '').toLowerCase().includes(q);
            const contractorMatch = String(row.tender_contractorName || '').toLowerCase().includes(q);
            const packageMatch = String(row.pkg_packageName || '').toLowerCase().includes(q);
            return workNameMatch || contractorMatch || packageMatch;
        });
    }, [data, rowSearch]);

    // Pagination calculations
    const paginatedRows = useMemo(() => {
        if (rowsPerPage === -1) return filteredRows;
        const start = (currentPage - 1) * rowsPerPage;
        return filteredRows.slice(start, start + rowsPerPage);
    }, [filteredRows, currentPage, rowsPerPage]);

    const totalPages = useMemo(() => {
        if (rowsPerPage === -1) return 1;
        return Math.ceil(filteredRows.length / rowsPerPage);
    }, [filteredRows, rowsPerPage]);

    // Handle rows per page changes
    const handleRowsPerPageChange = (val: number) => {
        setRowsPerPage(val);
        setCurrentPage(1);
    };

    // Excel export (Client-Side)
    const handleExport = () => {
        const table = document.getElementById('master-data-table');
        if (table) {
            const wb = utils.table_to_book(table, { sheet: "Master Report" });
            writeFile(wb, "Approved_Works_Master_Report.xlsx");
        }
    };

    // Helper to format values
    const formatValue = (col: ColumnConfig, val: any) => {
        if (val === null || val === undefined || val === '') return '-';
        if (col.isDate) {
            try {
                return new Date(val).toLocaleDateString('en-GB');
            } catch {
                return String(val);
            }
        }
        if (col.isBoolean) {
            return val ? 'Yes' : 'No';
        }
        return String(val);
    };

    return (
        <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 border border-slate-100 rounded-xl shadow-sm">
                {/* Search Rows */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search work name, contractor, package..."
                        value={rowSearch}
                        onChange={(e) => {
                            setRowSearch(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="pl-10 pr-4 py-2 w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                    />
                </div>

                {/* Toolbar Buttons */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <button
                        onClick={() => setShowSelector(!showSelector)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border shadow-sm transition-all cursor-pointer ${
                            showSelector 
                                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <Sliders className="w-4 h-4" />
                        <span>Select Columns ({selectedColumns.length}/{ALL_COLUMNS.length})</span>
                    </button>

                    {filteredRows.length > 0 && (
                        <button
                            onClick={handleExport}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                        >
                            <Download className="w-4 h-4" />
                            <span>Export to Excel</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Column Selector Panel */}
            {showSelector && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                        <div className="space-y-0.5">
                            <h3 className="text-sm font-bold text-slate-800">Select Columns to Display</h3>
                            <p className="text-xs text-slate-500 font-medium">Checked columns will be visible in the table and exported to Excel.</p>
                        </div>
                        {/* Quick Selection Actions */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={selectAll}
                                className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors cursor-pointer"
                            >
                                Select All
                            </button>
                            <button
                                onClick={selectNone}
                                className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors cursor-pointer"
                            >
                                Clear All
                            </button>
                            <button
                                onClick={resetToDefaults}
                                className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors cursor-pointer"
                            >
                                Reset to Defaults
                            </button>
                        </div>
                    </div>

                    {/* Column Search Filter */}
                    <div className="relative max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter columns by name..."
                            value={columnSearch}
                            onChange={(e) => setColumnSearch(e.target.value)}
                            className="pl-8 pr-3 py-1.5 w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                        />
                    </div>

                    {/* Categorized Column Checkboxes */}
                    <div className="space-y-3">
                        {Object.entries(CATEGORIES).map(([catKey, catName]) => {
                            const catColumns = ALL_COLUMNS.filter(c => c.category === catKey && 
                                (columnSearch === '' || c.label.toLowerCase().includes(columnSearch.toLowerCase()))
                            );

                            if (catColumns.length === 0) return null;

                            const isOpen = openCategories[catKey] || columnSearch !== '';
                            const selectedInCat = catColumns.filter(c => selectedColumns.includes(c.key)).length;

                            return (
                                <div key={catKey} className="border border-slate-100 rounded-lg overflow-hidden">
                                    {/* Category Header */}
                                    <button
                                        onClick={() => toggleCategory(catKey)}
                                        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 border-b border-slate-100 text-left cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-700">{catName}</span>
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                                                {selectedInCat}/{catColumns.length}
                                            </span>
                                        </div>
                                        <div>
                                            {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                        </div>
                                    </button>

                                    {/* Category Checkbox Grid */}
                                    {isOpen && (
                                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-white">
                                            {catColumns.map(col => {
                                                const isChecked = selectedColumns.includes(col.key);
                                                return (
                                                    <label
                                                        key={col.key}
                                                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-[11px] font-semibold cursor-pointer transition-all ${
                                                            isChecked 
                                                                ? 'border-blue-200 bg-blue-50/30 text-blue-900 shadow-sm' 
                                                                : 'border-slate-100 hover:border-slate-200 bg-white text-slate-600'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => toggleColumn(col.key)}
                                                            className="mt-0.5 w-3.5 h-3.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                                        />
                                                        <span className="break-words select-none leading-normal">{col.label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Table Container */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table id="master-data-table" className="w-full border-collapse text-left text-xs font-medium">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th scope="col" className="px-3 py-3 font-bold text-slate-700 text-center border-r border-slate-200 min-w-[60px]">
                                    Sr. No.
                                </th>
                                {activeColumns.map((col, idx) => {
                                    const isLast = idx === activeColumns.length - 1;
                                    return (
                                        <th
                                            key={col.key}
                                            scope="col"
                                            className={`px-4 py-3 font-bold text-slate-700 ${
                                                col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                                            } ${isLast ? '' : 'border-r border-slate-200'}`}
                                            style={col.minWidth ? { minWidth: col.minWidth } : undefined}
                                        >
                                            {col.label}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedRows.length > 0 ? (
                                paginatedRows.map((row, rowIdx) => {
                                    const serialNumber = (currentPage - 1) * rowsPerPage + rowIdx + 1;
                                    const bgClass = rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30';
                                    return (
                                        <tr key={row._id ?? rowIdx} className={`${bgClass} hover:bg-blue-50/50 transition-colors`}>
                                            <td className="px-3 py-2.5 text-center text-slate-500 font-semibold border-r border-slate-100">
                                                {serialNumber}
                                            </td>
                                            {activeColumns.map((col, colIdx) => {
                                                const isLast = colIdx === activeColumns.length - 1;
                                                const rawVal = row[col.key];
                                                const formatted = formatValue(col, rawVal);
                                                return (
                                                    <td
                                                        key={col.key}
                                                        className={`px-4 py-2.5 text-slate-800 ${
                                                            col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                                                        } ${isLast ? '' : 'border-r border-slate-100'}`}
                                                    >
                                                        {col.key === 'workName' ? (
                                                            <div className="font-bold text-slate-900 break-words leading-tight">
                                                                {formatted}
                                                            </div>
                                                        ) : (
                                                            <span className="font-medium text-slate-700 break-words leading-normal">{formatted}</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={selectedColumns.length + 1} className="px-4 py-12 text-center text-slate-400 font-semibold italic bg-slate-50/20">
                                        No data available matching your search criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer / Pagination */}
                {filteredRows.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50/30 border-t border-slate-100">
                        {/* Summary */}
                        <div className="text-[11px] font-bold text-slate-500">
                            Showing {rowsPerPage === -1 ? 1 : (currentPage - 1) * rowsPerPage + 1} to{' '}
                            {rowsPerPage === -1 ? filteredRows.length : Math.min(currentPage * rowsPerPage, filteredRows.length)} of{' '}
                            {filteredRows.length} records
                        </div>

                        {/* Page Size & Page Controls */}
                        <div className="flex items-center gap-6">
                            {/* Rows per page */}
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                <span>Rows per page:</span>
                                <select
                                    value={rowsPerPage}
                                    onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                                    className="px-2 py-1 bg-white border border-slate-200 rounded font-bold text-slate-700 focus:outline-none cursor-pointer"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={-1}>All</option>
                                </select>
                            </div>

                            {/* Page navigation */}
                            {rowsPerPage !== -1 && totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(1)}
                                        className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50 text-[11px] font-bold text-slate-700 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors"
                                    >
                                        First
                                    </button>
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                        className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50 text-[11px] font-bold text-slate-700 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors"
                                    >
                                        Prev
                                    </button>
                                    <span className="px-3 text-xs font-bold text-slate-600">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                        className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50 text-[11px] font-bold text-slate-700 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors"
                                    >
                                        Next
                                    </button>
                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(totalPages)}
                                        className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50 text-[11px] font-bold text-slate-700 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors"
                                    >
                                        Last
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
