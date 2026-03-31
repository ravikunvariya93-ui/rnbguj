import Link from 'next/link';

export default function BillsPage() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-gray-900">Bills</h1>
                    <p className="mt-2 text-sm text-gray-700">Bill management module — coming soon.</p>
                </div>
            </div>
            <div className="mt-16 text-center text-gray-400 text-sm">
                No bills yet.
            </div>
        </div>
    );
}
