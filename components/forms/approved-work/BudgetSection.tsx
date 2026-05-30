'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Check, Loader2 } from 'lucide-react';

interface BudgetSectionProps {
    formData: {
        budgetHead: string;
        approvalYear: string;
        jobNumberAmount: string;
        jobNumberApprovalDate: string;
    };
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export default function BudgetSection({ formData, handleChange }: BudgetSectionProps) {
    const standardYears = ['2021-22', '2022-23', '2023-24', '2024-25', '2025-26', '2026-27'];
    const isInitialCustom = formData.approvalYear && !standardYears.includes(formData.approvalYear);
    const [showCustomInput, setShowCustomInput] = useState(isInitialCustom);
    const [isLoading, setIsLoading] = useState(false);

    const DEFAULT_BUDGET_HEADS = [
        "5054 MMGSY Normal",
        "5054 MMGSY SCSP",
        "Suvidhapath",
        "BUJ"
    ];

    const [budgetHeadOptions, setBudgetHeadOptions] = useState(() => {
        const initialVal = formData.budgetHead ? [formData.budgetHead] : [];
        return Array.from(new Set([...DEFAULT_BUDGET_HEADS, ...initialVal]));
    });
    const [isAddingNewBudgetHead, setIsAddingNewBudgetHead] = useState(false);
    const [newBudgetHeadValue, setNewBudgetHeadValue] = useState('');

    useEffect(() => {
        const fetchBudgetHeads = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/metadata/budget-heads');
                if (response.ok) {
                    const dbHeads = await response.json();
                    const initialVal = formData.budgetHead ? [formData.budgetHead] : [];
                    const combined = Array.from(new Set([...DEFAULT_BUDGET_HEADS, ...initialVal, ...dbHeads])).sort();
                    setBudgetHeadOptions(combined);
                }
            } catch (error) {
                console.error("Error fetching budget heads:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBudgetHeads();
    }, [formData.budgetHead]);

    const handleBudgetHeadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value === 'ADD_NEW') {
            setIsAddingNewBudgetHead(true);
        } else {
            handleChange(e);
        }
    };

    const handleAddNewBudgetHead = () => {
        if (newBudgetHeadValue.trim()) {
            if (!budgetHeadOptions.includes(newBudgetHeadValue.trim())) {
                setBudgetHeadOptions(prev => [...prev, newBudgetHeadValue.trim()]);
            }
            const mockEvent = {
                target: {
                    name: 'budgetHead',
                    value: newBudgetHeadValue.trim()
                }
            } as any;
            handleChange(mockEvent);
            setIsAddingNewBudgetHead(false);
            setNewBudgetHeadValue('');
        }
    };

    const cancelAddNewBudgetHead = () => {
        setIsAddingNewBudgetHead(false);
        setNewBudgetHeadValue('');
    };

    return (
        <div className="pt-8">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Budget & Approval</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                    <label htmlFor="budgetHead" className="block text-sm font-medium text-gray-700 font-bold mb-1 flex justify-between items-center">
                        Budget Head
                    </label>
                    {isAddingNewBudgetHead ? (
                        <div className="flex gap-2 mt-1">
                            <input
                                type="text"
                                autoFocus
                                value={newBudgetHeadValue}
                                onChange={(e) => setNewBudgetHeadValue(e.target.value)}
                                className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter new budget head..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddNewBudgetHead();
                                    } else if (e.key === 'Escape') {
                                        cancelAddNewBudgetHead();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleAddNewBudgetHead}
                                className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                title="Add"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={cancelAddNewBudgetHead}
                                className="p-2 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300 transition-colors"
                                title="Cancel"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <select
                            name="budgetHead"
                            id="budgetHead"
                            value={formData.budgetHead}
                            onChange={handleBudgetHeadChange}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            <option value="">-- Select Budget Head --</option>
                            {budgetHeadOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                            <option value="ADD_NEW" className="text-blue-600 font-bold italic">+ Add New...</option>
                        </select>
                    )}
                </div>

                <div className="sm:col-span-2">
                    <label htmlFor="approvalYear" className="block text-sm font-medium text-gray-700">Year of Approval</label>
                    {!showCustomInput ? (
                        <select
                            name="approvalYear"
                            id="approvalYear"
                            value={formData.approvalYear}
                            onChange={(e) => {
                                if (e.target.value === 'custom') {
                                    setShowCustomInput(true);
                                    handleChange({ target: { name: 'approvalYear', value: '' } } as any);
                                } else {
                                    handleChange(e);
                                }
                            }}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                        >
                            <option value="">-- Select Year --</option>
                            {standardYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                            <option value="custom">+ Add Custom Year...</option>
                        </select>
                    ) : (
                        <div className="flex gap-2 mt-1">
                            <input
                                type="text"
                                placeholder="e.g. 2027-28"
                                value={formData.approvalYear}
                                onChange={handleChange}
                                name="approvalYear"
                                id="approvalYear"
                                className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCustomInput(false);
                                    handleChange({ target: { name: 'approvalYear', value: '2025-26' } } as any);
                                }}
                                className="px-2.5 py-1.5 border border-gray-300 rounded-md bg-white text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                Back
                            </button>
                        </div>
                    )}
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

