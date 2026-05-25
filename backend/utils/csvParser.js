/**
 * Helper utility to parse CSV strings into an array of objects.
 * Handles headers, comma separations, and wrapping quotes.
 */
function parseCsv(csvText) {
  if (!csvText || csvText.trim() === '') return [];

  const lines = csvText.split(/\r?\n/);
  const result = [];
  
  if (lines.length === 0) return [];
  
  // Parse headers
  const headers = parseCsvRow(lines[0]);
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue; // Skip empty rows
    
    const row = parseCsvRow(line);
    const obj = {};
    
    headers.forEach((header, index) => {
      obj[header.trim()] = row[index] !== undefined ? row[index].trim() : '';
    });
    
    result.push(obj);
  }
  
  return result;
}

// Parses a single CSV row, respecting double quotes
function parseCsvRow(rowText) {
  const result = [];
  let currentVal = '';
  let inQuotes = false;
  
  for (let i = 0; i < rowText.length; i++) {
    const char = rowText[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(currentVal);
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  
  result.push(currentVal); // push last item
  
  // Clean double quotes if they wrap the values
  return result.map(val => {
    let clean = val.trim();
    if (clean.startsWith('"') && clean.endsWith('"')) {
      clean = clean.substring(1, clean.length - 1);
    }
    return clean.replace(/""/g, '"'); // Unescape double quotes
  });
}

module.exports = {
  parseCsv,
  parseCsvRow
};
