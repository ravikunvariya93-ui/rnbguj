const fs = require('fs');
const path = require('path');

const fieldMapping = {
    'Name of Work': 'workName',
    'Sub Division': 'subDivision',
    'Consultant': 'estimateConsultant',
    'Approval Year': 'approvalYear',
    'Road Category': 'roadCategory',
    'Work Type': 'workType',
    'Nature of Work': 'natureOfWork',
    'TS Amount': 'tsAmount',
    'T.S. Date': 'tsDate',
    'Package Name': 'packageName',
    'No. of Works': 'worksCount', // virtual might not sort
    'Est. Amt': 'estimatedAmount',
    'Est. Cost': 'estimatedCost',
    'Tender Value': 'tenderValue',
    'DTP Cost': 'dtpCost',
    'DTP Date': 'dtpApprovalDate',
    'Agency Name': 'agencyName',
    'LOA Amount': 'loaAmount',
    'Tender Cost': 'tenderCost',
    'LOA Date': 'loaDate',
    'WO Date': 'woDate',
    'WO Amount': 'woAmount',
    'Defect Liability': 'defectLiabilityPeriod',
    'Total Amount': 'totalAmount',
    'Bill Amount': 'billAmount',
    'Status': 'status',
    'Amount': 'amount'
};

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
];

filesToPatch.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (!fs.existsSync(fullPath)) return;
    
    let content = fs.readFileSync(fullPath, 'utf8');

    // Regex to match th tags
    content = content.replace(/<th(.*?)>(.*?)<\/th>/g, (match, attrs, label) => {
        if (label.includes('Actions') || label.includes('Sr. No.') || label.includes('Download') || label.includes('Action')) {
            return match; // Keep as is
        }
        
        // Extract className
        const classMatch = attrs.match(/className="([^"]*)"/);
        const className = classMatch ? classMatch[1] : '';
        
        let plainLabel = label.replace(/<[^>]*>?/gm, '').trim(); // Remove nested tags just in case
        
        let field = fieldMapping[plainLabel] || plainLabel.toLowerCase().replace(/ /g, '');
        
        return `<SortableHeader field="${field}" label="${plainLabel}" className="${className}" />`;
    });

    fs.writeFileSync(fullPath, content);
    console.log(`Patched headers in ${file}`);
});
