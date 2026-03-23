import * as XLSX from 'xlsx';

const workbook = XLSX.readFile('./RFQ_362026_Com.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

console.log('=== Excel 文件信息 ===');
console.log('工作表名称:', sheetName);
console.log('\n=== 列名 ===');

const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

// 打印前20行数据
console.log('\n=== 数据内容（前20行）===');
jsonData.slice(0, 20).forEach((row, index) => {
  console.log(`行 ${index + 1}:`, row);
});

console.log('\n=== 总行数 ===');
console.log('总行数:', jsonData.length);

// 打印所有列名（第一行）
if (jsonData.length > 0) {
  console.log('\n=== 完整列名 ===');
  jsonData[0].forEach((col: any, index: number) => {
    console.log(`列 ${index + 1}: ${col}`);
  });
}
