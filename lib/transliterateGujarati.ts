/**
 * Utility to transliterate English text to Gujarati script without translation.
 * Tailored for R&B (Roads and Buildings) civil works, packages, places, and terminology.
 */

// Digits mapping
const GUJARATI_DIGITS: Record<string, string> = {
    '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪',
    '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯'
};

export function convertDigitsToGujarati(str: string): string {
    return str.replace(/[0-9]/g, d => GUJARATI_DIGITS[d] || d);
}

// Letter phonetics for acronyms (e.g. NPBT -> એનપીબીટી)
const ENGLISH_LETTER_ACRONYMS: Record<string, string> = {
    A: 'એ', B: 'બી', C: 'સી', D: 'ડી', E: 'ઈ', F: 'એફ',
    G: 'જી', H: 'એચ', I: 'આઈ', J: 'જે', K: 'કે', L: 'એલ',
    M: 'એમ', N: 'એન', O: 'ઓ', P: 'પી', Q: 'ક્યુ', R: 'આર',
    S: 'એસ', T: 'ટી', U: 'યુ', V: 'વી', W: 'ડબલ્યુ', X: 'એક્સ',
    Y: 'વાય', Z: 'ઝેડ'
};

export function transliterateAcronym(acronym: string): string {
    const clean = acronym.replace(/[^A-Za-z]/g, '').toUpperCase();
    return clean.split('').map(char => ENGLISH_LETTER_ACRONYMS[char] || char).join('');
}

