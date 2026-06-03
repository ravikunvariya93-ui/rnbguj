import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] w-full h-full gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            <p className="text-gray-500 font-medium animate-pulse text-lg">Loading...</p>
        </div>
    );
}
