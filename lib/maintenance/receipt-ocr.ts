/**
 * Receipt OCR and Data Extraction Service
 * Uses pattern matching for text extraction
 * Can be enhanced with Tesseract.js for image OCR
 */

export interface ExtractedReceiptData {
  raw_text: string;
  vendor_name: string | null;
  vendor_address: string | null;
  date: string | null;
  amount: number | null;
  subtotal: number | null;
  tax: number | null;
  invoice_number: string | null;
  po_number: string | null;
  payment_method: string | null;
  line_items: Array<{
    description: string;
    quantity?: number;
    unit_price?: number;
    total?: number;
  }>;
  confidence: number;
}

/**
 * Extract receipt data from OCR text
 */
export async function extractReceiptData(
  imageFile: File | Blob
): Promise<ExtractedReceiptData> {
  try {
    // For now, we'll use basic browser-based extraction
    // In production, you could integrate Tesseract.js or a cloud OCR service
    
    // Try to extract text from image using Canvas API (basic)
    const text = await extractTextFromImage(imageFile);
    
    // Extract vendor name (usually at top)
    const vendor = extractVendorName(text);
    
    // Extract vendor address
    const address = extractVendorAddress(text);
    
    // Extract date
    const date = extractDate(text);
    
    // Extract amounts
    const { total, subtotal, tax } = extractAmounts(text);
    
    // Extract invoice/receipt number
    const invoiceNumber = extractInvoiceNumber(text);
    
    // Extract PO number
    const poNumber = extractPONumber(text);
    
    // Extract payment method
    const paymentMethod = extractPaymentMethod(text);
    
    // Extract line items
    const lineItems = extractLineItems(text);
    
    return {
      raw_text: text,
      vendor_name: vendor,
      vendor_address: address,
      date: date,
      amount: total,
      subtotal: subtotal,
      tax: tax,
      invoice_number: invoiceNumber,
      po_number: poNumber,
      payment_method: paymentMethod,
      line_items: lineItems,
      confidence: text.length > 50 ? 0.7 : 0.3 // Basic confidence score
    };
  } catch (error) {
    console.error('OCR extraction failed:', error);
    return {
      raw_text: '',
      vendor_name: null,
      vendor_address: null,
      date: null,
      amount: null,
      subtotal: null,
      tax: null,
      invoice_number: null,
      po_number: null,
      payment_method: null,
      line_items: [],
      confidence: 0
    };
  }
}

/**
 * Basic text extraction from image (placeholder for Tesseract.js integration)
 */
async function extractTextFromImage(imageFile: File | Blob): Promise<string> {
  // This is a placeholder - in production, use Tesseract.js:
  // 
  // import Tesseract from 'tesseract.js';
  // const result = await Tesseract.recognize(imageFile, 'eng');
  // return result.data.text;
  
  // For now, return empty string - data will be entered manually
  // The actual OCR would happen here
  return '';
}

/**
 * Extract vendor name from text (usually first few lines)
 */
function extractVendorName(text: string): string | null {
  if (!text) return null;
  
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  
  // Skip common header patterns and find business name
  for (const line of lines.slice(0, 7)) {
    const trimmed = line.trim();
    
    // Skip if it looks like an address
    if (trimmed.match(/^\d{1,5}\s+\w+\s+(st|street|rd|road|ave|avenue|blvd|dr|drive|way|ln|lane)/i)) continue;
    
    // Skip if it's just a zip/postal code
    if (trimmed.match(/^[A-Z]\d[A-Z]\s*\d[A-Z]\d$/i)) continue;
    if (/^\d{5}$/.test(trimmed) || /^\d{5}-\d{4}$/.test(trimmed)) continue;
    
    // Skip phone numbers
    if (trimmed.match(/^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/)) continue;
    
    // Skip dates
    if (trimmed.match(/^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/)) continue;
    
    // Skip very short lines
    if (trimmed.length < 4) continue;
    
    // Skip lines that are all numbers
    if (trimmed.match(/^[\d\s.,\-$]+$/)) continue;
    
    // This is probably the vendor name
    return trimmed;
  }
  
  return null;
}

