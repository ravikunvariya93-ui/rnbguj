import dbConnect from '@/lib/db';
import Package from '@/models/Package';
import Tender from '@/models/Tender';
import LOA from '@/models/LOA';
import Agency from '@/models/Agency';
import type { QueryFilter } from 'mongoose';
import type { ITender } from '@/models/Tender';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import NoticeLetterClient from './NoticeLetterClient';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ n?: string }>;
}

interface IdLean {
    _id: string;
}

interface TenderLean {
    _id: string;
    contractorId?: string;
    contractorName?: string;
}

interface LOALean {
    _id: string;
    notices?: { wsNo?: string; noticeDate?: string }[];
}

export default async function PrintNoticePage({ params, searchParams }: Props) {
    await dbConnect();
    const { id } = await params;
    const { n } = await searchParams;
    const noticeIndex = Math.max(0, parseInt(n || '0', 10) || 0);

    const pkgRaw = await Package.findById(id).lean() as unknown as IdLean | null;
    if (!pkgRaw) notFound();

    const tenderRaw = await Tender.findOne({ packageId: pkgRaw._id, cancelled: { $ne: true } })
        .sort({ trialNo: -1 }).lean() as unknown as TenderLean | null;

    if (!tenderRaw) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 space-y-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center space-y-3 max-w-md">
                    <h1 className="text-lg font-bold text-slate-800">Tender Details Pending</h1>
                    <p className="text-sm text-slate-500">
                        There is no active tender associated with this package. Please complete the Tender details before printing the Notice.
                    </p>
                    <Link href={`/packages/${id}`} className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors">
                        ← Back to Package
                    </Link>
                </div>
            </div>
        );
    }

    const loaRaw = await LOA.findOne({ tenderId: tenderRaw._id }).lean() as unknown as LOALean | null;
    const notices = Array.isArray(loaRaw?.notices) ? loaRaw.notices : [];
    const noticeRaw = notices[noticeIndex];

    if (!loaRaw || !noticeRaw) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 space-y-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center space-y-3 max-w-md">
                    <h1 className="text-lg font-bold text-slate-800">Notice Details Pending</h1>
                    <p className="text-sm text-slate-500">
                        Notice details have not been added for this package yet. Please add a Notice under the Letter of Acceptance (LOA) section before printing.
                    </p>
                    <Link href={`/packages/${id}`} className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors">
                        Back to Package details
                    </Link>
                </div>
            </div>
        );
    }

    const agencyRaw = tenderRaw.contractorId
        ? await Agency.findById(tenderRaw.contractorId).lean() as unknown as IdLean | null
        : await Agency.findOne({ name: tenderRaw.contractorName }).lean() as unknown as IdLean | null;

    const packageData = JSON.parse(JSON.stringify(pkgRaw));
    const tender = JSON.parse(JSON.stringify(tenderRaw));
    const loa = JSON.parse(JSON.stringify(loaRaw));
    const notice = JSON.parse(JSON.stringify(noticeRaw));
    const noticesSerialized = JSON.parse(JSON.stringify(notices));
    const agency = agencyRaw ? JSON.parse(JSON.stringify(agencyRaw)) : null;

    return (
        <NoticeLetterClient
            packageData={packageData}
            tender={tender}
            loa={loa}
            notice={notice}
            noticeIndex={noticeIndex}
            notices={noticesSerialized}
            agency={agency}
        />
    );
}
