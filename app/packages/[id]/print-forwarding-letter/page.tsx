import dbConnect from '@/lib/db';
import Package from '@/models/Package';
import DTP from '@/models/DTP';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ForwardingLetterClient from './ForwardingLetterClient';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function PrintForwardingLetterPage({ params }: Props) {
    await dbConnect();
    const { id } = await params;

    // Fetch Package details
    const pkgRaw = await Package.findById(id).lean() as any;
    if (!pkgRaw) notFound();

    // Fetch DTP details
    const dtpRaw = await DTP.findOne({ tsId: pkgRaw._id }).lean() as any;

    if (!dtpRaw) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 space-y-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center space-y-3 max-w-md">
                    <h1 className="text-lg font-bold text-slate-800">DTP Details Pending</h1>
                    <p className="text-sm text-slate-500">
                        DTP Details have not been created for this package yet. Please create DTP Details before printing.
                    </p>
                    <Link href={`/packages/${id}`} className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors">
                        ← Back to Package
                    </Link>
                </div>
            </div>
        );
    }

    // Serialize data
    const packageData = JSON.parse(JSON.stringify(pkgRaw));
    const dtp = JSON.parse(JSON.stringify(dtpRaw));

    return (
        <ForwardingLetterClient
            packageData={packageData}
            dtp={dtp}
        />
    );
}
