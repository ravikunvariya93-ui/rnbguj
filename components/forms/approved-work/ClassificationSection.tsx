'use client';
import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';

interface ClassificationSectionProps {
    formData: {
        constituencyName: string;
        mlaName: string;
        mpName: string;
        wmsItemCode: string;
        rpmsCode: string;
        roadCategory: string;
        workType: string;
        natureOfWork: string;
        schemeName: string;
    };
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export default function ClassificationSection({ formData, handleChange }: ClassificationSectionProps) {
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newOptionValue, setNewOptionValue] = useState('');
    const [natureOfWorkOptions, setNatureOfWorkOptions] = useState([
        "Resurfacing",
        "Widening & Strengthening",
        "Maintenance",
        "EBT",
        "Major Bridge",
        "Minor Bridge",
        "CWB",
        "CCR"
    ]);

    const handleNatureOfWorkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value === 'ADD_NEW') {
            setIsAddingNew(true);
        } else {
            handleChange(e);
        }
    };

    const handleAddNewOption = () => {
        if (newOptionValue.trim()) {
            if (!natureOfWorkOptions.includes(newOptionValue.trim())) {
                setNatureOfWorkOptions(prev => [...prev, newOptionValue.trim()]);
            }
            // Mock a change event to update parent state
            const mockEvent = {
                target: {
                    name: 'natureOfWork',
                    value: newOptionValue.trim()
                }
            } as any;
            handleChange(mockEvent);
            setIsAddingNew(false);
            setNewOptionValue('');
        }
    };

    const cancelAddNew = () => {
        setIsAddingNew(false);
        setNewOptionValue('');
    };

    return (
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
                        <option value="Mahant Shambhunath Tundiya (Gadhada)">Mahant Shambhunath Tundiya (Gadhada)</option>
                        <option value="Sejalben Rajivkumar Pandya (Bhavnagar East)">Sejalben Rajivkumar Pandya (Bhavnagar East)</option>
                        <option value="Bhikhubhai Baraiya (Palitana)">Bhikhubhai Baraiya (Palitana)</option>
                        <option value="Gautambhai Gopabhai Chauhan (Talaja)">Gautambhai Gopabhai Chauhan (Talaja)</option>
                        <option value="Shivabhai Jerambhai Gohil (Mahuva)">Shivabhai Jerambhai Gohil (Mahuva)</option>
                        <option value="Sudhirbhai Vaghani (Gariyadhar)">Sudhirbhai Vaghani (Gariyadhar)</option>
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
                        <option value="Bharatbhai Manubhai Sutariya (Amreli)">Bharatbhai Manubhai Sutariya (Amreli)</option>
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
                        <option value="Major District Road (MDR)">Major District Road (MDR)</option>
                        <option value="Other District Road (ODR)">Other District Road (ODR)</option>
                        <option value="Village Road (VR)">Village Road (VR)</option>
                        <option value="VR NP">VR NP</option>
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
                        <option value="Structure">Structure</option>
                    </select>
                </div>

                <div className="sm:col-span-2">
                    <label htmlFor="natureOfWork" className="block text-sm font-medium text-gray-700 font-bold mb-1 flex justify-between items-center">
                        Nature of Work
                    </label>
                    {isAddingNew ? (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                autoFocus
                                value={newOptionValue}
                                onChange={(e) => setNewOptionValue(e.target.value)}
                                className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter new nature..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddNewOption();
                                    } else if (e.key === 'Escape') {
                                        cancelAddNew();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleAddNewOption}
                                className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                title="Add"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={cancelAddNew}
                                className="p-2 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300 transition-colors"
                                title="Cancel"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <select
                            name="natureOfWork"
                            id="natureOfWork"
                            value={formData.natureOfWork}
                            onChange={handleNatureOfWorkChange}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            <option value="">-- Select Nature of Work --</option>
                            {natureOfWorkOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                            <option value="ADD_NEW" className="text-blue-600 font-bold italic">+ Add New...</option>
                        </select>
                    )}
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
                        <option value="MMGSY">MMGSY</option>
                        <option value="Suvidhapath">Suvidhapath</option>
                        <option value="SR">SR</option>
                        <option value="BUJ">BUJ</option>
                        <option value="EMRI - MMGSY">EMRI - MMGSY</option>
                    </select>
                </div>
            </div>
        </div>
    );
}
