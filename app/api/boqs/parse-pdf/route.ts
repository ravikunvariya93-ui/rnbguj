import { NextResponse } from 'next/server';
import PDFParser from 'pdf2json';

export const dynamic = 'force-dynamic';

function parseBoqUniversal(pdfData: any): any[] {
    const items: any[] = [];

    // Extract pages and visual lines
    const pagesData = (pdfData.Pages || []).map((page: any, pageIdx: number) => {
        const texts = (page.Texts || []).map((t: any) => {
            let str = '';
            try {
                str = decodeURIComponent(t.R[0].T);
            } catch {
                str = t.R[0].T;
            }
            return {
                x: Math.round(t.x * 100) / 100,
                y: Math.round(t.y * 100) / 100,
                w: t.w || 0,
                text: (str || '').trim()
            };
        }).filter((t: any) => t.text.length > 0);

        texts.sort((a: any, b: any) => (Math.abs(a.y - b.y) < 0.25 ? a.x - b.x : a.y - b.y));
        const lines: any[] = [];
        let curLine: any[] = [];
        let curY: number | null = null;

        texts.forEach((t: any) => {
            if (curY === null || Math.abs(t.y - curY) > 0.25) {
                if (curLine.length > 0) lines.push({ y: curY, texts: curLine });
                curLine = [t];
                curY = t.y;
            } else {
                curLine.push(t);
            }
        });
        if (curLine.length > 0) lines.push({ y: curY, texts: curLine });

        const pageStr = texts.map((t: any) => t.text).join(' ');
        return { pageIdx, texts, lines, pageStr };
    });

    const isNum = (tok: string) => /^\d[\d,]*(\.\d+)?$/.test((tok || '').replace(/[₹,Rs\s]/gi, ''));
    const parseVal = (tok: string) => parseFloat((tok || '').replace(/[₹,Rs\s]/gi, '').replace(/,/g, ''));
    const unitRegex = /^(One|Per|Nos?\.?|Numbers?|Cum|Cu\.?m\.?|Rmt?\.?|R\.?mt\.?|Rmtr|RM|Mtr|Metre|Meter|M\.|MT|M\.?T\.?|Ton|Tonne|Quintal|Qtl|Kg|Kgs|Kilogram|Sqm?\.?|Sq\.?m\.?|Sq\.?mt|Each|Set|Pair|Ltr?\.?|Litre|Lit|Liter|KL|Running|Points?|Job|LS|L\.?S\.?|Lump\s*sum|Brass|Hect?\.?|Hectare|Ha|Acre|Day|Month|Km|KM|Hours?)$/i;

    // Layout detection
    let styleAVotes = 0;
    let styleBVotes = 0;

    for (const p of pagesData) {
        for (const line of p.lines) {
            const first = line.texts[0];
            if (first && first.x <= 7.0 && /^\d{1,4}$/.test(first.text)) {
                const second = line.texts[1];
                const third = line.texts[2];
                if (second && isNum(second.text) && third && unitRegex.test(third.text)) {
                    styleAVotes++;
                } else {
                    const hasQtyAt20 = line.texts.some((t: any) => t.x >= 19.0 && t.x <= 25.0 && isNum(t.text));
                    const hasAmtAt31 = line.texts.some((t: any) => t.x >= 30.0 && isNum(t.text));
                    if (hasQtyAt20 && hasAmtAt31) {
                        styleBVotes++;
                    }
                }
            }
        }
    }

    if (styleBVotes >= 3 && styleBVotes >= styleAVotes) {
        // STYLE B (e.g. 39-page bridge/culvert tender BOQ with layout: ItemNo | Description | Qty | Unit | Rate | Amount)
        const headerRe = /^1\s+2\s+3\s+4\s+5\s+6\s*7?$/;
        const descHeaderRe = /Description\s+of\s+Item|BILL OF QUANTITIES|Item\s+No|Item\s+Rates/i;
        const pageRe = /Page\s+\d+\s*\//;
        for (const p of pagesData) {
            if (/Name of Party/i.test(p.pageStr) || /Opening Committee/i.test(p.pageStr)) continue;

            // Pass 1: identify all data lines on this page
            const dataLineInfos: { lIdx: number; first: any; qtyText: any; rateText: any; amtText: any; unitText: any }[] = [];
            for (let lIdx = 0; lIdx < p.lines.length; lIdx++) {
                const line = p.lines[lIdx];
                const lineStr = line.texts.map((t: any) => t.text).join(' ');
                if (headerRe.test(lineStr.trim())) continue;
                if (descHeaderRe.test(lineStr)) continue;

                const qtyText = line.texts.find((t: any) => t.x >= 19.0 && t.x <= 25.0 && isNum(t.text));
                const amtText = line.texts.find((t: any) => t.x >= 30.5 && isNum(t.text));
                if (!qtyText || !amtText) continue;

                // Find item number: first digit text at x <= 7.0 on this line
                let first = line.texts.find((t: any) => t.x <= 7.0 && /^\d{1,3}$/.test(t.text));

                // If not found on this line, check nearby lines above (digit may be on separate y-line)
                if (!first) {
                    for (let lookBack = 1; lookBack <= 5 && lIdx - lookBack >= 0; lookBack++) {
                        const prevLine = p.lines[lIdx - lookBack];
                        const prevDigit = prevLine.texts.find((t: any) => t.x <= 7.0 && /^\d{1,3}$/.test(t.text));
                        if (prevDigit) {
                            const yDiff = Math.abs(line.y - prevLine.y);
                            if (yDiff < 2.0) {
                                first = prevDigit;
                                break;
                            }
                        }
                    }
                }

                if (!first) continue;
                const itemNum = parseInt(first.text, 10);
                if (itemNum < 1 || itemNum > 999) continue;

                // Avoid duplicates: check if this item number was already added for a nearby line
                const isDuplicate = dataLineInfos.some(d => d.first.text === first.text && Math.abs(d.lIdx - lIdx) < 10);
                if (isDuplicate) continue;

                const unitText = line.texts.find((t: any) => t.x >= 21.5 && t.x <= 24.5 && /^[A-Za-z.()]+$/i.test(t.text) && !/^(Total|Page|Rupees|Rates)/i.test(t.text));
                const rateText = line.texts.find((t: any) => t.x >= 26.5 && t.x <= 31.5 && isNum(t.text));

                dataLineInfos.push({ lIdx, first, qtyText, rateText, amtText, unitText });
            }

            // Pass 2: for each data line, collect description from lines before and after
            for (let d = 0; d < dataLineInfos.length; d++) {
                const { lIdx, first, qtyText, rateText, amtText, unitText } = dataLineInfos[d];
                const prevDataLIdx = d > 0 ? dataLineInfos[d - 1].lIdx : -1;
                const nextDataLIdx = d < dataLineInfos.length - 1 ? dataLineInfos[d + 1].lIdx : p.lines.length;

                const descParts: string[] = [];

                // Collect description from lines BETWEEN previous data line and current
                for (let k = prevDataLIdx + 1; k < lIdx; k++) {
                    const descLine = p.lines[k];
                    const descLineStr = descLine.texts.map((t: any) => t.text).join(' ');
                    if (headerRe.test(descLineStr.trim())) continue;
                    if (descHeaderRe.test(descLineStr)) continue;
                    if (/Name of Party|Opening Committee/i.test(descLineStr)) continue;
                    if (/Name of work|Item Description Quantities|Item\s+No\s|In Figure|In Words|Page\s+\d+\s*\//i.test(descLineStr)) continue;

                    descLine.texts
                        .filter((t: any) => t.x >= 3.0 && t.x < qtyText.x && !/Name of work|Item Description|In Figure|In Words|Page\s+\d/i.test(t.text))
                        .forEach((t: any) => descParts.push(t.text));
                }

                // Collect description text on the current data line itself
                p.lines[lIdx].texts
                    .filter((t: any) => t.x > first.x && t.x < qtyText.x && t !== first)
                    .forEach((t: any) => descParts.push(t.text));

                // Collect continuation description from lines after data line until next data line
                for (let k = lIdx + 1; k < nextDataLIdx; k++) {
                    const nextLine = p.lines[k];
                    const nextLineStr = nextLine.texts.map((t: any) => t.text).join(' ');
                    if (pageRe.test(nextLineStr)) break;
                    if (/Page\s+\d+\s*\//.test(nextLineStr)) break;

                    nextLine.texts
                        .filter((t: any) => t.x >= 3.0 && t.x < qtyText.x)
                        .forEach((t: any) => descParts.push(t.text));
                }

                const q = parseVal(qtyText.text);
                const a = parseVal(amtText.text);
                const r = rateText ? parseVal(rateText.text) : (q > 0 ? parseFloat((a / q).toFixed(2)) : 0);

                items.push({
                    itemNo: first.text,
                    description: descParts.join(' ').replace(/\s+/g, ' ').trim(),
                    quantity: q,
                    unit: unitText ? unitText.text : 'Nos',
                    rate: r,
                    amount: a,
                    itemType: 'Standard'
                });
            }
        }
    } else if (styleAVotes >= 3) {
        // STYLE A: ItemNo [Qty] [Unit] [Description...] [Rate] [Words...] [Amount]
        for (const p of pagesData) {
            if (/Name of Party/i.test(p.pageStr) || /Opening Committee/i.test(p.pageStr)) continue;

            for (let lIdx = 0; lIdx < p.lines.length; lIdx++) {
                const line = p.lines[lIdx];
                const first = line.texts[0];

                if (!first || first.x > 7.0 || !/^\d{1,4}$/.test(first.text)) continue;
                const itemNum = parseInt(first.text, 10);
                if (itemNum < 1 || itemNum > 999) continue;

                const qtyText = line.texts.find((t: any) => t.x > first.x && t.x < 11.0 && isNum(t.text));
                const rateText = line.texts.find((t: any) => t.x >= 20.0 && t.x <= 28.0 && isNum(t.text));
                const amtText = line.texts.find((t: any) => t.x >= 30.0 && isNum(t.text));

                if (qtyText && rateText && amtText) {
                    const unitText = line.texts.find((t: any) => t.x > qtyText.x && t.x < 12.0 && /^[A-Za-z.]+$/.test(t.text));
                    const unit = unitText ? unitText.text : 'Nos';

                    const descParts: string[] = [];
                    line.texts.filter((t: any) => t.x >= 11.0 && t.x < (rateText ? rateText.x : 22.0)).forEach((t: any) => descParts.push(t.text));

                    let nextL = lIdx + 1;
                    while (nextL < p.lines.length) {
                        const nextLine = p.lines[nextL];
                        const nextFirst = nextLine.texts[0];
                        if (nextFirst && nextFirst.x <= 7.0 && /^\d{1,4}$/.test(nextFirst.text)) break;
                        if (nextFirst && /^(Total|Rupees|Page\s*\d|Signature)/i.test(nextFirst.text)) break;
                        if (nextLine.texts.some((t: any) => /^\d{1,4}$/.test(t.text) && t.x <= 7.0)) break;

                        nextLine.texts.filter((t: any) => t.x >= 11.0 && t.x < 22.5).forEach((t: any) => descParts.push(t.text));
                        nextL++;
                    }

                    items.push({
                        itemNo: first.text,
                        description: descParts.join(' ').replace(/\s+/g, ' ').trim(),
                        quantity: parseVal(qtyText.text),
                        unit: unit,
                        rate: parseVal(rateText.text),
                        amount: parseVal(amtText.text),
                        itemType: 'Standard'
                    });

                    lIdx = nextL - 1;
                }
            }
        }
    } else {
        // STYLE C: Linear Token Stream Parser (e.g. 2.pdf, 30.pdf, 70.pdf)
        const fullText = pagesData.map((p: any) => p.texts.map((t: any) => t.text).join(' ')).join('\n');
        const boqMarker = /(Description of Item|Bill of Quantities|SCHEDULE\s*[-–—]?\s*B|Schedule of Quantities)/i;
        const match = boqMarker.exec(fullText);
        const startIdx = match ? match.index : 0;
        const text = fullText.substring(startIdx)
            .replace(/Page\s+\d+\s+(of|\/)\s*\d+\s*\|\|[^\n\r]*\|\|\s*ServerTime:[^\n\r]*/gi, ' ')
            .replace(/https?:\/\/\S+/gi, ' ')
            .replace(/TenderId\s*[:\-]?\s*\d+/gi, ' ')
            .replace(/ServerTime\s*[:\-]?\s*[\d\-:\s]+/gi, ' ')
            .replace(/Item\s+No\.?\s+Description\s+of\s+Item[^\n\r]*?(Quantity|Qty)[^\n\r]*?Unit[^\n\r]*?Rate[^\n\r]*?Amount/gi, ' ')
            .replace(/\bPage\s+\d+\b/gi, ' ');

        const tokens = text.split(/\s+/).filter((t: string) => t.trim().length > 0);

        for (let i = 0; i < tokens.length; i++) {
            const tok = tokens[i];
            if (!/^\d{1,4}$/.test(tok)) continue;
            const itemNum = parseInt(tok, 10);
            if (itemNum < 1 || itemNum > 999) continue;

            let j = i + 1;
            let descWords: string[] = [];
            let numbersFound: { value: number; index: number }[] = [];
            let unitWords: string[] = [];
            const maxScan = Math.min(j + 500, tokens.length);

            while (j < maxScan) {
                const w = tokens[j];
                const nextW = j + 1 < tokens.length ? tokens[j + 1] : '';
                const afterNextW = j + 2 < tokens.length ? tokens[j + 2] : '';
                const isFollowedByUnit = unitRegex.test(nextW);
                const isDim = /^[xX\*]$/i.test(afterNextW) || /^x\d/i.test(afterNextW);

                if (numbersFound.length === 0) {
                    if (isNum(w) && isFollowedByUnit && !isDim) {
                        numbersFound.push({ value: parseVal(w), index: j });
                    } else {
                        descWords.push(w);
                    }
                } else if (numbersFound.length === 1) {
                    if (isNum(w) && (unitWords.length > 0 || isFollowedByUnit)) {
                        numbersFound.push({ value: parseVal(w), index: j });
                    } else {
                        unitWords.push(w);
                        if (unitWords.length > 7) {
                            const cand = numbersFound[0];
                            descWords.push(cand.value.toString());
                            descWords.push(...unitWords);
                            numbersFound = [];
                            unitWords = [];
                        }
                    }
                } else if (numbersFound.length === 2) {
                    if (isNum(w) && parseVal(w) > 5) {
                        const q = numbersFound[0].value;
                        const r = numbersFound[1].value;
                        const a = parseVal(w);

                        const valid = [q * r, (q * r) / 10, (q * r) / 100, (q * r) / 1000].some(exp =>
                            Math.abs(exp - a) < 5.0 || Math.abs(exp - a) / (a || 1) < 0.05
                        );

                        if (valid || a > 10) {
                            numbersFound.push({ value: a, index: j });
                            break;
                        }
                    }
                }
                j++;
            }

            if (numbersFound.length === 3) {
                const desc = descWords.join(' ').trim();
                if (desc.length >= 3 && !/^[\d\s\-\/\.:]+$/.test(desc) && !/tender\.nprocure/i.test(desc)) {
                    items.push({
                        itemNo: tok,
                        description: desc,
                        quantity: numbersFound[0].value,
                        unit: unitWords.join(' ').trim() || 'Nos',
                        rate: numbersFound[1].value,
                        amount: numbersFound[2].value,
                        itemType: 'Standard'
                    });
                    i = numbersFound[2].index;
                }
            }
        }
    }

    return items;
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

        const p = new Promise<any[]>((resolve, reject) => {
            pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
            pdfParser.on("pdfParser_dataReady", pdfData => {
                try {
                    const parsed = parseBoqUniversal(pdfData);
                    resolve(parsed);
                } catch (err) {
                    reject(err);
                }
            });
        });

        pdfParser.parseBuffer(buffer);
        const parsedItems = await p;

        return NextResponse.json({ success: true, data: parsedItems });
    } catch (error: any) {
        console.error("PDF Parsing error:", error);
        return NextResponse.json({ success: false, error: 'Failed to parse PDF: ' + error.message }, { status: 500 });
    }
}
