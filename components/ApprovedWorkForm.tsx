'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import Link from 'next/link';

interface FormData {
    circle: string;
    district: string;
    subDivision: string;
    taluka: string;
    constituencyName: string;
    budgetItemName: string;
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
    const [formData, setFormData] = useState<FormData>({
        circle: 'Panchayat R&B Circle, Rajkot',
        district: 'Bhavnagar',
        subDivision: '',
        taluka: '',
        constituencyName: '',
        budgetItemName: '',
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
                // Match DD/MM or DD/MM/YYYY or DD-MM-YYYY
                const parts = cleanDate.split(/[\/\-\.]/);

                if (parts.length === 3) {
                    // DD/MM/YYYY -> YYYY-MM-DD
                    // Ensure 4 digit year
                    let year = parts[2];
                    if (year.length === 2) year = '20' + year;

                    const isoDate = `${year}-${parts[1]}-${parts[0]}`;
                    const dateObj = new Date(isoDate);

                    if (!isNaN(dateObj.getTime())) {
                        submissionData.jobNumberApprovalDate = dateObj.toISOString();
                    } else {
                        console.error('Date parse failed for:', isoDate);
                        alert(`Invalid Date format: "${cleanDate}". parsed as ${isoDate}. Please use DD/MM/YYYY`);
                        setLoading(false);
                        return;
                    }
                } else if (cleanDate.length > 0) {
                    // If they entered something that isn't 3 parts but logic triggers
                    alert(`Invalid Date format: "${cleanDate}". Please use DD/MM/YYYY`);
                    setLoading(false);
                    return;
                }
            }

            const url = isEditing ? `/api/approved-works/${initialData._id}` : '/api/approved-works';
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData),
            });

            if (!res.ok) {
                throw new Error('Failed to save work');
            }

            router.push('/approved-works');
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('Error saving work');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white p-8 shadow rounded-lg">

            {/* Basic Information */}
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-6">
                    <label htmlFor="workName" className="block text-sm font-medium text-gray-700">
                        Name of Work *
                    </label>
                    <div className="mt-1">
                        <textarea
                            id="workName"
                            name="workName"
                            rows={3}
                            required
                            value={formData.workName}
                            onChange={handleChange}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                            placeholder="Name of work in English"
                        />
                    </div>
                </div>

                <div className="sm:col-span-6">
                    <label htmlFor="workNameGujarati" className="block text-sm font-medium text-gray-700">
                        Name of Work in Gujarati
                    </label>
                    <div className="mt-1">
                        <textarea
                            id="workNameGujarati"
                            name="workNameGujarati"
                            rows={3}
                            value={formData.workNameGujarati}
                            onChange={handleChange}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                            placeholder="કામનું નામ (ગુજરાતીમાં)"
                        />
                    </div>
                </div>

                <div className="sm:col-span-2">
                    <label htmlFor="circle" className="block text-sm font-medium text-gray-700">Circle</label>
                    <input type="text" name="circle" id="circle" value={formData.circle} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>

                <div className="sm:col-span-2">
                    <label htmlFor="district" className="block text-sm font-medium text-gray-700">District</label>
                    <input type="text" name="district" id="district" value={formData.district} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>

                <div className="sm:col-span-2">
                    <label htmlFor="subDivision" className="block text-sm font-medium text-gray-700">Sub Division</label>
                    <select
                        name="subDivision"
                        id="subDivision"
                        value={formData.subDivision}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    >
                        <option value="">-- Select Sub Division --</option>
                        <option value="Bhavnagar">Bhavnagar</option>
                        <option value="Mahuva">Mahuva</option>
                        <option value="Palitana">Palitana</option>
                        <option value="Talaja">Talaja</option>
                    </select>
                </div>

                <div className="sm:col-span-2">
                    <label htmlFor="taluka" className="block text-sm font-medium text-gray-700">Taluka</label>
                    <select
                        name="taluka"
                        id="taluka"
                        value={formData.taluka}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    >
                        <option value="">-- Select Taluka --</option>
                        <option value="Bhavnagar">Bhavnagar</option>
                        <option value="Shihor">Shihor</option>
                        <option value="Umrala">Umrala</option>
                        <option value="Gariyadhar">Gariyadhar</option>
                        <option value="Palitana">Palitana</option>
                        <option value="Mahuva">Mahuva</option>
                        <option value="Talaja">Talaja</option>
                        <option value="Ghogha">Ghogha</option>
                        <option value="Jesar">Jesar</option>
                        <option value="Vallabhipur">Vallabhipur</option>
                    </select>
                </div>

                <div className="sm:col-span-2">
                    <label htmlFor="length" className="block text-sm font-medium text-gray-700">Length (K.M.)</label>
                    <input
                        type="number"
                        step="0.001"
                        name="length"
                        id="length"
                        value={formData.length}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                        placeholder="e.g. 2.50"
                    />
                </div>
            </div>

            {/* Budget & Approval Details */}
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
                            <option value="5054">5054</option>
                            <option value="3054">3054</option>
                            <option value="2215">2215</option>
                            <option value="2217">2217</option>
                            <option value="4215">4215</option>
                            <option value="4217">4217</option>
                            <option value="Other">Other</option>
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
                        <label htmlFor="jobNumberAmount" className="block text-sm font-medium text-gray-700">Job Number Amount</label>
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

            {/* Classification */}
            <div className="pt-8">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Classification Details</h3>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-2">
                        <label htmlFor="constituencyName" className="block text-sm font-medium text-gray-700">Constituency Name</label>
                        <input type="text" name="constituencyName" id="constituencyName" value={formData.constituencyName} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="mlaName" className="block text-sm font-medium text-gray-700">MLA Name</label>
                        <select
                            name="mlaName"
                            id="mlaName"
                            value={formData.mlaName}
                            onChange={handleChange}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                        >
                            <option value="">-- Select MLA --</option>
                            <option value="Parshottambhai O. Solanki (Bhavnagar Rural)">Parshottambhai O. Solanki (Bhavnagar Rural)</option>
                            <option value="Jitu Vaghani (Bhavnagar West)">Jitu Vaghani (Bhavnagar West)</option>
                            <option value="Sejalben Rajivkumar Pandya (Bhavnagar East)">Sejalben Rajivkumar Pandya (Bhavnagar East)</option>
                            <option value="Bhikhubhai Baraiya (Palitana)">Bhikhubhai Baraiya (Palitana)</option>
                            <option value="Gautambhai Gopabhai Chauhan (Talaja)">Gautambhai Gopabhai Chauhan (Talaja)</option>
                            <option value="Shivabhai Jerambhai Gohil (Mahuva)">Shivabhai Jerambhai Gohil (Mahuva)</option>
                            <option value="Sudhirbhai Vaghani (Gariyadhar)">Sudhirbhai Vaghani (Gariyadhar)</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="mpName" className="block text-sm font-medium text-gray-700">MP Name</label>
                        <select
                            name="mpName"
                            id="mpName"
                            value={formData.mpName}
                            onChange={handleChange}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                        >
                            <option value="">-- Select MP --</option>
                            <option value="Nimuben Jayantibhai Bambhaniya (Bhavnagar)">Nimuben Jayantibhai Bambhaniya (Bhavnagar)</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="wmsItemCode" className="block text-sm font-medium text-gray-700">WMS Item Code</label>
                        <input type="text" name="wmsItemCode" id="wmsItemCode" value={formData.wmsItemCode} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="rpmsCode" className="block text-sm font-medium text-gray-700">RPMS Code</label>
                        <input type="text" name="rpmsCode" id="rpmsCode" value={formData.rpmsCode} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="roadCategory" className="block text-sm font-medium text-gray-700">Category of Road</label>
                        <select
                            name="roadCategory"
                            id="roadCategory"
                            value={formData.roadCategory}
                            onChange={handleChange}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                        >
                            <option value="">-- Select Category --</option>
                            <option value="State Highway (SH)">State Highway (SH)</option>
                            <option value="Major District Road (MDR)">Major District Road (MDR)</option>
                            <option value="Other District Road (ODR)">Other District Road (ODR)</option>
                            <option value="Village Road (VR)">Village Road (VR)</option>
                            <option value="City Road">City Road</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="workType" className="block text-sm font-medium text-gray-700">Work Type</label>
                        <select
                            name="workType"
                            id="workType"
                            value={formData.workType}
                            onChange={handleChange}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                        >
                            <option value="Road">Road</option>
                            <option value="Building">Building</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="natureOfWork" className="block text-sm font-medium text-gray-700">Nature of Work</label>
                        <select
                            name="natureOfWork"
                            id="natureOfWork"
                            value={formData.natureOfWork}
                            onChange={handleChange}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                        >
                            <option value="">-- Select Nature of Work --</option>
                            <option value="New Development">New Development</option>
                            <option value="Resurfacing">Resurfacing</option>
                            <option value="Widening & Strengthening">Widening & Strengthening</option>
                            <option value="Bridge Work">Bridge Work</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="schemeName" className="block text-sm font-medium text-gray-700">Name of Scheme</label>
                        <select
                            name="schemeName"
                            id="schemeName"
                            value={formData.schemeName}
                            onChange={handleChange}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                        >
                            <option value="">-- Select Name of Scheme --</option>
                            <option value="Mukhya Mantri Village Road Scheme">Mukhya Mantri Village Road Scheme</option>
                            <option value="State Highway Development">State Highway Development</option>
                            <option value="Major District Road Maintenance">Major District Road Maintenance</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>
            </div>

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
                        className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Work'}
                    </button>
                </div>
            </div>
        </form>
    );
}
