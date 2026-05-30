const XLSX = require('xlsx');

async function run() {
    const file = 'c:\\rnbguj\\rnbguj\\01-Tender 2025-26.xlsm';
    const workbook = XLSX.readFile(file);
    const sheet = workbook.Sheets['Tender'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log("--- Row 1 ---");
    console.log(rows[0]);
    console.log("--- Row 2 ---");
    console.log(rows[1]);
    console.log("--- Row 3 ---");
    console.log(rows[2]);
}

run().catch(console.dir);