// Common dictionary words for R&B terminology, locations, and prepositions
const DICTIONARY: Record<string, string> = {
    // Action / Work terms
    'resurfacing': 'રીસરફેસીંગ',
    'resurface': 'રીસરફેસ',
    'resurfaced': 'રીસરફેસ્ડ',
    'widening': 'વાઈડનીંગ',
    'widen': 'વાઈડન',
    'strengthening': 'સ્ટ્રેન્થનીંગ',
    'strengthen': 'સ્ટ્રેન્થન',
    'improvement': 'ઈમ્પ્રુવમેન્ટ',
    'improving': 'ઈમ્પ્રુવિંગ',
    'construction': 'કન્સ્ટ્રક્શન',
    'reconstruction': 'રીકન્સ્ટ્રક્શન',
    'constructing': 'કન્સ્ટ્રક્ટિંગ',
    'upgradation': 'અપગ્રેડેશન',
    'up-gradation': 'અપગ્રેડેશન',
    'maintenance': 'મેઇન્ટેનન્સ',
    'repairs': 'રીપેર્સ',
    'repair': 'રીપેર',
    'repairing': 'રીપેરીંગ',
    'patch': 'પેચ',
    'patches': 'પેચીસ',
    'patchwork': 'પેચવર્ક',
    'asphalting': 'એસ્ફાલ્ટીંગ',
    'asphalt': 'ડામર',
    'metalling': 'મેટલીંગ',
    're-metalling': 'રી-મેટલીંગ',
    'paving': 'પેવિંગ',
    'paver': 'પેવર',
    'pavers': 'પેવર્સ',
    'electrification': 'ઇલેક્ટ્રિફિકેશન',
    'sanction': 'મંજૂરી',
    'providing': 'પ્રોવાઇડીંગ',
    'laying': 'લેઇંગ',
    'fixing': 'ફિક્સીંગ',
    'supplying': 'સપ્લાયીંગ',
    'supply': 'સપ્લાય',

    // Prepositions & common joining words
    'of': 'ઓફ',
    'to': 'ટુ',
    'from': 'ફ્રોમ',
    'and': 'અને',
    '&': '&',
    'at': 'એટ',
    'in': 'ઇન',
    'for': 'ફોર',
    'with': 'વિથ',
    'via': 'વાયા',
    'near': 'નજીક',
    'including': 'સહિત',
    'incl': 'સહિત',
    'incl.': 'સહિત',
    'excluding': 'સિવાય',
    'both': 'બંને',
    'side': 'સાઇડ',
    'sides': 'સાઇડ્સ',

    // Infrastructure nouns
    'road': 'રોડ',
    'rd': 'રોડ',
    'rd.': 'રોડ',
    'roads': 'રોડ્સ',
    'bridge': 'બ્રિજ',
    'bridges': 'બ્રિજીસ',
    'culvert': 'કલવર્ટ',
    'culverts': 'કલવર્ટ્સ',
    'causeway': 'કોઝવે',
    'causeways': 'કોઝવેઝ',
    'building': 'બિલ્ડીંગ',
    'buildings': 'બિલ્ડીંગ્સ',
    'shed': 'શેડ',
    'sheds': 'શેડ્સ',
    'room': 'રૂમ',
    'rooms': 'રૂમો',
    'block': 'બ્લોક',
    'blocks': 'બ્લોક્સ',
    'hall': 'હોલ',
    'compound': 'કમ્પાઉન્ડ',
    'wall': 'વોલ',
    'walls': 'વોલ્સ',
    'gate': 'ગેટ',
    'drain': 'ડ્રેઇન',
    'drains': 'ડ્રેઇન્સ',
    'drainage': 'ડ્રેનેજ',
    'gutter': 'ગટર',
    'gutters': 'ગટરો',
    'footpath': 'ફુટપાથ',
    'footpaths': 'ફુટપાથ',
    'shoulder': 'શોલ્ડર',
    'shoulders': 'શોલ્ડર્સ',
    'junction': 'જંકશન',
    'approach': 'એપ્રોચ',
    'approaches': 'એપ્રોચીસ',
    'protection': 'પ્રોટેક્શન',
    'retaining': 'રીટેઈનીંગ',
    'pipeline': 'પાઇપલાઇન',
    'tank': 'ટાંકી',
    'toilet': 'ટોયલેટ',
    'toilets': 'ટોયલેટ',

    // Administrative / Places / Categories
    'work': 'કામ',
    'works': 'કામો',
    'package': 'પેકેજ',
    'packages': 'પેકેજીસ',
    'ta': 'તા.',
    'ta.': 'તા.',
    'taluka': 'તા.',
    'dist': 'જિ.',
    'dist.': 'જિ.',
    'district': 'જિ.',
    'km': 'કિમી',
    'km.': 'કિમી',
    'kms': 'કિમી',
    'kms.': 'કિમી',
    'ch': 'ચે.',
    'ch.': 'ચે.',
    'chainage': 'ચેનેજ',
    'mtr': 'મીટર',
    'mtrs': 'મીટર',
    'meter': 'મીટર',
    'meters': 'મીટર',
    'section': 'સેક્શન',
    'sub-division': 'પેટા વિભાગ',
    'subdivision': 'પેટા વિભાગ',
    'division': 'વિભાગ',
    'circle': 'વર્તુળ',
    'staff': 'સ્ટાફ',
    'quarter': 'ક્વાર્ટર',
    'quarters': 'ક્વાર્ટર્સ',
    'office': 'ઓફિસ',
    'rest': 'રેસ્ટ',
    'house': 'હાઉસ',
    'bhavan': 'ભવન',
    'sadan': 'સદન',
    'seva': 'સેવા',
    'panchayat': 'પંચાયત',
    'gram': 'ગ્રામ',
    'nagar': 'નગર',
    'prathmik': 'પ્રાથમિક',
    'shala': 'શાળા',
    'school': 'શાળા',
    'hospital': 'હોસ્પિટલ',
    'centre': 'સેન્ટર',
    'center': 'સેન્ટર',
    'health': 'હેલ્થ',
    'primary': 'પ્રાથમિક',
    'high': 'હાઇ',
    'level': 'લેવલ',
    'minor': 'માઇનોર',
    'major': 'મેજર',
    'state': 'સ્ટેટ',
    'highway': 'હાઇવે',
    'national': 'નેશનલ',

    // Specific Talukas / Cities / Villages
    'bhavnagar': 'ભાવનગર',
    'jesar': 'જેસર',
    'mahuva': 'મહુવા',
    'palitana': 'પાલીતાણા',
    'talaja': 'તળાજા',
    'shihor': 'શિહોર',
    'sihor': 'શિહોર',
    'vallabhipur': 'વલ્લભીપુર',
    'valbhipur': 'વલ્લભીપુર',
    'gariyadhar': 'ગારીયાધાર',
    'gariadhar': 'ગારીયાધાર',
    'umrala': 'ઉમરાળા',
    'ghogha': 'ઘોઘા',
    'ugalavan': 'ઉગલવાણ',
    'ugalvan': 'ઉગલવાણ',
    'sarera': 'સરેરા',
    'navagam': 'નવાગામ',
    'ankolali': 'અંકોલાળી',
    'bagdana': 'બગદાણા',
    'trapaj': 'ત્રાપજ',
    'alang': 'અલંગ',
    'sartanpar': 'સરતાનપર',
    'vartej': 'વરતેજ',
    'songadh': 'સોનગઢ',
    'tana': 'ટાણા',
    'bhandariya': 'ભંડારીયા',
    'budhel': 'બુધેલ',
    'koliyak': 'કોળીયાક',
    'koliya': 'કોળીયાક',
    'gopnath': 'ગોપનાથ',
    'rajula': 'રાજુલા',
    'savarkundla': 'સાવરકુંડલા',
    'amreli': 'અમરેલી',
    'botad': 'બોટાદ',
    'gadhada': 'ગઢડા',
    'ahmedabad': 'અમદાવાદ',
    'gandhinagar': 'ગાંધીનગર',
    'surat': 'સુરત',
    'vadodara': 'વડોદરા',
    'baroda': 'વડોદરા',
    'rajkot': 'રાજકોટ',
};

