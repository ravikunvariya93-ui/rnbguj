import BOQForm from '@/components/BOQForm';

export default function NewBOQPage() {
    return (
        <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold font-heading text-gray-900 mb-8">Add New Bill of Quantities (BOQ)</h1>
            <BOQForm />
        </div>
    );
}
