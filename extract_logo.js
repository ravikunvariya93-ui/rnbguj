const fs = require("fs");

const content = fs.readFileSync("lh_output.txt", "utf8");
const match = content.match(/<img src="data:image\/jpeg;base64,([^"]+)"/);

if (match && match[1]) {
    const base64Data = match[1];
    fs.writeFileSync("public/logo.jpg", base64Data, 'base64');
    console.log("Extracted logo and saved to public/logo.jpg");
} else {
    console.log("No logo found in the document.");
}
