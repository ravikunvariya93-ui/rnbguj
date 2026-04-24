const fs = require('fs');
const path = require('path');

const filesToPatch = [
    'app/approved-works/page.tsx',
    'app/technical-sanctions/page.tsx',
    'app/packages/page.tsx',
    'app/dtp/page.tsx',
    'app/tenders/page.tsx',
    'app/loas/page.tsx',
    'app/work-orders/page.tsx',
    'app/boqs/page.tsx',
    'app/bills/page.tsx',
    'app/unmatched-ts/page.tsx'
];

filesToPatch.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (!fs.existsSync(fullPath)) return;
    
    let content = fs.readFileSync(fullPath, 'utf8');

    // Add import SortableHeader if missing
    if (!content.includes('SortableHeader')) {
        content = content.replace(/(import .*? from .*?;\r?\n)+/, match => `${match}import SortableHeader from '@/components/SortableHeader';\n`);
    }

    // Update searchParams
    if (!content.includes('sort?: string')) {
        content = content.replace(/searchParams: \{(.*?)\};/, 'searchParams: {$1; sort?: string; order?: string }');
    }

    // For unmatched-ts we don't have a Mongo query to patch the same way, we can skip sort logic for now or do it manually
    if (file !== 'app/unmatched-ts/page.tsx') {
        // Add sortObj logic
        if (!content.includes('let sortObj')) {
            content = content.replace(
                /(const limit = .*?;\r?\n\s*const skip = .*?;)/,
                `$1\n\n    let sortObj: any = { createdAt: -1 };\n    if (params.sort && params.order) {\n        sortObj = { [params.sort]: params.order === 'asc' ? 1 : -1 };\n    }\n`
            );
        }

        // Apply sortObj to the query
        content = content.replace(/\.sort\(\{ createdAt: -1 \}\)/, '.sort(sortObj)');
    } else {
        // unmatched-ts has different sorting logic (in-memory)
        if (!content.includes('sortObj')) {
            content = content.replace(
                /const unmatchedTS: any\[\] = \[\];/,
                `const unmatchedTS: any[] = [];\n    // TODO: add sorting to unmatched`
            );
        }
    }

    // Now, replace th tags with SortableHeader. 
    // We only want to replace th tags that contain plain text (no Actions or Sr No)
    // Actually, writing a regex to replace table headers correctly is risky.
    
    fs.writeFileSync(fullPath, content);
    console.log(`Patched ${file}`);
});
