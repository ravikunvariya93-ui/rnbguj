const PDFParser = require('pdf2json');
const fs = require('fs');

const buffer = fs.readFileSync('./1.pdf');
const pdfParser = new PDFParser();

pdfParser.on("pdfParser_dataError", err => console.error(err));
pdfParser.on("pdfParser_dataReady", pdfData => {
    // Keep newlines to prevent regex from eating entire pages
    const text = pdfData.Pages.map((page) =>
        page.Texts.map((t) => {
            try { return decodeURIComponent(t.R[0].T); }
            catch (e) { return t.R[0].T; }
        }).join(' ')
    ).join('\n');

    const boqMarkers = [
        'Description of Item', 'Description of item', 'DESCRIPTION OF ITEM',
        'BILL OF QUANTITIES', 'Bill of Quantities', 'BILL OF QUANTITY',
        'Bill of Quantity', 'B.O.Q', 'Schedule of Quantities', 'SCHEDULE OF QUANTITIES',
    ];

    let earliestIdx = -1;
    for (const marker of boqMarkers) {
        const idx = text.indexOf(marker);
        if (idx !== -1 && (earliestIdx === -1 || idx < earliestIdx)) { earliestIdx = idx; }
    }

    if (earliestIdx === -1) {
        const lowerText = text.toLowerCase();
        for (const marker of ['description of item', 'bill of quantities', 'bill of quantity', 'schedule of quantities']) {
            const idx = lowerText.indexOf(marker);
            if (idx !== -1 && (earliestIdx === -1 || idx < earliestIdx)) { earliestIdx = idx; }
        }
    }

    const boqText = earliestIdx !== -1 ? text.substring(earliestIdx) : text;

    // Use non-greedy `.*?` to remove just the header up to ServerTime date, not the whole page!
    // Or split the page text by lines. The issue is `pdfData.Pages...join(' ')` joins the page text into a single line!
    // In the earlier script I used `join(' ')` per page, so a page has NO newlines!
    
    // Better header removal:
    const cleanedText = boqText
        .replace(/Page\s+\d+\s+\/\d+\s*\|\|[^|]*\|\|[^|]*\|\|\s*ServerTime:\s*[\d\-:\s]+/g, '')
        .replace(/Item\s+No\.\s*Description of Item\s*\(With brief specification\s*and reference to book of Specification\)\s*Quantity\s*Unit\s*Rate\s*Amount/gi, '')
        .replace(/\bPage\s+\d+\b/g, '');

    const items = [];
    const skipped = [];
    const words = cleanedText.split(/\s+/).filter(w => w.length > 0);

    for (let i = 0; i < words.length; i++) {
        const word = words[i];

        if (!/^\d{1,4}$/.test(word)) continue;
        const itemNum = parseInt(word);
        if (itemNum < 1 || itemNum > 999) continue;

        let j = i + 1;
        let descWords = [];
        let numbersFound = [];
        let unitWords = [];
        let scanLimit = Math.min(j + 500, words.length);

        while (j < scanLimit) {
            const w = words[j];

            const isStandaloneDecimal = /^\d+\.\d+$/.test(w);
            const isStandaloneInteger = /^\d+$/.test(w) && !isNaN(parseInt(w));

            const nextWord = j + 1 < words.length ? words[j + 1] : '';
            const isFollowedByUnit = /^(One|Per|Nos?\.?|Cum|Rmt\.?|MT|Kg|Sqm|M\.|Metre|Meter|Each|Set|Pair|Ltr|KL|RM|Litre|Running)$/i.test(nextWord);

            if (numbersFound.length === 0) {
                if ((isStandaloneDecimal || isStandaloneInteger) && isFollowedByUnit) {
                    numbersFound.push({ value: parseFloat(w), index: j });
                } else {
                    descWords.push(w);
                }
            } else if (numbersFound.length === 1) {
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
                if (isStandaloneDecimal || (isStandaloneInteger && parseFloat(w) > 10)) {
                    numbersFound.push({ value: parseFloat(w), index: j });
                    break;
                }
            }
            j++;
        }

        if (numbersFound.length === 3) {
            const desc = descWords.join(' ').trim();
            let reason = null;

            if (desc.length < 5) reason = 'TOO_SHORT';
            else if (/https?:\/\//i.test(desc) || /tender\.nprocure/i.test(desc) || /TenderId/i.test(desc)) reason = 'METADATA';
            else if (/^[\d\s\-\/\.:]+$/.test(desc)) reason = 'JUST_NUMBERS';

            if (!reason) {
                items.push({
                    itemNo: word,
                    description: desc,
                    quantity: numbersFound[0].value,
                    unit: unitWords.join(' ').trim(),
                    rate: numbersFound[1].value,
                    amount: numbersFound[2].value
                });
                i = numbersFound[2].index;
            } else {
                skipped.push({ itemNo: word, desc: desc.substring(0, 50), numbers: numbersFound, reason });
            }
        }
    }

    console.log(`\n=== PARSED ITEMS (${items.length}) ===`);
    items.forEach(it => console.log(`  Item ${it.itemNo}: ${it.description.substring(0, 50)}... | Qty: ${it.quantity} | Unit: ${it.unit} | Rate: ${it.rate} | Amt: ${it.amount}`));
    
    const parsedNums = items.map(i => parseInt(i.itemNo));
    const maxNum = Math.max(...parsedNums);
    const missing = [];
    for (let n = 1; n <= maxNum; n++) {
        if (!parsedNums.includes(n)) missing.push(n);
    }
    console.log(`\n=== MISSING ITEM NUMBERS: ${missing.length > 0 ? missing.join(', ') : 'NONE'} ===`);
});

pdfParser.parseBuffer(buffer);
