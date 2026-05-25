import dbConnect from '@/lib/db';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import Agency from '@/models/Agency';
import { notFound } from 'next/navigation';
import LOALetterClient from './LOALetterClient';

// Ensure models are registered for populate
void Tender;
void Agency;

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function LOALetterPage({ params }: PageProps) {
    await dbConnect();
    const { id } = await params;

    const loaRaw = await LOA.findById(id).populate('tenderId').lean();
    if (!loaRaw) {
        notFound();
    }

    const agenciesRaw = await Agency.find({}).sort({ name: 1 }).lean();

    // Serialize: convert ObjectIds → string, Dates → ISO string
    const loa = JSON.parse(JSON.stringify(loaRaw));
    const agencies = JSON.parse(JSON.stringify(agenciesRaw));

    return <LOALetterClient loa={loa} agencies={agencies} />;
}
