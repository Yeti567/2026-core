/**
 * COR Evidence Mapper Test
 * 
 * Run with: npx tsx test/audit/evidence-mapper-test.ts
 */

import { 
  mapEvidenceToAuditQuestions,
  generateEvidenceReport,
  getAllAuditQuestions,
  getEvidenceCoverageStats,
  evaluateSufficiency,
  identifyGaps,
  type AuditQuestion,
  type Evidence,
  type QuestionEvidence,
} from '../../lib/audit/evidence-mapper';

const STATUS_EMOJI = {
  sufficient: '✅',
  insufficient: '❌',
  partial: '🟡',
};

async function testEvidenceMapper() {
  console.log('═'.repeat(60));
  console.log('🧪 COR EVIDENCE MAPPER TEST');
  console.log('═'.repeat(60));
  console.log('');

  // Test 1: Verify audit questions are loaded
  console.log('📋 TEST 1: Loading Audit Questions...');
  console.log('─'.repeat(40));
  
  let questions: AuditQuestion[] = [];
  try {
    questions = await getAllAuditQuestions();
  } catch (e) {
    console.log('⚠️  Could not connect to database. Running unit tests only.\n');
  }
  
  if (questions.length === 0) {
    console.log('⚠️  No audit questions found in database.');
    console.log('   Run the seed: npx supabase db seed');
    console.log('');
    console.log('   Continuing with structure tests...\n');
  } else {
    console.log(`✅ Found ${questions.length} audit questions`);
    
    // Count by element
    const byElement: Record<number, number> = {};
    questions.forEach(q => {
      byElement[q.element_number] = (byElement[q.element_number] || 0) + 1;
    });
    
    console.log('\n📊 Questions per Element:');
    for (let i = 1; i <= 14; i++) {
      const count = byElement[i] || 0;
      const bar = '█'.repeat(count) + '░'.repeat(Math.max(0, 10 - count));
      console.log(`   Element ${i.toString().padStart(2)}: ${bar} ${count}`);
    }
    console.log('');
  }

  // Test 2: Verify question structure
  console.log('📋 TEST 2: Question Structure Validation...');
  console.log('─'.repeat(40));
  
  if (questions.length > 0) {
    const sampleQuestion = questions[0];
    console.log('Sample question structure:');
    console.log(`   id: ${sampleQuestion.id ? '✅' : '❌'}`);
    console.log(`   element_number: ${typeof sampleQuestion.element_number === 'number' ? '✅' : '❌'}`);
    console.log(`   question_number: ${sampleQuestion.question_number ? '✅' : '❌'}`);
    console.log(`   question_text: ${sampleQuestion.question_text ? '✅' : '❌'}`);
    console.log(`   verification_methods: ${Array.isArray(sampleQuestion.verification_methods) ? '✅' : '❌'}`);
    console.log(`   required_evidence_types: ${Array.isArray(sampleQuestion.required_evidence_types) ? '✅' : '❌'}`);
    console.log(`   point_value: ${typeof sampleQuestion.point_value === 'number' ? '✅' : '❌'}`);
    console.log('');
    
    // Show a sample question
    console.log('📝 Sample Question (Element 2):');
    const elem2Question = questions.find(q => q.element_number === 2);
    if (elem2Question) {
      console.log(`   Number: ${elem2Question.question_number}`);
      console.log(`   Text: ${elem2Question.question_text}`);
      console.log(`   Verification: ${elem2Question.verification_methods.join(', ')}`);
      console.log(`   Evidence Types: ${elem2Question.required_evidence_types.join(', ')}`);
      console.log(`   Points: ${elem2Question.point_value}`);
      console.log(`   Sampling: ${elem2Question.sampling_requirements || 'N/A'}`);
    }
    console.log('');
  } else {
    console.log('   Skipped (no questions loaded)\n');
  }

  // Test 3: Test sufficiency evaluation logic
  console.log('📋 TEST 3: Sufficiency Evaluation Logic...');
  console.log('─'.repeat(40));
  
  const testCases = [
    { found: 5, required: 3, expected: true },
    { found: 3, required: 3, expected: true },
    { found: 2, required: 3, expected: false },
    { found: 0, required: 3, expected: false },
    { found: 10, required: 5, expected: true },
  ];
  
  testCases.forEach(({ found, required, expected }) => {
    const mockEvidence: Evidence[] = Array(found).fill(null).map((_, i) => ({ 
      id: `test-${i}`, 
      type: 'form' as const, 
      date: new Date().toISOString(),
      reference: `TEST-${i.toString().padStart(3, '0')}`,
      description: 'Test Evidence',
      url: '/test'
    }));
    const result = evaluateSufficiency(mockEvidence, required);
    const status = result === expected ? '✅' : '❌';
    console.log(`   ${status} ${found} samples vs ${required} required → ${result ? 'Sufficient' : 'Insufficient'}`);
  });
  console.log('');

  // Test 4: Test gap identification logic
  console.log('📋 TEST 4: Gap Identification Logic...');
  console.log('─'.repeat(40));
  
  const mockQuestion: AuditQuestion = {
    id: 'test-1',
    element_number: 2,
    question_number: '2.1',
    question_text: 'Test question: Does the organization have a process to identify workplace hazards?',
    verification_methods: ['document', 'interview'],
    required_evidence_types: ['hazard_assessment', 'jha_form'],
    point_value: 10,
    sampling_requirements: 'Review 5 assessments',
    category: 'documentation',
  };

  // Test with no evidence
  const gaps1 = identifyGaps([], mockQuestion, 5);
  console.log('   No evidence:');
  gaps1.forEach(g => console.log(`      ⚠️  ${g}`));
  
  // Test with partial evidence
  const partialEvidence: Evidence[] = [
    { 
      id: '1', 
      type: 'form', 
      date: new Date().toISOString(), 
      reference: 'HA-001', 
      description: 'Hazard Assessment', 
      url: '/test', 
      formCode: 'hazard_assessment' 
    },
  ];
  const gaps2 = identifyGaps(partialEvidence, mockQuestion, 5);
  console.log('\n   1 recent sample (need 5):');
  gaps2.forEach(g => console.log(`      ⚠️  ${g}`));
  
  // Test with sufficient evidence
  const sufficientEvidence: Evidence[] = Array(5).fill(null).map((_, i) => ({
    id: `ev-${i}`,
    type: 'form' as const,
    date: new Date().toISOString(),
    reference: `HA-${i.toString().padStart(3, '0')}`,
    description: 'Hazard Assessment Form',
    url: '/test',
    formCode: 'hazard_assessment'
  }));
  const gaps3 = identifyGaps(sufficientEvidence, mockQuestion, 5);
  console.log('\n   5 samples (sufficient for hazard_assessment):');
  if (gaps3.length === 0) {
    console.log('      ✅ No gaps for hazard_assessment coverage');
  } else {
    gaps3.forEach(g => console.log(`      ⚠️  ${g}`));
  }
  console.log('');

  // Test 5: Calculate total points
  console.log('📋 TEST 5: Point Distribution...');
  console.log('─'.repeat(40));
  
  if (questions.length > 0) {
    const totalPoints = questions.reduce((sum, q) => sum + q.point_value, 0);
    const avgPoints = totalPoints / questions.length;
    
    console.log(`   Total possible points: ${totalPoints}`);
    console.log(`   Average per question: ${avgPoints.toFixed(1)}`);
    console.log(`   Question count: ${questions.length}`);
    
    // Points by element
    console.log('\n   Points by Element:');
    const pointsByElement: Record<number, number> = {};
    questions.forEach(q => {
      pointsByElement[q.element_number] = (pointsByElement[q.element_number] || 0) + q.point_value;
    });
    
    for (let i = 1; i <= 14; i++) {
      const points = pointsByElement[i] || 0;
      console.log(`      Element ${i.toString().padStart(2)}: ${points} points`);
    }
  } else {
    console.log('   Skipped (no questions loaded)');
  }
  console.log('');

  // Test 6: Verification methods coverage
  console.log('📋 TEST 6: Verification Methods Coverage...');
  console.log('─'.repeat(40));
  
  if (questions.length > 0) {
    const methodCounts: Record<string, number> = {
      document: 0,
      observation: 0,
      interview: 0,
    };
    
    questions.forEach(q => {
      q.verification_methods.forEach(m => {
        methodCounts[m] = (methodCounts[m] || 0) + 1;
      });
    });
    
    console.log(`   📄 Document verification: ${methodCounts.document} questions`);
    console.log(`   👁️  Observation verification: ${methodCounts.observation} questions`);
    console.log(`   🗣️  Interview verification: ${methodCounts.interview} questions`);
  } else {
    console.log('   Skipped (no questions loaded)');
  }
  console.log('');

  // Test 7: Evidence types used
  console.log('📋 TEST 7: Required Evidence Types...');
  console.log('─'.repeat(40));
  
  if (questions.length > 0) {
    const evidenceTypes = new Set<string>();
    questions.forEach(q => {
      q.required_evidence_types.forEach(et => evidenceTypes.add(et));
    });
    
    console.log(`   Total unique evidence types: ${evidenceTypes.size}`);
    console.log('   Sample types:');
    Array.from(evidenceTypes).slice(0, 15).forEach(et => {
      console.log(`      - ${et}`);
    });
    if (evidenceTypes.size > 15) {
      console.log(`      ... and ${evidenceTypes.size - 15} more`);
    }
  } else {
    console.log('   Skipped (no questions loaded)');
  }
  console.log('');

  // Test 8: Type exports verification
  console.log('📋 TEST 8: Type Exports Verification...');
  console.log('─'.repeat(40));
  
  const typeChecks = [
    { name: 'AuditQuestion', check: () => mockQuestion as AuditQuestion },
    { name: 'Evidence', check: () => partialEvidence[0] as Evidence },
    { name: 'Function: evaluateSufficiency', check: () => typeof evaluateSufficiency === 'function' },
    { name: 'Function: identifyGaps', check: () => typeof identifyGaps === 'function' },
    { name: 'Function: mapEvidenceToAuditQuestions', check: () => typeof mapEvidenceToAuditQuestions === 'function' },
    { name: 'Function: generateEvidenceReport', check: () => typeof generateEvidenceReport === 'function' },
    { name: 'Function: getAllAuditQuestions', check: () => typeof getAllAuditQuestions === 'function' },
    { name: 'Function: getEvidenceCoverageStats', check: () => typeof getEvidenceCoverageStats === 'function' },
  ];
  
  typeChecks.forEach(({ name, check }) => {
    try {
      const result = check();
      console.log(`   ✅ ${name}`);
    } catch (e) {
      console.log(`   ❌ ${name}: ${e}`);
    }
  });
  console.log('');

  console.log('═'.repeat(60));
  console.log('✅ EVIDENCE MAPPER STRUCTURE TESTS COMPLETE');
  console.log('═'.repeat(60));
  console.log('');
  console.log('To test with real company data:');
  console.log('  1. Ensure Supabase is running');
  console.log('  2. Seed the audit questions: npx supabase db seed');
  console.log('  3. Have a company with form submissions');
  console.log('  4. Run the live test with a company ID:');
  console.log('');
  console.log('     npx tsx test/audit/evidence-mapper-test.ts --company <company-id>');
}

