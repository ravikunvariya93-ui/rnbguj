const mammoth = require("mammoth");
const fs = require("fs");

Promise.all([
    mammoth.convertToHtml({path: "LetterHead.docx"}),
    mammoth.extractRawText({path: "LetterHead.docx"})
]).then(([htmlResult, textResult]) => {
    let out = "=== HTML OUTPUT ===\n" + htmlResult.value + "\n\n=== RAW TEXT ===\n" + textResult.value;
    fs.writeFileSync("lh_output.txt", out);
    console.log("Written to lh_output.txt");
}).catch(err => {
    console.error(err);
});