// Known abbreviations and acronyms in Civil & R&B
const KNOWN_ACRONYMS: Record<string, string> = {
    'NPBT': 'એનપીબીટી',
    'BT': 'બીટી',
    'WBM': 'ડબલ્યુબીએમ',
    'CC': 'સીસી',
    'VR': 'વીઆર',
    'ODR': 'ઓડીઆર',
    'MDR': 'એમડીઆર',
    'SH': 'એસએચ',
    'NH': 'એનએચ',
    'CD': 'સીડી',
    'RCC': 'આરસીસી',
    'BM': 'બીએમ',
    'SDBC': 'એસડીબીસી',
    'DBM': 'ડીબીએમ',
    'BC': 'બીસી',
    'MSS': 'એમએસએસ',
    'OGPC': 'ઓજીપીસી',
    'DLC': 'ડીએલસી',
    'PQC': 'પીક્યુસી',
    'GSB': 'જીએસબી',
    'ST': 'એસટી',
    'SC': 'એસસી',
    'PHC': 'પીએચસી',
    'CHC': 'સીએચસી',
    'ICDS': 'આઈસીડીએસ',
    'DDO': 'ડીડીઓ',
    'MLA': 'ધારાસભ્ય',
    'MP': 'સાંસદ',
    'SR': 'એસઆર',
    'DP': 'ડીપી',
    'CDP': 'સીડીપી',
    'RNB': 'આરએન્ડબી',
};

/**
 * Phonetic transliteration engine for general words not found in dictionary
 */
