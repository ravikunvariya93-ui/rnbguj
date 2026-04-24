const fs = require('fs');
let c = fs.readFileSync('app/bills/page.tsx', 'utf8');
c = c.replace('export default async function BillsPage() {', 
`export default async function BillsPage(props: { searchParams?: Promise<any> }) {
    const searchParams = props.searchParams || Promise.resolve({});
    const params = await searchParams;
    let sortObj: any = { createdAt: -1 };
    if (params.sort && params.order) {
        sortObj = { [params.sort]: params.order === 'asc' ? 1 : -1 };
    }
`);
fs.writeFileSync('app/bills/page.tsx', c);
