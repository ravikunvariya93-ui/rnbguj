import { NextResponse } from 'next/server';
import PDFParser from 'pdf2json';

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

        const p = new Promise((resolve, reject) => {
            pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
            pdfParser.on("pdfParser_dataReady", pdfData => {
                const text = pdfData.Pages.map((page: any) =>
                    page.Texts.map((t: any) => {
                        try {
                            return decodeURIComponent(t.R[0].T);
                        } catch (e) {
                            return t.R[0].T;
                        }
                    }).join(' ')
                ).join('\n');

                // ── Find the EARLIEST BOQ content marker ──
                // In many PDFs, "Description of Item" header appears before
                // "BILL OF QUANTITIES" title. We need the earliest marker
                // that indicates actual BOQ content has started.
                const boqMarkers = [
                    'Description of Item',
                    'Description of item',
                    'DESCRIPTION OF ITEM',
                    'BILL OF QUANTITIES',
                    'Bill of Quantities',
                    'BILL OF QUANTITY',
                    'Bill of Quantity',
                    'B.O.Q',
                    'Schedule of Quantities',
                    'SCHEDULE OF QUANTITIES',
                ];

                let earliestIdx = -1;
                for (const marker of boqMarkers) {
                    const idx = text.indexOf(marker);
                    if (idx !== -1 && (earliestIdx === -1 || idx < earliestIdx)) {
                        earliestIdx = idx;
                    }
                }

                // Case-insensitive fallback
                if (earliestIdx === -1) {
                    const lowerText = text.toLowerCase();
                    const ciMarkers = ['description of item', 'bill of quantities', 'bill of quantity', 'schedule of quantities'];
                    for (const marker of ciMarkers) {
                        const idx = lowerText.indexOf(marker);
                        if (idx !== -1 && (earliestIdx === -1 || idx < earliestIdx)) {
                            earliestIdx = idx;
                        }
                    }
                }

                const boqText = earliestIdx !== -1 ? text.substring(earliestIdx) : text;

                // ── Strip page headers/footers (nprocure metadata) ──
                // Each page starts with "Page N /M || https://tender.nprocure.com || ..."
                // These contain numbers that confuse the parser. Remove them.
                const cleanedText = boqText
                    .replace(/Page\s+\d+\s+\/\d+\s*\|\|[^|]*\|\|[^|]*\|\|\s*ServerTime:\s*[\d\-:\s]+/g, '')
                    .replace(/https?:\/\/\S+/g, '')
                    .replace(/TenderId\s+\d+/g, '')
                    .replace(/ServerTime:\s*[\d\-:\s]+/g, '')
                    // Remove repeated column headers on each page
                    .replace(/Item\s+No\.\s*Description of Item\s*\(With brief specification\s*and reference to book of Specification\)\s*Quantity\s*Unit\s*Rate\s*Amount/gi, '')
                    // Remove "Page N" standalone references
                    .replace(/\bPage\s+\d+\b/g, '');

                const items: any[] = [];
                const words = cleanedText.split(/\s+/).filter(w => w.length > 0);

                for (let i = 0; i < words.length; i++) {
                    const word = words[i];

                    // Item number candidate: 1-4 digit integer
                    if (!/^\d{1,4}$/.test(word)) continue;
                    const itemNum = parseInt(word);
                    // Reasonable item number range (skip years like 2025, large numbers)
                    if (itemNum < 1 || itemNum > 999) continue;

                    // ── Look ahead to find the pattern: [description words...] [qty] [unit words...] [rate] [amount] ──
                    // Key insight: qty, rate, and amount are decimal numbers (contain '.')
                    // But descriptions can contain dimensions like "2mm", "3.1m", "35x35x3mm",
                    // "1:2:4", "90x90x90" etc. We need to distinguish real qty/rate/amount
                    // from dimension-like numbers embedded in descriptions.

                    let j = i + 1;
                    let descWords: string[] = [];
                    let numbersFound: { value: number; index: number }[] = [];
                    let unitWords: string[] = [];
                    let scanLimit = Math.min(j + 500, words.length); // limit scan range

                    while (j < scanLimit) {
                        const w = words[j];

                        // Check if this is a "real" decimal number for qty/rate/amount
                        // Must be a standalone decimal number (digits with one dot)
                        // NOT dimensions like "2mm", "35x35x3mm", "3.1m", "1:2:4"
                        const isStandaloneDecimal = /^\d+\.\d+$/.test(w);
                        const isStandaloneInteger = /^\d+$/.test(w) && !isNaN(parseInt(w));

                        // Check surrounding context to decide if it's qty/rate/amount
                        // A real quantity number is typically followed by "One" or a unit word
                        const nextWord = j + 1 < words.length ? words[j + 1] : '';
                        const isFollowedByUnit = /^(One|Per|Nos?\.?|Cum|Rmt\.?|MT|Kg|Sqm|Metre|Meter|Each|Set|Pair|Ltr|KL|Litre|Running)$/i.test(nextWord);

                        if (numbersFound.length === 0) {
                            // Looking for QUANTITY
                            if ((isStandaloneDecimal || isStandaloneInteger) && isFollowedByUnit) {
                                numbersFound.push({ value: parseFloat(w), index: j });
                            } else {
                                descWords.push(w);
                            }
                        } else if (numbersFound.length === 1) {
                            // After quantity, collect unit words until we find rate (decimal number)
                            if (isStandaloneDecimal) {
                                numbersFound.push({ value: parseFloat(w), index: j });
                            } else {
                                unitWords.push(w);
                                // If the collected unit words length is too large, the candidate quantity is actually part of description
                                if (unitWords.length > 5) {
                                    const candidateQtyObj = numbersFound[0];
                                    descWords.push(candidateQtyObj.value.toString());
                                    descWords.push(...unitWords);
                                    numbersFound = [];
                                    unitWords = [];
                                }
                            }
                        } else if (numbersFound.length === 2) {
                            // After rate, the next decimal/integer is the amount
                            if (isStandaloneDecimal || (isStandaloneInteger && parseFloat(w) > 10)) {
                                numbersFound.push({ value: parseFloat(w), index: j });
                                break; // We have all three: qty, rate, amount
                            }
                        }
                        j++;
                    }

                    if (numbersFound.length === 3) {
                        const desc = descWords.join(' ').trim();

                        // Validate description
                        if (desc.length < 5) continue;
                        // Skip if description is metadata
                        if (/https?:\/\//i.test(desc) || /tender\.nprocure/i.test(desc) || /TenderId/i.test(desc)) continue;
                        // Skip if description is just numbers/dates
                        if (/^[\d\s\-\/\.:]+$/.test(desc)) continue;

                        items.push({
                            itemNo: word,
                            description: desc,
                            quantity: numbersFound[0].value,
                            unit: unitWords.join(' ').trim(),
                            rate: numbersFound[1].value,
                            amount: numbersFound[2].value
                        });
                        i = numbersFound[2].index; // skip past this item
                    }
                }

                resolve(items);
            });
        });

        pdfParser.parseBuffer(buffer);
        const parsedItems = await p;

        return NextResponse.json({ success: true, data: parsedItems });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ success: false, error: 'Failed to parse PDF: ' + error.message }, { status: 500 });
    }
}