export function phoneticWordToGujarati(word: string): string {
    if (!word) return '';

    const lower = word.toLowerCase();

    // Matched in dictionary?
    if (DICTIONARY[lower]) {
        return DICTIONARY[lower];
    }

    // Check if it's all uppercase acronym (e.g. NPBT, RCC, PMGSY)
    if (/^[A-Z]{2,}$/.test(word)) {
        if (KNOWN_ACRONYMS[word]) return KNOWN_ACRONYMS[word];
        return transliterateAcronym(word);
    }

    // Phonetic transliteration table
    const multiConsonants: [RegExp, string][] = [
        [/^shh/i, 'ષ'],
        [/^chh/i, 'છ'],
        [/^kh/i, 'ખ'],
        [/^gh/i, 'ઘ'],
        [/^ch/i, 'ચ'],
        [/^jh/i, 'ઝ'],
        [/^th/i, 'થ'],
        [/^dh/i, 'ધ'],
        [/^ph/i, 'ફ'],
        [/^bh/i, 'ભ'],
        [/^sh/i, 'શ'],
        [/^gn/i, 'જ્ઞ'],
        [/^gy/i, 'જ્ઞ'],
        [/^tr/i, 'ત્ર'],
        [/^ksh/i, 'ક્ષ'],
    ];

    const singleConsonants: Record<string, string> = {
        'k': 'ક', 'g': 'ગ', 'j': 'જ', 'z': 'ઝ',
        't': 'ટ', 'd': 'ડ', 'n': 'ન', 'p': 'પ',
        'f': 'ફ', 'b': 'બ', 'm': 'મ', 'y': 'ય',
        'r': 'ર', 'l': 'લ', 'v': 'વ', 'w': 'વ',
        's': 'સ', 'h': 'હ', 'c': 'ક', 'q': 'ક', 'x': 'ક્સ'
    };

    const vowelStarts: [RegExp, string][] = [
        [/^aa/i, 'આ'],
        [/^ai/i, 'ઐ'],
        [/^au/i, 'ઔ'],
        [/^ou/i, 'ઔ'],
        [/^ay/i, 'એ'],
        [/^ee/i, 'ઈ'],
        [/^oo/i, 'ઊ'],
        [/^a/i, 'અ'],
        [/^i/i, 'ઇ'],
        [/^u/i, 'ઉ'],
        [/^e/i, 'એ'],
        [/^o/i, 'ઓ'],
    ];

    const matras: [RegExp, string][] = [
        [/^aa/i, 'ા'],
        [/^ai/i, 'ૈ'],
        [/^au/i, 'ૌ'],
        [/^ou/i, 'ૌ'],
        [/^ay/i, 'ે'],
        [/^ee/i, 'ી'],
        [/^oo/i, 'ૂ'],
        [/^a/i, 'ા'],
        [/^i/i, 'િ'],
        [/^u/i, 'ુ'],
        [/^e/i, 'ે'],
        [/^o/i, 'ો'],
    ];

    let result = '';
    let i = 0;
    let isFirst = true;

    while (i < lower.length) {
        const remaining = lower.slice(i);

        // Check if start of word is a vowel
        if (isFirst) {
            let matchedVowel = false;
            for (const [regex, char] of vowelStarts) {
                const match = remaining.match(regex);
                if (match) {
                    result += char;
                    i += match[0].length;
                    matchedVowel = true;
                    isFirst = false;
                    break;
                }
            }
            if (matchedVowel) continue;
        }

        // Check multi-character consonants
        let matchedConsonant = false;
        for (const [regex, char] of multiConsonants) {
            const match = remaining.match(regex);
            if (match) {
                result += char;
                i += match[0].length;
                matchedConsonant = true;
                isFirst = false;
                break;
            }
        }

        if (!matchedConsonant) {
            const c = remaining[0];
            if (singleConsonants[c]) {
                result += singleConsonants[c];
                i += 1;
                isFirst = false;
                matchedConsonant = true;
            }
        }

        if (matchedConsonant) {
            // Check if followed by vowel/matra
            if (i < lower.length) {
                const nextRemaining = lower.slice(i);
                let matchedMatra = false;
                for (const [regex, matra] of matras) {
                    const match = nextRemaining.match(regex);
                    if (match) {
                        if (match[0] === 'a' && i + match[0].length < lower.length) {
                            const nextNext = lower[i + 1];
                            if (singleConsonants[nextNext] || multiConsonants.some(([r]) => lower.slice(i + 1).match(r))) {
                                // Implicit 'a'
                            } else {
                                result += matra;
                            }
                        } else {
                            result += matra;
                        }
                        i += match[0].length;
                        matchedMatra = true;
                        break;
                    }
                }
            }
            continue;
        }

        // If nothing matched, copy character
        result += remaining[0];
        i += 1;
        isFirst = false;
    }

    return result;
}

