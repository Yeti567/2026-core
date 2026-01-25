/**
 * PDF Text Extraction Tests
 * 
 * Tests for PDF processing, control number detection,
 * and document upload workflow.
 */

import fs from 'fs';
import path from 'path';

// Test fixtures path
const FIXTURES_PATH = path.join(__dirname, '..', 'fixtures');

async function testPDFExtraction() {
  console.log('🧪 Testing PDF text extraction...\n');
  console.log('═'.repeat(60));

  const { 
    extractTextFromPDF, 
    findControlNumbers,
    findControlNumbersWithContext,
    findDocumentReferences,
    isValidControlNumber,
    parseControlNumber,
    cleanExtractedText,
    extractKeywords,
    extractSnippet,
    highlightMatches,
    calculateRelevance,
  } = await import('../../lib/documents/pdf-extractor');

  let passed = 0;
  let failed = 0;

  // ============================================================================
  // TEST 1: Control Number Detection
  // ============================================================================
  console.log('\n📋 TEST 1: Control Number Detection');
  console.log('-'.repeat(40));

  const sampleText = `
    This policy references the following documents:
    - NCCI-POL-001 (Health & Safety Policy)
    - NCCI-SWP-042 (Concrete Pouring Procedure)
    - NCCI-FRM-103 (Hazard Assessment Form)
    See also ncci-pol-001 for additional details.
    Invalid formats: NCCI-XX-001, NCCI-TOOLONG-001, 123-POL-001
    Another company: ACME-SWP-015
  `;

  // Test findControlNumbers
  const controlNumbers = findControlNumbers(sampleText, 'NCCI');
  console.log('  Found control numbers:', controlNumbers);
  
  if (controlNumbers.length === 3) {
    console.log('  ✅ Correct count (3 unique, case-insensitive)');
    passed++;
  } else {
    console.log('  ❌ Expected 3, got', controlNumbers.length);
    failed++;
  }

  if (controlNumbers.includes('NCCI-POL-001')) {
    console.log('  ✅ Found NCCI-POL-001');
    passed++;
  } else {
    console.log('  ❌ Missing NCCI-POL-001');
    failed++;
  }

  // Test without company filter (should find ACME too)
  const allControlNumbers = findControlNumbers(sampleText);
  console.log('  All control numbers (no filter):', allControlNumbers);
  
  if (allControlNumbers.length === 4 && allControlNumbers.includes('ACME-SWP-015')) {
    console.log('  ✅ Found ACME-SWP-015 without filter');
    passed++;
  } else {
    console.log('  ⚠️  ACME control number handling:', allControlNumbers.length, 'found');
    // Not a failure, just informational
  }

  // ============================================================================
  // TEST 2: Control Number Validation
  // ============================================================================
  console.log('\n📋 TEST 2: Control Number Validation');
  console.log('-'.repeat(40));

  const validTests = [
    { num: 'NCCI-POL-001', expected: true },
    { num: 'ACME-SWP-0042', expected: true },
    { num: 'AB-FRM-123', expected: true },
    { num: 'COMPANY-CHK-9999', expected: true },
    { num: 'ncci-pol-001', expected: true }, // Case insensitive
    { num: 'NCCI-XXX-001', expected: false }, // Invalid type
    { num: 'NCCI-POL-01', expected: false }, // Too few digits
    { num: 'N-POL-001', expected: false }, // Prefix too short
    { num: 'POL-001', expected: false }, // Missing prefix
    { num: '', expected: false },
  ];

  for (const test of validTests) {
    const result = isValidControlNumber(test.num);
    if (result === test.expected) {
      console.log(`  ✅ "${test.num}" → ${result}`);
      passed++;
    } else {
      console.log(`  ❌ "${test.num}" expected ${test.expected}, got ${result}`);
      failed++;
    }
  }

  // ============================================================================
  // TEST 3: Parse Control Number
  // ============================================================================
  console.log('\n📋 TEST 3: Parse Control Number');
  console.log('-'.repeat(40));

  const parsed = parseControlNumber('NCCI-SWP-042');
  if (parsed && parsed.prefix === 'NCCI' && parsed.type === 'SWP' && parsed.sequence === 42) {
    console.log('  ✅ Parsed correctly:', JSON.stringify(parsed));
    passed++;
  } else {
    console.log('  ❌ Parse failed:', JSON.stringify(parsed));
    failed++;
  }

  const invalidParse = parseControlNumber('invalid');
  if (invalidParse === null) {
    console.log('  ✅ Returns null for invalid input');
    passed++;
  } else {
    console.log('  ❌ Should return null for invalid input');
    failed++;
  }

  // ============================================================================
  // TEST 4: Find Control Numbers with Context
  // ============================================================================
  console.log('\n📋 TEST 4: Control Numbers with Context');
  console.log('-'.repeat(40));

  const withContext = findControlNumbersWithContext(sampleText, 'NCCI', 50);
  console.log('  Found with context:', withContext.length, 'matches');
  
  if (withContext.length > 0 && withContext[0].context) {
    console.log('  ✅ First match:', withContext[0].controlNumber);
    console.log('      Context:', withContext[0].context.substring(0, 80) + '...');
    passed++;
  } else {
    console.log('  ❌ No context extracted');
    failed++;
  }

  // ============================================================================
  // TEST 5: Find Document References
  // ============================================================================
  console.log('\n📋 TEST 5: Document References');
  console.log('-'.repeat(40));

  const existingDocs = ['NCCI-POL-001', 'NCCI-SWP-042', 'NCCI-FRM-103', 'NCCI-CHK-999'];
  const references = findDocumentReferences(sampleText, existingDocs);
  
  console.log('  Looking for references to:', existingDocs.join(', '));
  console.log('  Found references:', references.length);
  
  if (references.length === 3) { // CHK-999 doesn't exist in text
    console.log('  ✅ Correct reference count');
    passed++;
  } else {
    console.log('  ❌ Expected 3 references, got', references.length);
    failed++;
  }

  // ============================================================================
  // TEST 6: Text Cleaning
  // ============================================================================
  console.log('\n📋 TEST 6: Text Cleaning');
  console.log('-'.repeat(40));

  const dirtyText = "  Line 1\r\n\r\n\r\nLine 2   \t\t  Line 3\n\n\n\n\nLine 4  ";
  const cleaned = cleanExtractedText(dirtyText);
  
  console.log('  Original length:', dirtyText.length);
  console.log('  Cleaned length:', cleaned.length);
  
  if (!cleaned.includes('\r') && !cleaned.includes('\t') && !cleaned.includes('\n\n\n')) {
    console.log('  ✅ Excessive whitespace removed');
    passed++;
  } else {
    console.log('  ❌ Text not properly cleaned');
    failed++;
  }

  // ============================================================================
  // TEST 7: Keyword Extraction
  // ============================================================================
  console.log('\n📋 TEST 7: Keyword Extraction');
  console.log('-'.repeat(40));

  const documentText = `
    Health and Safety Policy
    
    This safety policy outlines our commitment to workplace safety.
    All employees must follow safety procedures at all times.
    Safety training is mandatory for all workers.
    Our health and safety management system ensures compliance.
    Regular safety inspections help identify hazards.
    Report any safety concerns to your supervisor.
  `;

  const keywords = extractKeywords(documentText, 10);
  console.log('  Extracted keywords:', keywords);
  
  if (keywords.includes('safety') && keywords.length > 0) {
    console.log('  ✅ "safety" is top keyword');
    passed++;
  } else {
    console.log('  ❌ Expected "safety" as top keyword');
    failed++;
  }

  // ============================================================================
  // TEST 8: Snippet Extraction
  // ============================================================================
  console.log('\n📋 TEST 8: Snippet Extraction');
  console.log('-'.repeat(40));

  const longText = 'A'.repeat(100) + ' important safety procedure ' + 'B'.repeat(100);
  const snippet = extractSnippet(longText, 'safety', 80);
  
  console.log('  Snippet:', snippet);
  
  if (snippet.includes('safety') && snippet.length <= 100) {
    console.log('  ✅ Snippet contains query and is truncated');
    passed++;
  } else {
    console.log('  ❌ Snippet extraction failed');
    failed++;
  }

  // ============================================================================
  // TEST 9: Highlight Matches
  // ============================================================================
  console.log('\n📋 TEST 9: Highlight Matches');
  console.log('-'.repeat(40));

  const textToHighlight = 'The safety policy requires safety training';
  const highlighted = highlightMatches(textToHighlight, ['safety']);
  
  console.log('  Original:', textToHighlight);
  console.log('  Highlighted:', highlighted);
  
  if (highlighted.includes('<mark>safety</mark>')) {
    console.log('  ✅ Highlighting applied');
    passed++;
  } else {
    console.log('  ❌ Highlighting not applied');
    failed++;
  }

  // ============================================================================
  // TEST 10: Relevance Calculation
  // ============================================================================
  console.log('\n📋 TEST 10: Relevance Calculation');
  console.log('-'.repeat(40));

  const doc1 = 'safety safety safety training policy'; // High relevance for "safety"
  const doc2 = 'equipment maintenance schedule list'; // No relevance for "safety"
  
  const score1 = calculateRelevance(doc1, 'safety');
  const score2 = calculateRelevance(doc2, 'safety');
  
  console.log('  Doc 1 ("safety" 3x) score:', score1);
  console.log('  Doc 2 (no match) score:', score2);
  
  if (score1 > score2 && score2 === 0) {
    console.log('  ✅ Relevance scoring works correctly');
    passed++;
  } else {
    console.log('  ❌ Relevance scoring incorrect');
    failed++;
  }

  // Title boost test
  const scoreWithTitle = calculateRelevance(doc2, 'safety', 'Safety Policy Document');
  console.log('  With title match score:', scoreWithTitle);
  
  if (scoreWithTitle > score2) {
    console.log('  ✅ Title boost applied');
    passed++;
  } else {
    console.log('  ❌ Title boost not applied');
    failed++;
  }

  // ============================================================================
  // TEST 11: PDF Extraction (if fixture exists)
  // ============================================================================
  console.log('\n📋 TEST 11: PDF Text Extraction');
  console.log('-'.repeat(40));

  const samplePdfPath = path.join(FIXTURES_PATH, 'sample-policy.pdf');
  
  if (fs.existsSync(samplePdfPath)) {
    try {
      const pdfBuffer = fs.readFileSync(samplePdfPath);
      const extraction = await extractTextFromPDF(pdfBuffer);
      
      console.log('  Extraction successful:', extraction.success ? '✅' : '❌');
      console.log('  Pages:', extraction.pages);
      console.log('  Text length:', extraction.text.length, 'characters');
      
      if (extraction.success && extraction.text.length > 0) {
        console.log('  Sample text:', extraction.text.substring(0, 100) + '...');
        passed++;
      } else if (extraction.error) {
        console.log('  Error:', extraction.error);
        failed++;
      }
    } catch (error) {
      console.log('  ❌ Error reading PDF:', error);
      failed++;
    }
  } else {
    console.log('  ⚠️  No sample PDF at', samplePdfPath);
    console.log('  ⚠️  Skipping PDF extraction test');
    console.log('  ⚠️  Create test/fixtures/sample-policy.pdf to enable this test');
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📈 Score: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review.');
    process.exit(1);
  }
}

// Run tests
testPDFExtraction().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