/**
 * Extract vendor address from text
 */
function extractVendorAddress(text: string): string | null {
  if (!text) return null;
  
  // Look for address patterns
  const addressPattern = /(\d{1,5}\s+[\w\s]+(?:st|street|rd|road|ave|avenue|blvd|dr|drive|way|ln|lane)[.,]?\s*(?:suite|ste|unit|#)?\s*\d*)/i;
  const match = text.match(addressPattern);
  
  if (match) {
    return match[1].trim();
  }
  
  return null;
}

/**
 * Extract date from text
 */
function extractDate(text: string): string | null {
  if (!text) return null;
  
  // Common date patterns
  const datePatterns = [
    // Jan 15, 2025 or January 15, 2025
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\b/i,
    // 01/15/2025 or 01-15-2025
    /\b(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})\b/,
    // 2025-01-15
    /\b(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\b/,
    // 15 Jan 2025
    /\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})\b/i
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return null;
}

/**
 * Extract amounts from text (total, subtotal, tax)
 */
function extractAmounts(text: string): {
  total: number | null;
  subtotal: number | null;
  tax: number | null;
} {
  if (!text) return { total: null, subtotal: null, tax: null };
  
  const normalizedText = text.toLowerCase();
  
  const parseAmountFromText = (s: string): number | null => {
    // Skip until first digit
    let i = 0;
    while (i < s.length) {
      const code = s.charCodeAt(i);
      const isDigit = code >= 48 && code <= 57;
      if (isDigit) break;
      i++;
    }
    if (i >= s.length) return null;

    let raw = '';
    for (; i < s.length; i++) {
      // Safe: i is a controlled loop index within bounds of string s
      // eslint-disable-next-line security/detect-object-injection
      const ch = s[i];
      const isDigit = ch >= '0' && ch <= '9';
      if (isDigit || ch === '.' || ch === ',') {
        raw += ch;
        continue;
      }
      if (raw) break;
    }

    const cleaned = raw.replaceAll(',', '');
    const value = Number.parseFloat(cleaned);
    return Number.isFinite(value) ? value : null;
  };

  const findAmountByKeywords = (keywords: string[]): number | null => {
    for (const kw of keywords) {
      const idx = normalizedText.indexOf(kw);
      if (idx < 0) continue;
      const after = normalizedText.slice(idx + kw.length);
      const value = parseAmountFromText(after);
      if (value !== null) return value;
    }
    return null;
  };

  const total = findAmountByKeywords([
    'grand total',
    'balance due',
    'amount due',
    'you owe',
    'total',
  ]);

  const subtotal = findAmountByKeywords([
    'sub-total',
    'sub total',
    'subtotal',
  ]);

  const tax = findAmountByKeywords([
    'sales tax',
    'hst',
    'gst',
    'pst',
    'tax',
  ]);
  
  // If no total found, try to find the largest amount
  let finalTotal = total;
  if (finalTotal === null) {
    const amounts: number[] = [];
    for (let i = 0; i < text.length; i++) {
      // Safe: i is a controlled loop index within bounds of text string
      // eslint-disable-next-line security/detect-object-injection
      if (text[i] !== '$') continue;
      const value = parseAmountFromText(text.slice(i + 1));
      if (value !== null) amounts.push(value);
    }
    if (amounts.length > 0) {
      finalTotal = Math.max(...amounts);
    }
  }
  
  return { total: finalTotal, subtotal, tax };
}

/**
 * Extract invoice/receipt number from text
 */
function extractInvoiceNumber(text: string): string | null {
  if (!text) return null;
  
  const patterns = [
    /invoice\s*#?\s*:?\s*([A-Z0-9][\w-]*)/i,
    /inv\s*#?\s*:?\s*([A-Z0-9][\w-]*)/i,
    /receipt\s*#?\s*:?\s*([A-Z0-9][\w-]*)/i,
    /order\s*#?\s*:?\s*([A-Z0-9][\w-]*)/i,
    /ref(?:erence)?\s*#?\s*:?\s*([A-Z0-9][\w-]*)/i,
    /transaction\s*#?\s*:?\s*([A-Z0-9][\w-]*)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1].length >= 3) {
      return match[1].toUpperCase();
    }
  }
  
  return null;
}

