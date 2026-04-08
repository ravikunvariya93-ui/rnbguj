'use client';

interface BasicInfoSectionProps {
    formData: {
        workName: string;
        workNameGujarati: string;
        circle: string;
        district: string;
        subDivision: string;
        taluka: string;
        length: string;
    };
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export default function BasicInfoSection({ formData, handleChange }: BasicInfoSectionProps) {
    return (
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
                    <option value="Shihor">Shihor</option>
                    <option value="Vallabhipur">Vallabhipur</option>
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
    );
}
