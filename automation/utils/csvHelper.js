const fs = require('fs');
const path = require('path');

function parseCsvData(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split(/\r?\n/);
  
  if (lines.length === 0) return [];
  
  // Headers
  const headers = parseCsvRow(lines[0]).map(h => h.trim());
  const results = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue; // Skip empty rows
    
    const columns = parseCsvRow(line).map(c => c.trim());
    const rowObj = {};
    
    headers.forEach((header, index) => {
      rowObj[header] = columns[index] !== undefined ? columns[index] : '';
    });
    
    results.push(rowObj);
  }
  
  return results;
}

function parseCsvRow(rowText) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < rowText.length; i++) {
    const char = rowText[i];
    const nextChar = rowText[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

module.exports = {
  parseCsvData,
  parseCsvRow
};
