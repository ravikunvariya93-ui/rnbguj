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

                // Regex to find BOQ rows
                // Pattern: [ItemNo] [Description...] [Quantity (number)] [Unit (words)] [Rate (number)] [Amount (number)]
                // Note: This regex is tailored to the observed structure in 30.pdf
                // 56 Citizen's information Board. ... 2.00 One No 7408.35 14816.70
                
                const items: any[] = [];
                
                // Splitting by likely item starts (digit followed by space and uppercase letter or common words)
                // This is a complex parsing task, we'll try to find sequences of fields
                
                // Alternative: Split text by "Item No." or major whitespace blocks
                // For 30.pdf, items seem to start with a number and end with the total amount.
                
                const lines = text.split('\n');
                let currentItem: any = null;

                // Simple heuristic: find rows that contain numbers at the end
                // We'll look for: [Number] [Text...] [Number] [Text...] [Number] [Number]
                const rowRegex = /^(\d+)\s+(.+?)\s+(\d+\.?\d*)\s+([\s\S]+?)\s+(\d+\.?\d*)\s+(\d+\.?\d*)$/;

                // Attempting to reconstruct rows from the stream
                // Often in PDF text extraction, symbols and numbers are separated.
                
                // Let's use a more robust split-and-check approach for the specific format
                const words = text.split(/\s+/);
                
                for (let i = 0; i < words.length; i++) {
                    const word = words[i];
                    // If word is a number (Item No candidate)
                    if (/^\d+$/.test(word) && word.length <= 4) {
                        // Check if we can find Quantity, Rate, Amount ahead
                        // Usually Amount is a large number
                        
                        // We'll peek ahead for numbers
                        let j = i + 1;
                        let desc = '';
                        let numbersFound: number[] = [];
                        let units = '';
                        
                        while (j < words.length && numbersFound.length < 3) {
                            if (/^\d+\.?\d*$/.test(words[j]) && !isNaN(parseFloat(words[j])) && words[j].includes('.')) {
                                numbersFound.push(parseFloat(words[j]));
                            } else if (numbersFound.length === 0) {
                                desc += words[j] + ' ';
                            } else if (numbersFound.length > 0 && numbersFound.length < 3) {
                                units += words[j] + ' ';
                            }
                            j++;
                        }
                        
                        if (numbersFound.length === 3) {
                            items.push({
                                itemNo: word,
                                description: desc.trim(),
                                quantity: numbersFound[0],
                                unit: units.trim(),
                                rate: numbersFound[1],
                                amount: numbersFound[2]
                            });
                            i = j - 1; // skip forward
                        }
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