/**
 * Main transliteration function for package names
 */
export function transliteratePackageNameToGujarati(input: string): string {
    if (!input || !input.trim()) return '';

    let text = input.trim();

    // 1. Preprocess specific patterns:
    // Ta.Jesar / Ta. Jesar -> તા. જેસર
    text = text.replace(/\bTa\.?\s*([a-zA-Z]+)/gi, (_, taluka) => {
        const talukaGuj = DICTIONARY[taluka.toLowerCase()] || phoneticWordToGujarati(taluka);
        return `તા. ${talukaGuj}`;
    });

    // Dist.Bhavnagar / Dist. Bhavnagar -> , જિ. ભાવનગર
    text = text.replace(/(?:,\s*)?\bDist\.?\s*([a-zA-Z]+)/gi, (_, dist) => {
        const distGuj = DICTIONARY[dist.toLowerCase()] || phoneticWordToGujarati(dist);
        return `, જિ. ${distGuj}`;
    });

    // KM.0/000 to 3/100 -> કિમી ૦/૦૦૦ ટુ ૩/૧૦૦
    text = text.replace(/\b(KM|Km|km)\.?\s*([0-9]+(?:\/[0-9]+)?)/gi, (_, __, chainage) => {
        return `કિમી ${convertDigitsToGujarati(chainage)}`;
    });

    // Standalone KM. or KM -> કિમી
    text = text.replace(/\b(KM|Km|km)\.?\b/g, 'કિમી');

    // Convert digits in chainages or numbers (e.g. 0/000, 3/100, 2025-26, 12.50)
    text = text.replace(/([0-9]+(?:\.[0-9]+)?(?:\/[0-9]+)?)/g, match => convertDigitsToGujarati(match));

    // Handle parentheses acronyms like (NPBT), (C.C.), (R.C.C.)
    text = text.replace(/\(([A-Za-z0-9\.\s]+)\)/g, (match, inner) => {
        const cleaned = inner.replace(/\./g, '').trim();
        if (KNOWN_ACRONYMS[cleaned.toUpperCase()]) {
            return `(${KNOWN_ACRONYMS[cleaned.toUpperCase()]})`;
        }
        if (/^[A-Za-z]{2,}$/.test(cleaned)) {
            return `(${transliterateAcronym(cleaned)})`;
        }
        const innerTrans = transliteratePackageNameToGujarati(inner);
        return `(${innerTrans})`;
    });

    // Tokenize by word / punctuation
    const tokens = text.split(/([\s,();\-\/]+)/);

    const translatedTokens = tokens.map(token => {
        if (!token || /^[\s,();\-\/]+$/.test(token)) {
            return token;
        }

        // Check if token has Gujarati characters already
        if (/[\u0A80-\u0AFF]/.test(token)) {
            return token;
        }

        const lower = token.toLowerCase();

        // Exact match in dictionary
        if (DICTIONARY[lower]) {
            return DICTIONARY[lower];
        }

        // Acronym match
        if (KNOWN_ACRONYMS[token.toUpperCase()]) {
            return KNOWN_ACRONYMS[token.toUpperCase()];
        }

        // Fallback to phonetic transliteration
        return phoneticWordToGujarati(token);
    });

    let output = translatedTokens.join('');

    // Clean up spacing around Gujarati abbreviations if needed
    output = output
        .replace(/^,\s*/, '')
        .replace(/તા\.\s+/g, 'તા. ')
        .replace(/,\s*જિ\.\s+/g, ', જિ. ')
        .replace(/જિ\.\s+/g, 'જિ. ')
        .replace(/કિમી\s+/g, 'કિમી ')
        .replace(/\s+,/g, ',')
        .replace(/\s{2,}/g, ' ')
        .trim();

    return output;
}
