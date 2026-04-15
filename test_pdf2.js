const fs = require('fs');
const PDFParser = require("pdf2json");

const pdfParser = new PDFParser();

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError) );
pdfParser.on("pdfParser_dataReady", pdfData => {
    console.log('--- JSON START ---');
    console.log(JSON.stringify(pdfData));
    console.log('--- JSON END ---');
    
    // Simple text extraction for demonstration
    const text = pdfData.Pages.map(page => 
        page.Texts.map(t => {
            try {
                return decodeURIComponent(t.R[0].T);
            } catch (e) {
                return t.R[0].T; // fail safe
            }
        }).join(' ')
    ).join('\n');
    
    console.log('--- TEXT START ---');
    console.log(text);
    console.log('--- TEXT END ---');
});

pdfParser.loadPDF("c:/rnbguj/30.pdf");