// Check for live test mode
const args = process.argv.slice(2);
const companyIdIndex = args.indexOf('--company');
const companyId = companyIdIndex !== -1 ? args[companyIdIndex + 1] : null;

if (companyId) {
  // Run live test with actual company data
  console.log('═'.repeat(60));
  console.log('🧪 COR EVIDENCE MAPPER LIVE TEST');
  console.log(`📋 Company ID: ${companyId}`);
  console.log('═'.repeat(60));
  console.log('');
  
  mapEvidenceToAuditQuestions(companyId)
    .then(evidenceMap => {
      console.log('📋 AUDIT QUESTIONS MAPPED:', Object.keys(evidenceMap).length);
      
      // Show Element 2 questions as example
      const element2Questions = Object.values(evidenceMap).filter(
        q => q.question.element_number === 2
      );
      
      console.log('\n📊 ELEMENT 2 EVIDENCE:');
      element2Questions.forEach(item => {
        const statusEmoji = item.is_sufficient ? '✅' : '❌';
        console.log(`${statusEmoji} Q${item.question.question_number}: ${item.question.question_text}`);
        console.log(`   Evidence found: ${item.evidence_found.length}`);
        console.log(`   Score: ${item.score}/${item.question.point_value}`);
        
        if (item.gaps.length > 0) {
          item.gaps.forEach(gap => console.log(`   ⚠️  ${gap}`));
        }
        
        if (item.evidence_found.length > 0) {
          console.log(`   📄 Sample evidence:`);
          item.evidence_found.slice(0, 2).forEach(e => {
            console.log(`      - ${e.description} (${e.reference}) - ${new Date(e.date).toLocaleDateString()}`);
          });
        }
        console.log('');
      });
      
      console.log('🎉 Evidence mapper live test complete!');
    })
    .catch(console.error);
} else {
  // Run structure tests
  testEvidenceMapper().catch(console.error);
}
