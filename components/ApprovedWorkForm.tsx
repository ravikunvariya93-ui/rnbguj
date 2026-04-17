'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, CheckCircle2, XCircle, X } from 'lucide-react';
import Link from 'next/link';

// Sub-components for token efficiency
import BasicInfoSection from './forms/approved-work/BasicInfoSection';
import BudgetSection from './forms/approved-work/BudgetSection';
import ClassificationSection from './forms/approved-work/ClassificationSection';

type ToastType = 'success' | 'error' | null;

interface ToastState {
    visible: boolean;
    type: ToastType;
    message: string;
}

interface FormData {
    circle: string;
    district: string;
    subDivision: string;
    taluka: string;
    constituencyName: string;
    budgetType: string;
    wmsItemCode: string;
    approvalYear: string;
    jobNumberApprovalDate: string;
    jobNumberAmount: string;
    workName: string;
    proposedLength: string;
    contractProvision: string;
    rpmsCode: string;
    type: string;
    budgetHead: string;
    projectType: string;
    mlaName: string;
    roadCategory: string;
    workType: string;
    parliamentaryConstituency: string;
    mpName: string;
    workNameGujarati: string;
    natureOfWork: string;
    schemeName: string;
    length: string;
    chainage: string;
    estimateConsultant: string;
    [key: string]: string; // allow dynamic keys from initialData
}

interface ApprovedWorkFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialData?: Record<string, any>;
    isEditing?: boolean;
}

export default function ApprovedWorkForm({ initialData = {}, isEditing = false }: ApprovedWorkFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<ToastState>({
        visible: false,
        type: null,
        message: '',
    });

    const showToast = useCallback((type: 'success' | 'error', message: string) => {
        setToast({ visible: true, type, message });
        if (type === 'success') {
            setTimeout(() => {
                setToast(prev => ({ ...prev, visible: false }));
            }, 2500);
        } else {
            setTimeout(() => {
                setToast(prev => ({ ...prev, visible: false }));
            }, 5000);
        }
    }, []);

    const [formData, setFormData] = useState<FormData>({
        circle: 'Panchayat R&B Circle, Rajkot',
        district: 'Bhavnagar',
        subDivision: '',
        taluka: '',
        constituencyName: '',
        budgetType: '',
        wmsItemCode: '',
        approvalYear: '2025-26',
        jobNumberApprovalDate: '',
        jobNumberAmount: '',
        workName: '',
        proposedLength: '',
        contractProvision: '',
        rpmsCode: '',
        type: '',
        budgetHead: '',
        projectType: '',
        mlaName: '',
        roadCategory: '',
        workType: 'Road',
        parliamentaryConstituency: '',
        mpName: '',
        workNameGujarati: '',
        natureOfWork: '',
        schemeName: '',
        length: '',
        chainage: '',
        estimateConsultant: '',
        ...initialData
    });

    // Format initial date to DD/MM/YYYY if coming from DB (ISO String)
    useEffect(() => {
        if (initialData.jobNumberApprovalDate) {
            try {
                const dateObj = new Date(initialData.jobNumberApprovalDate);
                if (!isNaN(dateObj.getTime())) {
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const year = dateObj.getFullYear();
                    setFormData((prev) => ({
                        ...prev,
                        jobNumberApprovalDate: `${day}/${month}/${year}`,
                    }));
                }
            } catch (e) {
                console.error("Error formatting initial date", e);
            }
        }
    }, [initialData.jobNumberApprovalDate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Parse DD/MM/YYYY to ISO Date if present
            const submissionData = { ...formData };

            if (submissionData.jobNumberApprovalDate) {
                const cleanDate = String(submissionData.jobNumberApprovalDate).trim();
                const parts = cleanDate.split(/[\/\-\.]/);

                if (parts.length === 3) {
                    let year = parts[2];
                    if (year.length === 2) year = '20' + year;
                    const isoDate = `${year}-${parts[1]}-${parts[0]}`;
                    const dateObj = new Date(isoDate);

                    if (!isNaN(dateObj.getTime())) {
                        submissionData.jobNumberApprovalDate = dateObj.toISOString();
                    } else {
                        showToast('error', `Invalid Date format: "${cleanDate}". Please use DD/MM/YYYY`);
                        setLoading(false);
                        return;
                    }
                } else if (cleanDate.length > 0) {
                    showToast('error', `Invalid Date format: "${cleanDate}". Please use DD/MM/YYYY`);
                    setLoading(false);
                    return;
                }
            }

            const url = isEditing ? `/api/approved-works/${initialData._id}` : '/api/approved-works';
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.error || 'Failed to save work');
            }

            setLoading(false);
            showToast('success', isEditing ? 'Work updated successfully!' : 'Work saved successfully!');
            setTimeout(() => {
                router.push('/approved-works');
                router.refresh();
            }, 1500);
        } catch (error) {
            console.error(error);
            setLoading(false);
            showToast('error', error instanceof Error ? error.message : 'Error saving work. Please try again.');
        }
    };

    return (
        <>
        {/* Loading Overlay */}
        {loading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" style={{ transition: 'opacity 0.3s' }}>
                <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-sm font-medium text-gray-700">Saving work...</p>
                </div>
            </div>
        )}

        {/* Toast Notification */}
        {toast.visible && (
            <div
                className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border transition-all duration-300 ${
                    toast.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                }`}
                style={{ minWidth: '320px', animation: 'slideInRight 0.4s ease-out' }}
            >
                {toast.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                )}
                <span className="text-sm font-medium flex-1">{toast.message}</span>
                <button
                    onClick={() => setToast(prev => ({ ...prev, visible: false }))}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        )}

        <style jsx global>{`
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        `}</style>

        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white p-8 shadow rounded-lg">
            
            <BasicInfoSection formData={formData} handleChange={handleChange} />

            <BudgetSection formData={formData} handleChange={handleChange} />

            <ClassificationSection formData={formData} handleChange={handleChange} />

            <div className="pt-5">
                <div className="flex justify-end">
                    <Link
                        href="/approved-works"
                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="ml-3 inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        {loading ? 'Saving...' : 'Save Work'}
                    </button>
                </div>
            </div>
        </form>
        </>
    );
}
