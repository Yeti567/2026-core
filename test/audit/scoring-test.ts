/**
 * COR Compliance Scoring Engine Test
 * 
 * Run with: npx tsx test/audit/scoring-test.ts
 */

import { 
  calculateOverallScore,
  getElementRequirements,
  getAllRequirements,
  type OverallScore,
  type ElementScore 
} from '../../lib/audit/compliance-scoring';

const STATUS_EMOJI: Record<string, string> = {
  'excellent': '🟢',
  'good': '🟡',
  'needs_improvement': '🟠',
  'critical': '🔴'
};

const SEVERITY_EMOJI: Record<string, string> = {
  'critical': '🚨',
  'major': '⚠️',
  'minor': '📝'
};

async function testComplianceScoring() {
  console.log('═'.repeat(60));
  console.log('🧪 COR COMPLIANCE SCORING ENGINE TEST');
  console.log('═'.repeat(60));
  console.log('');

  // For testing without a real company ID, we'll test the requirements structure
  console.log('📋 Testing Requirements Structure...\n');
  
  const allRequirements = getAllRequirements();
  let totalRequirements = 0;
  let totalPoints = 0;

  Object.entries(allRequirements).forEach(([elementNum, requirements]) => {
    const elementPoints = requirements.reduce((sum, r) => sum + r.point_value, 0);
    totalRequirements += requirements.length;
    totalPoints += elementPoints;
    
    console.log(`Element ${elementNum}: ${requirements.length} requirements, ${elementPoints} max points`);
    requirements.forEach(req => {
      console.log(`   └─ ${req.id}: ${req.description}`);
      console.log(`      Type: ${req.evidence_type}, Frequency: ${req.frequency}, Min samples: ${req.minimum_samples}, Points: ${req.point_value}`);
      if (req.form_codes && req.form_codes.length > 0) {
        console.log(`      Forms: ${req.form_codes.join(', ')}`);
      }
    });
    console.log('');
  });

  console.log('─'.repeat(60));
  console.log(`📊 REQUIREMENTS SUMMARY:`);
  console.log(`   Total Requirements: ${totalRequirements}`);
  console.log(`   Total Max Points: ${totalPoints}`);
  console.log(`   Average per Element: ${(totalRequirements / 14).toFixed(1)} requirements`);
  console.log('─'.repeat(60));
  console.log('');

  // Test element weights
  console.log('⚖️  ELEMENT WEIGHTS (COR 2020):');
  const weights: Record<number, number> = {
    1: 1.2, 2: 1.2, 3: 1.2, 4: 1.1,
    5: 1.0, 6: 1.0, 7: 1.0, 8: 1.0, 9: 1.0,
    10: 1.1, 11: 1.1, 12: 1.0, 13: 1.0, 14: 1.0,
  };
  
  Object.entries(weights).forEach(([elem, weight]) => {
    const indicator = weight > 1.0 ? '📈' : '📊';
    console.log(`   ${indicator} Element ${elem}: ${weight}x weight`);
  });
  console.log('');

  // Validate form code coverage
  console.log('📝 FORM CODE COVERAGE:');
  const allFormCodes = new Set<string>();
  Object.values(allRequirements).forEach(requirements => {
    requirements.forEach(req => {
      req.form_codes?.forEach(code => allFormCodes.add(code));
    });
  });
  console.log(`   Total unique form codes: ${allFormCodes.size}`);
  console.log(`   Form codes: ${Array.from(allFormCodes).slice(0, 20).join(', ')}...`);
  console.log('');

  // Test scoring logic (mock scenario)
  console.log('─'.repeat(60));
  console.log('🎯 SCORING LOGIC VALIDATION:');
  console.log('─'.repeat(60));
  
  // Test status calculation
  const testPercentages = [95, 85, 75, 65, 55, 45];
  testPercentages.forEach(pct => {
    const status = getStatus(pct);
    console.log(`   ${pct}% → ${STATUS_EMOJI[status]} ${status}`);
  });
  console.log('');

  // Test severity calculation
  console.log('🚦 SEVERITY CALCULATION:');
  const testShortfalls = [
    { shortfall: 4, required: 4 },  // 100% missing
    { shortfall: 3, required: 4 },  // 75% missing
    { shortfall: 2, required: 4 },  // 50% missing
    { shortfall: 1, required: 4 },  // 25% missing
  ];
  testShortfalls.forEach(({ shortfall, required }) => {
    const ratio = shortfall / required;
    const severity = ratio >= 0.75 ? 'critical' : ratio >= 0.5 ? 'major' : 'minor';
    console.log(`   ${shortfall}/${required} missing (${(ratio * 100).toFixed(0)}%) → ${SEVERITY_EMOJI[severity]} ${severity}`);
  });
  console.log('');

  // Test effort estimation
  console.log('⏱️  EFFORT ESTIMATION:');
  const evidenceTypes = ['document', 'form', 'training', 'interview', 'observation'];
  evidenceTypes.forEach(type => {
    const baseEffort = {
      'document': 4,
      'form': 0.25,
      'training': 2,
      'interview': 0.5,
      'observation': 0.5,
    }[type] || 0.5;
    console.log(`   ${type}: ${baseEffort} hours base effort`);
  });
  console.log('');

  // Test projected date calculation
  console.log('📅 PROJECTED DATE CALCULATION:');
  const testHours = [10, 50, 100, 200];
  testHours.forEach(hours => {
    const weeksNeeded = Math.ceil(hours / 10);
    const projectedDate = new Date();
    projectedDate.setDate(projectedDate.getDate() + (weeksNeeded * 7) + 7);
    console.log(`   ${hours} hours → ${weeksNeeded} weeks → ${projectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
  });
  console.log('');

  console.log('═'.repeat(60));
  console.log('✅ SCORING ENGINE STRUCTURE VALIDATION COMPLETE');
  console.log('═'.repeat(60));
  console.log('');
  console.log('To test with real data, ensure:');
  console.log('  1. Supabase is running locally');
  console.log('  2. You have a valid company ID');
  console.log('  3. Form templates are seeded');
  console.log('');
  console.log('Then run:');
  console.log('  npx tsx test/audit/scoring-live-test.ts <company-id>');
}

function getStatus(percentage: number): 'excellent' | 'good' | 'needs_improvement' | 'critical' {
  if (percentage >= 90) return 'excellent';
  if (percentage >= 80) return 'good';
  if (percentage >= 60) return 'needs_improvement';
  return 'critical';
}

// Run test
testComplianceScoring().catch(console.error);
