const fs = require('fs');
global.DOMMatrix = class DOMMatrix {};
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('c:/rnbguj/30.pdf');

pdf(dataBuffer).then(function(data) {
    console.log('--- RAW TEXT START ---');
    console.log(data.text);
    console.log('--- RAW TEXT END ---');
}).catch(err => {
    console.error(err);
});