/**
 * Extract PO number from text
 */
function extractPONumber(text: string): string | null {
  if (!text) return null;
  
  const patterns = [
    /p\.?o\.?\s*#?\s*:?\s*([A-Z0-9][\w-]*)/i,
    /purchase\s+order\s*#?\s*:?\s*([A-Z0-9][\w-]*)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1].length >= 3) {
      return match[1].toUpperCase();
    }
  }
  
  return null;
}

/**
 * Extract payment method from text
 */
function extractPaymentMethod(text: string): string | null {
  if (!text) return null;
  
  const normalizedText = text.toLowerCase();
  
  if (normalizedText.includes('visa')) return 'Visa';
  if (normalizedText.includes('mastercard') || normalizedText.includes('mc')) return 'Mastercard';
  if (normalizedText.includes('amex') || normalizedText.includes('american express')) return 'Amex';
  if (normalizedText.includes('debit')) return 'Debit';
  if (normalizedText.includes('cash')) return 'Cash';
  if (normalizedText.includes('cheque') || normalizedText.includes('check')) return 'Cheque';
  if (normalizedText.includes('e-transfer') || normalizedText.includes('etransfer')) return 'E-Transfer';
  if (normalizedText.includes('interac')) return 'Interac';
  
  return null;
}

/**
 * Extract line items from text
 */
function extractLineItems(text: string): Array<{
  description: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
}> {
  if (!text) return [];
  
  const lineItems: Array<{
    description: string;
    quantity?: number;
    unit_price?: number;
    total?: number;
  }> = [];
  
  // Look for patterns like: "1 x Widget $25.00" or "Widget 1 @ $25.00 = $25.00"
  const itemPatterns = [
    /(\d+)\s*x?\s*(.+?)\s+\$?([\d,]+\.?\d{0,2})/gi,
    /(.+?)\s+(\d+)\s*@\s*\$?([\d,]+\.?\d{0,2})/gi
  ];
  
  for (const pattern of itemPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[2] && match[2].length > 2) {
        lineItems.push({
          description: match[2].trim(),
          quantity: parseInt(match[1]) || 1,
          total: parseFloat(match[3].replace(',', ''))
        });
      }
    }
    
    // Limit to reasonable number of items
    if (lineItems.length >= 20) break;
  }
  
  return lineItems;
}

/**
 * Format extracted date to ISO format
 */
export function formatExtractedDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

/**
 * Validate extracted data and return confidence scores
 */
export function validateExtractedData(data: ExtractedReceiptData): {
  isValid: boolean;
  fieldScores: Record<string, number>;
  overallScore: number;
} {
  const fieldScores: Record<string, number> = {};
  
  // Vendor name score
  if (data.vendor_name && data.vendor_name.length >= 3) {
    fieldScores.vendor_name = data.vendor_name.length > 10 ? 1 : 0.7;
  } else {
    fieldScores.vendor_name = 0;
  }
  
  // Date score
  if (data.date) {
    const parsed = new Date(data.date);
    fieldScores.date = !isNaN(parsed.getTime()) ? 1 : 0.3;
  } else {
    fieldScores.date = 0;
  }
  
  // Amount score
  if (data.amount !== null && data.amount > 0) {
    fieldScores.amount = data.amount < 100000 ? 1 : 0.5;
  } else {
    fieldScores.amount = 0;
  }
  
  // Invoice number score
  fieldScores.invoice_number = data.invoice_number ? 1 : 0;
  
  // Calculate overall score
  const scores = Object.values(fieldScores);
  const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  return {
    isValid: overallScore >= 0.5,
    fieldScores,
    overallScore
  };
}
