'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Plus, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface PackageFormProps {
    initialData?: any;
    isEditing?: boolean;
}

import SearchableSelect from './SearchableSelect';

export default function PackageForm({ initialData = {}, isEditing = false }: PackageFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Basic info
    const [packageName, setPackageName] = useState(initialData.packageName || '');
    const [subDivision, setSubDivision] = useState(initialData.subDivision || '');
    const [workType, setWorkType] = useState(initialData.workType || '');
    const [buildingType, setBuildingType] = useState(initialData.buildingType || '');
    const [buildingTypeOptions, setBuildingTypeOptions] = useState<string[]>([]);
    const [isAddingNewBuildingType, setIsAddingNewBuildingType] = useState(false);
    const [newBuildingTypeValue, setNewBuildingTypeValue] = useState('');
    const [dtpConsultant, setDtpConsultant] = useState(initialData.dtpConsultant || '');

    useEffect(() => {
        const fetchBuildingTypes = async () => {
            try {
                const res = await fetch('/api/metadata/building-types');
                if (res.ok) {
                    const dbBuildingTypes = await res.json();
                    const DEFAULT_BUILDING_TYPES = [
                        "Residential",
                        "Non-Residential",
                        "Hospital",
                        "School",
                        "Office"
                    ];
                    const initialBuildingType = initialData.buildingType ? [initialData.buildingType] : [];
                    const combined = Array.from(new Set([...DEFAULT_BUILDING_TYPES, ...initialBuildingType, ...dbBuildingTypes])).sort();
                    setBuildingTypeOptions(combined);
                }
            } catch (error) {
                console.error("Failed to fetch building types", error);
            }
        };
        fetchBuildingTypes();
    }, [initialData.buildingType]);

    const handleBuildingTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value === 'ADD_NEW') {
            setIsAddingNewBuildingType(true);
        } else {
            setBuildingType(e.target.value);
        }
    };

    const handleAddNewBuildingType = () => {
        if (newBuildingTypeValue.trim()) {
            const val = newBuildingTypeValue.trim();
            if (!buildingTypeOptions.includes(val)) {
                setBuildingTypeOptions(prev => [...prev, val].sort());
            }
            setBuildingType(val);
            setIsAddingNewBuildingType(false);
            setNewBuildingTypeValue('');
        }
    };

    const cancelAddNewBuildingType = () => {
        setIsAddingNewBuildingType(false);
        setNewBuildingTypeValue('');
    };

    // Budget Head info
    const [budgetHead, setBudgetHead] = useState(initialData.budgetHead || '');
    const [budgetHeadOptions, setBudgetHeadOptions] = useState<string[]>([]);
    const [isAddingNewBudgetHead, setIsAddingNewBudgetHead] = useState(false);
    const [newBudgetHeadValue, setNewBudgetHeadValue] = useState('');
    const [approvedWorks, setApprovedWorks] = useState<any[]>([]);

    // Committee info
    const [finalContractPrice, setFinalContractPrice] = useState<string>(
        initialData.finalContractPrice !== undefined ? String(initialData.finalContractPrice) : ''
    );
    const [committeeDate, setCommitteeDate] = useState(
        initialData.committeeDate ? new Date(initialData.committeeDate).toISOString().split('T')[0] : ''
    );

    // Auto-determine committee based on finalContractPrice and budgetHead
    const autoCommittee = useMemo(() => {
        const bhRaw = budgetHead.trim();
        if (!bhRaw) return ''; // no budget head yet
        const cp = parseFloat(finalContractPrice) || 0;
        const bh = bhRaw.toLowerCase();
        const bandhkamBudgets = ['15th finance commission', '2515 cdp-5', 'dp own fund', 'ddo shri pravas grant', 'icds', 'pending'];
        const karobariBudgets = ['3054 s.r.', 'buj', 'pending'];
        const isBandhkam = cp < 2500000 && bandhkamBudgets.some(b => bh.includes(b));
        const isKarobari = cp >= 2500000 && karobariBudgets.some(b => bh.includes(b));
        return isBandhkam ? 'Bandhkam Committee' : isKarobari ? 'Karobari' : 'Not Required';
    }, [finalContractPrice, budgetHead]);

    useEffect(() => {
        const fetchBudgetHeads = async () => {
            try {
                const res = await fetch('/api/metadata/budget-heads');
                if (res.ok) {
                    const dbBudgetHeads = await res.json();
                    const initialBudgetHead = initialData.budgetHead ? [initialData.budgetHead] : [];
                    const combined = Array.from(new Set([...initialBudgetHead, ...dbBudgetHeads])).filter(Boolean).sort();
                    setBudgetHeadOptions(combined as string[]);
                }
            } catch (error) {
                console.error("Failed to fetch budget heads", error);
            }
        };
        fetchBudgetHeads();
    }, [initialData.budgetHead]);

    useEffect(() => {
        const fetchApprovedWorks = async () => {
            try {
                const res = await fetch('/api/approved-works');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setApprovedWorks(data.data);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch approved works", error);
            }
        };
        fetchApprovedWorks();
    }, []);

    const handleBudgetHeadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value === 'ADD_NEW') {
            setIsAddingNewBudgetHead(true);
        } else {
            setBudgetHead(e.target.value);
        }
    };

    const handleAddNewBudgetHead = () => {
        if (newBudgetHeadValue.trim()) {
            const val = newBudgetHeadValue.trim();
            if (!budgetHeadOptions.includes(val)) {
                setBudgetHeadOptions(prev => [...prev, val].sort());
            }
            setBudgetHead(val);
            setIsAddingNewBudgetHead(false);
            setNewBudgetHeadValue('');
        }
    };

    const cancelAddNewBudgetHead = () => {
        setIsAddingNewBudgetHead(false);
        setNewBudgetHeadValue('');
    };

    // Selected works list
    const [selectedWorks, setSelectedWorks] = useState<{ workId: string | null, workName: string, amount: number, tsNotRequired?: boolean }[]>(initialData.works || []);

    // Available works from DB (Technical Sanctions)
    const [availableWorks, setAvailableWorks] = useState<{ _id: string, workName: string, tsAmount: number }[]>([]);

    // All packages from DB
    const [allPackagesData, setAllPackagesData] = useState<any[]>([]);

    // T.S. Not Required Checkbox State
    const [tsNotRequiredCheckbox, setTsNotRequiredCheckbox] = useState(false);

    // Temporary selection state for the dropdown
    const [currentSelectionId, setCurrentSelectionId] = useState('');

    // Auto-calculate DTP Amount logic removed
    useEffect(() => {
        const fetchAvailableWorks = async () => {
            try {
                const [resTS, resPackages] = await Promise.all([
                    fetch('/api/technical-sanctions'),
                    fetch('/api/packages?limit=1000')
                ]);
                const dataTS = await resTS.json();
                const dataPackages = await resPackages.json();

                if (dataTS.success && dataPackages.success) {
                    setAllPackagesData(dataPackages.data);
                    // Extract all workIds that are already in any OTHER package in the database
                    const otherPackages = isEditing 
                        ? dataPackages.data.filter((p: any) => p._id !== initialData._id)
                        : dataPackages.data;
                    
                    const assignedWorkIds = new Set<string>();
                    otherPackages.forEach((p: any) => {
                        if (p.works && Array.isArray(p.works)) {
                            p.works.forEach((w: any) => {
                                if (w.workId) {
                                    assignedWorkIds.add(String(w.workId));
                                }
                            });
                        }
                    });

                    // Only include works where TS has been given AND is not assigned to any other package
                    const givenTS = dataTS.data.filter((ts: any) => 
                        ts.tsDate && 
                        ts.tsAmount && 
                        !assignedWorkIds.has(String(ts._id))
                    );
                    setAvailableWorks(givenTS);
                }
            } catch (error) {
                console.error("Failed to fetch available works", error);
            }
        };
        fetchAvailableWorks();
    }, [isEditing, initialData]);

    const handleAddWork = () => {
        if (!currentSelectionId) return;

        if (tsNotRequiredCheckbox) {
            const workToAdd = approvedWorks.find(w => w._id === currentSelectionId);
            if (workToAdd) {
                if (selectedWorks.some(sw => sw.workName === workToAdd.workName)) {
                    alert("Work already added to this package.");
                    return;
                }
                setSelectedWorks(prev => [...prev, {
                    workId: null,
                    workName: workToAdd.workName,
                    amount: (workToAdd.jobNumberAmount || 0) * 100000,
                    tsNotRequired: true
                }]);
                setCurrentSelectionId('');
            }
        } else {
            const workToAdd = availableWorks.find(w => w._id === currentSelectionId);
            if (workToAdd) {
                // Check if already added
                if (selectedWorks.some(sw => sw.workId === workToAdd._id)) {
                    alert("Work already added to this package.");
                    return;
                }

                setSelectedWorks(prev => [...prev, {
                    workId: workToAdd._id,
                    workName: workToAdd.workName,
                    amount: (workToAdd.tsAmount || 0) * 100000,
                    tsNotRequired: false
                }]);
                setCurrentSelectionId(''); // Reset selection
            }
        }
    };

    // Auto-inherit Budget Head from selected approved works if same
    useEffect(() => {
        if (selectedWorks.length === 0 || approvedWorks.length === 0) return;

        const normalize = (name: string) => name.toLowerCase().replace(/\s+/g, ' ').trim();
        
        const matchedBudgetHeads = selectedWorks.map(sw => {
            const normalizedName = normalize(sw.workName);
            const aw = approvedWorks.find(aw => normalize(aw.workName) === normalizedName);
            return aw?.budgetHead || null;
        }).filter(Boolean); // Only count non-empty budget heads

        if (matchedBudgetHeads.length > 0) {
            const first = matchedBudgetHeads[0];
            const allSame = matchedBudgetHeads.every(bh => bh === first);
            if (allSame && first) {
                setBudgetHead(first);
            }
        }
    }, [selectedWorks, approvedWorks]);

    const handleRemoveWork = (workName: string, id: string | null) => {
        setSelectedWorks(prev => prev.filter(w => {
            if (id && w.workId === id) return false;
            if (w.workName === workName) return false;
            return true;
        }));
    };

    const handleWorkSelect = (id: string) => {
        setCurrentSelectionId(id);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();


        setLoading(true);

        try {
            const submissionData = {
                packageName,
                subDivision,
                workType,
                buildingType: workType === 'Building' ? buildingType : undefined,
                budgetHead,
                dtpConsultant,
                works: selectedWorks,
                committee: autoCommittee,
                committeeDate: committeeDate || undefined,
            };

            const url = isEditing ? `/api/packages/${initialData._id}` : '/api/packages';
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData),
            });

            if (!res.ok) {
                throw new Error('Failed to save package');
            }

            router.push('/packages');
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('Error saving package');
        } finally {
            setLoading(false);
        }
    };

    // Prepare options for SearchableSelect
    const workOptions = useMemo(() => {
        if (tsNotRequiredCheckbox) {
            // Find approved works that are not already added to selectedWorks
            return approvedWorks
                .filter(aw => {
                    const inCurrent = selectedWorks.some(sw => sw.workName === aw.workName);
                    if (inCurrent) return false;
                    const inOther = allPackagesData.some((p: any) => 
                        p._id !== initialData._id && p.works?.some((w: any) => w.workName === aw.workName)
                    );
                    return !inOther;
                })
                .map(aw => ({
                    _id: aw._id,
                    packageName: aw.workName,
                    'TS Amount': 'T.S. Not Required'
                }));
        } else {
            return availableWorks
                .filter(w => !selectedWorks.some(sw => sw.workId === w._id))
                .map(w => ({
                    _id: w._id,
                    packageName: w.workName,
                    'TS Amount': w.tsAmount ? `₹${w.tsAmount} Lacs` : 'N/A'
                }));
        }
    }, [availableWorks, selectedWorks, tsNotRequiredCheckbox, approvedWorks, allPackagesData, initialData._id]);

    return (
        <>
        {loading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs transition-opacity duration-300">
                <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3 border border-slate-100">
                    <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                    <p className="text-sm font-semibold text-slate-700">Processing & Saving Package...</p>
                </div>
            </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white p-8 shadow rounded-lg">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

                <div className="sm:col-span-6">
                    <label htmlFor="packageName" className="block text-sm font-medium text-gray-700"> Package Name * </label>
                    <input
                        type="text"
                        id="packageName"
                        required
                        value={packageName}
                        onChange={(e) => setPackageName(e.target.value)}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    />
                </div>

                <div className="sm:col-span-6">
                    <label htmlFor="subDivision" className="block text-sm font-medium text-gray-700"> Sub Division </label>
                    <select
                        id="subDivision"
                        value={subDivision}
                        onChange={(e) => setSubDivision(e.target.value)}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    >
                        <option value="">-- Select Sub Division --</option>
                        <option value="Bhavnagar">Bhavnagar</option>
                        <option value="Mahuva">Mahuva</option>
                        <option value="Palitana">Palitana</option>
                        <option value="Talaja">Talaja</option>
                        <option value="Shihor">Shihor</option>
                        <option value="Vallabhipur">Vallabhipur</option>
                    </select>
                </div>

                <div className="sm:col-span-6">
                    <label htmlFor="workType" className="block text-sm font-medium text-gray-700"> Work Type </label>
                    <select
                        id="workType"
                        value={workType}
                        onChange={(e) => {
                            setWorkType(e.target.value);
                            if (e.target.value !== 'Building') {
                                setBuildingType('');
                            }
                        }}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    >
                        <option value="">-- Select Work Type --</option>
                        <option value="Road">Road</option>
                        <option value="Building">Building</option>
                        <option value="Structure">Structure</option>
                        <option value="Service">Service</option>
                    </select>
                </div>

                {workType === 'Building' && (
                    <div className="sm:col-span-6">
                        <label htmlFor="buildingType" className="block text-sm font-medium text-gray-700"> Building Type </label>
                        {isAddingNewBuildingType ? (
                            <div className="flex gap-2 items-center mt-1">
                                <input
                                    type="text"
                                    className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                                    value={newBuildingTypeValue}
                                    onChange={(e) => setNewBuildingTypeValue(e.target.value)}
                                    placeholder="Enter new building type..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddNewBuildingType();
                                        } else if (e.key === 'Escape') {
                                            e.preventDefault();
                                            cancelAddNewBuildingType();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddNewBuildingType}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
                                >
                                    Add
                                </button>
                                <button
                                    type="button"
                                    onClick={cancelAddNewBuildingType}
                                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <select
                                id="buildingType"
                                value={buildingType}
                                onChange={handleBuildingTypeChange}
                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border bg-white"
                            >
                                <option value="">-- Select Building Type --</option>
                                {buildingTypeOptions.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                                <option value="ADD_NEW" className="text-emerald-600 font-bold">+ Add New Building Type</option>
                            </select>
                        )}
                    </div>
                )}

                <div className="sm:col-span-6">
                    <label htmlFor="dtpConsultant" className="block text-sm font-medium text-gray-700">DTP Consultant</label>
                    <select
                        name="dtpConsultant"
                        id="dtpConsultant"
                        value={dtpConsultant}
                        onChange={(e) => setDtpConsultant(e.target.value)}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    >
                        <option value="">-- Select Consultant --</option>
                        <option value="Umiya Engineers and Project Management Consultancy">Umiya Engineers and Project Management Consultancy</option>
                        <option value="Trisha Engineers Consultancy">Trisha Engineers Consultancy</option>
                        <option value="Pramukham Engineers Consultancy">Pramukham Engineers Consultancy</option>
                        <option value="Kalyan Computers">Kalyan Computers</option>
                        <option value="Karansinh Janaksinh Rana">Karansinh Janaksinh Rana</option>
                        <option value="MCWAY MANAGEMENTS LIMITED">MCWAY MANAGEMENTS LIMITED</option>
                        <option value="Infinizy Civil Consultant">Infinizy Civil Consultant</option>
                    </select>
                </div>

                <div className="sm:col-span-6">
                    <label htmlFor="budgetHead" className="block text-sm font-medium text-gray-700"> Budget Head </label>
                    {isAddingNewBudgetHead ? (
                        <div className="flex gap-2 items-center mt-1">
                            <input
                                type="text"
                                className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                                value={newBudgetHeadValue}
                                onChange={(e) => setNewBudgetHeadValue(e.target.value)}
                                placeholder="Enter new budget head..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddNewBudgetHead();
                                    } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        cancelAddNewBudgetHead();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleAddNewBudgetHead}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
                            >
                                Add
                            </button>
                            <button
                                type="button"
                                onClick={cancelAddNewBudgetHead}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <select
                            id="budgetHead"
                            value={budgetHead}
                            onChange={handleBudgetHeadChange}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border bg-white"
                        >
                            <option value="">-- Select Budget Head --</option>
                            {budgetHeadOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                            <option value="ADD_NEW" className="text-emerald-600 font-bold">+ Add New Budget Head</option>
                        </select>
                    )}
                </div>

                {/* ─── Committee Section ─── */}
                <div className="sm:col-span-6">
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-4">
                        <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wide flex items-center gap-2">
                            <span>🏛️</span> Committee Approval
                        </h3>

                        {/* Final Contract Price input — only relevant for Bandhkam/Karobari determination */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Final Contract Price (₹)
                                <span className="ml-1 text-xs text-gray-500 font-normal">(used to determine required committee)</span>
                            </label>
                            <input
                                type="number"
                                placeholder="e.g. 2000000"
                                value={finalContractPrice}
                                onChange={(e) => setFinalContractPrice(e.target.value)}
                                className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                            />
                        </div>

                        {/* Auto-determined Committee */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Which Committee's Approval Required?</label>
                            {autoCommittee ? (
                                <div className="flex items-center gap-3">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                                        autoCommittee === 'Bandhkam Committee'
                                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                            : autoCommittee === 'Karobari'
                                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                            : 'bg-slate-100 text-slate-500 border border-slate-300'
                                    }`}>
                                        {autoCommittee}
                                    </span>
                                    {autoCommittee !== 'Not Required' && (
                                        <span className="text-xs text-gray-500">
                                            {autoCommittee === 'Bandhkam Committee'
                                                ? `(Contract price < ₹25L & Budget Head matches)`
                                                : `(Contract price ≥ ₹25L & Budget Head matches)`}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                    ⚠️ Select a Budget Head to determine committee. Qualifying heads:
                                    <ul className="mt-1 ml-4 list-disc text-xs text-amber-600 space-y-0.5">
                                        <li><strong>Bandhkam Committee</strong> (price &lt; ₹25L): 15th Finance Commission, 2515 CDP-5, DP OWN FUND - DDO Shri Pravas Grant, ICDS, Pending</li>
                                        <li><strong>Karobari</strong> (price ≥ ₹25L): 3054 S.R., BUJ, Pending</li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Committee Date — only for Bandhkam or Karobari */}
                        {(autoCommittee === 'Bandhkam Committee' || autoCommittee === 'Karobari') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Committee Date</label>
                                <input
                                    type="date"
                                    value={committeeDate}
                                    onChange={(e) => setCommitteeDate(e.target.value)}
                                    className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="sm:col-span-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Approved Works in Package</h3>

                    {/* Selection Area */}
                    <div className="flex items-end gap-4 mb-4">
                        <div className="flex-grow">
                            <SearchableSelect 
                                label="Select a Work to Add"
                                options={workOptions}
                                value={currentSelectionId}
                                onChange={handleWorkSelect}
                                placeholder="Search by work name..."
                                helperField="TS Amount"
                            />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <input 
                                type="checkbox" 
                                id="tsNotRequiredCheckbox" 
                                checked={tsNotRequiredCheckbox} 
                                onChange={(e) => {
                                    setTsNotRequiredCheckbox(e.target.checked);
                                    setCurrentSelectionId('');
                                }} 
                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                            />
                            <label htmlFor="tsNotRequiredCheckbox" className="text-xs font-bold text-slate-700 select-none">T.S. Not Required</label>
                        </div>
                        <button
                            type="button"
                            onClick={handleAddWork}
                            disabled={!currentSelectionId}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 h-[42px]"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add
                        </button>
                    </div>


                    {/* Works List */}
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                        {selectedWorks.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No works added yet.</p>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {selectedWorks.map((work, index) => (
                                    <li key={work.workId || work.workName} className="py-3 flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{work.workName}</p>
                                            {work.tsNotRequired ? (
                                                <p className="text-xs text-amber-600 font-semibold">T.S. Not Required</p>
                                            ) : (
                                                <p className="text-xs text-gray-500">TS Amount: ₹{(work.amount / 100000).toFixed(2)} Lacs</p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveWork(work.workName, work.workId)}
                                            className="text-red-600 hover:text-red-900 p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

            </div>

            <div className="pt-5">
                <div className="flex justify-end">
                    <Link href="/packages" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">Cancel</Link>
                    <button type="submit" disabled={loading} className="ml-3 inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {loading ? 'Saving...' : 'Save Package'}
                    </button>
                </div>
            </div>
        </form >
        </>
    );
}
