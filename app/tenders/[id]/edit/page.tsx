import dbConnect from '@/lib/db';
import Tender from '@/models/Tender';
import TenderForm from '@/components/TenderForm';
import { formatDateForInput } from '@/lib/dateUtils';
import { notFound } from 'next/navigation';

export default async function EditTenderPage({ params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;

    let tender;
    try {
        tender = await Tender.findById(id).lean();
    } catch (e) {
        console.error(e);
    }

    if (!tender) {
        notFound();
    }

    // Convert _id and packageId to string for serialization; pre-format dates
    // to DD/MM/YYYY (the same format TenderForm normalizes to on mount).
    const serializedTender = {
        ...tender,
        _id: String(tender._id),
        packageId: tender.packageId?.toString() ?? '',
        contractorId: tender.contractorId?.toString() ?? '',
        tenderCreationDate: formatDateForInput(tender.tenderCreationDate),
        lastDateOfSubmission: formatDateForInput(tender.lastDateOfSubmission),
        tenderOpeningDate: formatDateForInput(tender.tenderOpeningDate),
        tenderValidityDate: formatDateForInput(tender.tenderValidityDate),
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Tender</h1>
            <TenderForm initialData={serializedTender} isEditing={true} />
        </div>
    );
}
