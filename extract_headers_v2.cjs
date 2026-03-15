const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'C:/Users/Kishore R/Desktop/desktop_kix/ZEN GRAP/zenetive website/THAALAAA PROJETt/placement-navigator-main/PLACEMENT_TEMPLATE.xlsx';

if (fs.existsSync(filePath)) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = data[0];
    console.log('--- HEADERS START ---');
    headers.forEach((h, i) => console.log(`${i}: ${h}`));
    console.log('--- HEADERS END ---');
} else {
    console.log('File not found');
}
