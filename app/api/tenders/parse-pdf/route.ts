import { NextResponse } from 'next/server';
import PDFParser from 'pdf2json';

interface Pdf2JsonText {
    R: { T: string }[];
}

interface Pdf2JsonPage {
    Texts: Pdf2JsonText[];
}

interface ParsedBidder {
    rank: string;
    contractorName: string;
    estimatedAmount: number;
    aboveBelow: string;
    percentage: number;
    totalAmount: number;
    amountInWords: string;
}

interface ParsedTenderInfo {
    tenderId: string;
    noticeNo: string;
    noticeYear: string;
    srNo: string;
    estimatedAmount: number;
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const pdfParser = new PDFParser();

        const p = new Promise<{ tenderInfo: ParsedTenderInfo; bidders: ParsedBidder[] }>((resolve, reject) => {
            pdfParser.on("pdfParser_dataError", (errData: Error | { parserError: Error }) => reject('parserError' in errData ? errData.parserError : errData));
            pdfParser.on("pdfParser_dataReady", pdfData => {
                const text = pdfData.Pages.map((page: Pdf2JsonPage) =>
                    page.Texts.map((t: Pdf2JsonText) => {
                        try {
                            return decodeURIComponent(t.R[0].T);
                        } catch (e) {
                            return t.R[0].T;
                        }
                    }).join(' ')
                ).join('\n');

                // 1. Extract metadata from the text
                const tenderIdMatch = text.match(/TenderId\s+(\d+)/i);
                const tenderId = tenderIdMatch ? tenderIdMatch[1] : '';

                const noticeMatch = text.match(/Tender\s+ID:\s*(\d+)\/(\d{4}-\d{2})/i);
                const noticeNo = noticeMatch ? noticeMatch[1] : '';
                const noticeYear = noticeMatch ? noticeMatch[2] : '';

                const srMatch = text.match(/Sr\.\s*No\.?\s*(\d+)/i);
                const srNo = srMatch ? srMatch[1] : '';

                // Estimated Cost Value (ECV) / Estimated Amount
                const ecvMatch = text.match(/ECV:\s*(\d+(?:\.\d+)?)/i) || text.match(/Estimated\s+Amount:\s*(\d+(?:\.\d+)?)/i);
                const estimatedAmount = ecvMatch ? parseFloat(ecvMatch[1]) : 0;

                const tenderInfo = {
                    tenderId,
                    noticeNo,
                    noticeYear,
                    srNo,
                    estimatedAmount
                };

                // 2. Extract comparative bidder statement
                const regex = /\b(L\d+)\b/g;
                let match;
                const indices: { rank: string; index: number }[] = [];
                while ((match = regex.exec(text)) !== null) {
                    indices.push({ rank: match[1], index: match.index });
                }

                const bidders: ParsedBidder[] = [];
                for (let i = 0; i < indices.length; i++) {
                    const start = indices[i].index;
                    const end = (i + 1 < indices.length) ? indices[i + 1].index : text.length;
                    const chunk = text.substring(start, end).trim();

                    // Regex to parse the line of a bidder
                    const rowRegex = /^(L\d+)\s+(.+?)\s+(\d+(?:\.\d+)?)\s+(BELOW|ABOVE|AT\s+PAR|EQUALS)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(.+)$/i;
                    const normalizedChunk = chunk.replace(/\s+/g, ' ');
                    const rowMatch = normalizedChunk.match(rowRegex);
                    
                    if (rowMatch) {
                        let amountInWords = rowMatch[7].trim();
                        // Clean up amountInWords up to "Only" since it could contain trailing page text/signatures
                        const onlyMatch = amountInWords.match(/(.*?Only)/i);
                        if (onlyMatch) {
                            amountInWords = onlyMatch[1].trim();
                        }

                        bidders.push({
                            rank: rowMatch[1],
                            contractorName: rowMatch[2].trim().replace(/\s*\(.*?\)\s*$/, '').trim(),
                            estimatedAmount: parseFloat(rowMatch[3]),
                            aboveBelow: rowMatch[4].trim(),
                            percentage: parseFloat(rowMatch[5]),
                            totalAmount: parseFloat(rowMatch[6]),
                            amountInWords: amountInWords
                        });
                    }
                }

                resolve({ tenderInfo, bidders });
            });
        });

        pdfParser.parseBuffer(buffer);
        const result = await p;

        return NextResponse.json({ success: true, ...result });
    } catch (error: unknown) {
        console.error(error);
        return NextResponse.json({ success: false, error: 'Failed to parse PDF: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 });
    }
}
