import * as XLSX from 'xlsx';

const wb = XLSX.readFile('./demo.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

console.log('Sheet names:', wb.SheetNames);
console.log('Columns:', Object.keys(data[0] as object));
console.log('\nSample data (first 5 rows):');
console.log(JSON.stringify(data.slice(0, 5), null, 2));
