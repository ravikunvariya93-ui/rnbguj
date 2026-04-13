'use client';

interface BudgetSectionProps {
    formData: {
        budgetItemName: string;
        budgetHead: string;
        approvalYear: string;
        jobNumberAmount: string;
        jobNumberApprovalDate: string;
    };
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export default function BudgetSection({ formData, handleChange }: BudgetSectionProps) {
    return (
        <div className="pt-8">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Budget & Approval</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                    <label htmlFor="budgetItemName" className="block text-sm font-medium text-gray-700">Name of Budget Item</label>
                    <input type="text" name="budgetItemName" id="budgetItemName" value={formData.budgetItemName} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="sm:col-span-3">
                    <label htmlFor="budgetHead" className="block text-sm font-medium text-gray-700">Budget Head</label>
                    <select
                        name="budgetHead"
                        id="budgetHead"
                        value={formData.budgetHead}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    >
                        <option value="">-- Select Budget Head --</option>
                        <option value="5054 MMGSY Normal">5054 MMGSY Normal</option>
                        <option value="5054 MMGSY SCSP">5054 MMGSY SCSP</option>
                        <option value="Suvidhapath">Suvidhapath</option>
                        <option value="BUJ">BUJ</option>
                    </select>
                </div>

                <div className="sm:col-span-2">
                    <label htmlFor="approvalYear" className="block text-sm font-medium text-gray-700">Year of Approval</label>
                    <select
                        name="approvalYear"
                        id="approvalYear"
                        value={formData.approvalYear}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    >
                        <option value="">-- Select Year --</option>
                        <option value="2021-22">2021-22</option>
                        <option value="2022-23">2022-23</option>
                        <option value="2023-24">2023-24</option>
                        <option value="2024-25">2024-25</option>
                        <option value="2025-26">2025-26</option>
                        <option value="2026-27">2026-27</option>
                    </select>
                </div>

                <div className="sm:col-span-2">
                    <label htmlFor="jobNumberAmount" className="block text-sm font-medium text-gray-700">Job Number Amount (in Lakh)</label>
                    <input type="number" step="1" name="jobNumberAmount" id="jobNumberAmount" value={formData.jobNumberAmount} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>

                <div className="sm:col-span-2">
                    <label htmlFor="jobNumberApprovalDate" className="block text-sm font-medium text-gray-700">Approval Date (DD/MM/YYYY)</label>
                    <input
                        type="text"
                        placeholder="20/01/2025"
                        name="jobNumberApprovalDate"
                        id="jobNumberApprovalDate"
                        value={formData.jobNumberApprovalDate}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    />
                </div>
            </div>
        </div>
    );
}
