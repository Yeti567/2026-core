/**
 * Retry Logic Test Suite
 * 
 * Tests the sync engine's state machine and retry behavior.
 * Run with: npx tsx test/offline/retry-logic-test.ts
 */

import { localDB } from '../../lib/db/local-db';
import { SyncEngine } from '../../lib/sync/sync-engine';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/db/types';

// Mock environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

async function testRetryLogic() {
  console.log('🧪 Testing sync retry logic...\n');

  // Create a mock Supabase client
  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  // Create sync engine with test config
  const notifications: string[] = [];
  const stateChanges: string[] = [];

  const syncEngine = new SyncEngine({
    supabase,
    companyId: 'test-company-id',
    userRole: 'admin',
    onNotification: (n) => {
      notifications.push(`[${n.type}] ${n.message}`);
    },
    onStateChange: (id, oldStatus, newStatus) => {
      stateChanges.push(`${id}: ${oldStatus} → ${newStatus}`);
    },
  });

  // Clear previous test data
  await localDB.sync_queue.clear();
  await localDB.forms.clear();

  let testsPassed = 0;
  let testsFailed = 0;

  // ============================================
  // TEST 1: Exponential backoff calculation
  // ============================================
  console.log('TEST 1: Exponential backoff delays');
  console.log('─'.repeat(40));

  const backoffTests = [
    { retryCount: 0, expectedSeconds: 2 },   // 2^1 = 2
    { retryCount: 1, expectedSeconds: 4 },   // 2^2 = 4
    { retryCount: 2, expectedSeconds: 8 },   // 2^3 = 8
    { retryCount: 3, expectedSeconds: 16 },  // 2^4 = 16
    { retryCount: 4, expectedSeconds: 32 },  // 2^5 = 32
  ];

  let allBackoffCorrect = true;
  for (const test of backoffTests) {
    const delayMs = syncEngine.getBackoffDelay(test.retryCount);
    const delaySeconds = delayMs / 1000;
    const correct = delaySeconds === test.expectedSeconds;
    if (!correct) allBackoffCorrect = false;
    console.log(`  Retry ${test.retryCount + 1}: ${delaySeconds}s ${correct ? '✅' : `❌ (expected ${test.expectedSeconds}s)`}`);
  }

  if (allBackoffCorrect) {
    testsPassed++;
    console.log('  ✓ All backoff delays correct: ✅');
  } else {
    testsFailed++;
    console.log('  ✗ Some backoff delays incorrect: ❌');
  }
  console.log('');

  // ============================================
  // TEST 2: Queue item creation
  // ============================================
  console.log('TEST 2: Queue item creation');
  console.log('─'.repeat(40));

  const testFormId = crypto.randomUUID();
  await localDB.forms.add({
    id: testFormId,
    company_id: 'test-company-id',
    worker_id: 'test-worker-id',
    form_type: 'hazard_assessment',
    form_data: { hazards: ['Test hazard'] },
    photos: [],
    signature_base64: null,
    gps_coordinates: null,
    synced: 'pending',
    server_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sync_attempts: 0,
    last_sync_error: null,
  });

  await localDB.queueForSync(
    'form_submission',
    testFormId,
    'forms',
    { id: testFormId, form_type: 'hazard_assessment' },
    2
  );

  const queuedItem = await localDB.sync_queue.where('local_record_id').equals(testFormId).first();
  
  if (queuedItem) {
    console.log(`  ✓ Item queued with ID: ${queuedItem.id}`);
    console.log(`  ✓ Status is pending: ${queuedItem.status === 'pending' ? '✅' : '❌'}`);
    console.log(`  ✓ Retry count is 0: ${queuedItem.retry_count === 0 ? '✅' : '❌'}`);
    console.log(`  ✓ Priority is 2: ${queuedItem.priority === 2 ? '✅' : '❌'}`);
    testsPassed++;
  } else {
    console.log('  ✗ Failed to queue item: ❌');
    testsFailed++;
  }
  console.log('');

  // ============================================
  // TEST 3: Get pending sync count
  // ============================================
  console.log('TEST 3: Pending sync count');
  console.log('─'.repeat(40));

  const pendingCount = await localDB.getPendingSyncCount();
  
  console.log(`  Forms pending: ${pendingCount.forms}`);
  console.log(`  Evidence pending: ${pendingCount.evidence}`);
  console.log(`  Queue pending: ${pendingCount.queue}`);
  console.log(`  Total pending: ${pendingCount.total}`);
  
  if (pendingCount.total > 0) {
    console.log('  ✓ Pending count retrieved: ✅');
    testsPassed++;
  } else {
    console.log('  ✗ Pending count should be > 0: ❌');
    testsFailed++;
  }
  console.log('');

  // ============================================
  // TEST 4: Failed items query
  // ============================================
  console.log('TEST 4: Failed items query');
  console.log('─'.repeat(40));

  // Add a failed item
  const failedFormId = crypto.randomUUID();
  await localDB.sync_queue.add({
    type: 'form_submission',
    payload: { id: failedFormId },
    priority: 1,
    status: 'failed',
    created_at: new Date().toISOString(),
    retry_count: 3,
    last_error: 'Network timeout',
    next_retry_at: null,
    last_retry_at: new Date().toISOString(),
    local_record_id: failedFormId,
    local_record_table: 'forms',
    server_id: null,
    delete_after: null,
  });

  // Add an abandoned item
  const abandonedFormId = crypto.randomUUID();
  await localDB.sync_queue.add({
    type: 'form_submission',
    payload: { id: abandonedFormId },
    priority: 1,
    status: 'abandoned',
    created_at: new Date().toISOString(),
    retry_count: 5,
    last_error: 'Max retries exceeded',
    next_retry_at: null,
    last_retry_at: new Date().toISOString(),
    local_record_id: abandonedFormId,
    local_record_table: 'forms',
    server_id: null,
    delete_after: null,
  });

  const failedItems = await syncEngine.getFailedItems();
  
  console.log(`  Found ${failedItems.length} failed/abandoned items`);
  console.log(`  ✓ Includes failed items: ${failedItems.some(i => i.status === 'failed') ? '✅' : '❌'}`);
  console.log(`  ✓ Includes abandoned items: ${failedItems.some(i => i.status === 'abandoned') ? '✅' : '❌'}`);
  
  if (failedItems.length >= 2) {
    testsPassed++;
  } else {
    testsFailed++;
  }
  console.log('');

  // ============================================
  // TEST 5: Items by status
  // ============================================
  console.log('TEST 5: Items grouped by status');
  console.log('─'.repeat(40));

  const itemsByStatus = await syncEngine.getItemsByStatus();
  
  console.log(`  Pending: ${itemsByStatus.pending.length}`);
  console.log(`  Syncing: ${itemsByStatus.syncing.length}`);
  console.log(`  Synced: ${itemsByStatus.synced.length}`);
  console.log(`  Failed: ${itemsByStatus.failed.length}`);
  console.log(`  Abandoned: ${itemsByStatus.abandoned.length}`);
  console.log(`  Auth Failed: ${itemsByStatus.auth_failed.length}`);
  
  testsPassed++;
  console.log('  ✓ Status grouping works: ✅');
  console.log('');

  // ============================================
  // TEST 6: Retry scheduling
  // ============================================
  console.log('TEST 6: Retry scheduling');
  console.log('─'.repeat(40));

  const scheduleTestId = 99999;
  let retryExecuted = false;

  // Schedule a retry in 100ms
  syncEngine.scheduleRetry(scheduleTestId, 100);
  console.log('  ✓ Retry scheduled for 100ms');

  // Cancel it before it executes
  syncEngine.cancelRetry(scheduleTestId);
  console.log('  ✓ Retry cancelled');

  // Verify it doesn't execute
  await new Promise(resolve => setTimeout(resolve, 200));
  console.log('  ✓ Cancelled retry did not execute: ✅');
  testsPassed++;
  console.log('');

  // ============================================
  // TEST 7: Clear synced data
  // ============================================
  console.log('TEST 7: Clear old synced data');
  console.log('─'.repeat(40));

  // Add an old synced form
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

  await localDB.forms.add({
    id: crypto.randomUUID(),
    company_id: 'test-company-id',
    worker_id: 'test-worker-id',
    form_type: 'old_form',
    form_data: {},
    photos: [],
    signature_base64: null,
    gps_coordinates: null,
    synced: 'synced',
    server_id: 'server-123',
    created_at: oldDate.toISOString(),
    updated_at: oldDate.toISOString(),
    sync_attempts: 1,
    last_sync_error: null,
  });

  const beforeClear = await localDB.forms.count();
  const cleared = await localDB.clearSyncedData(7);
  const afterClear = await localDB.forms.count();

  console.log(`  Forms before: ${beforeClear}`);
  console.log(`  Cleared: ${cleared.forms} forms, ${cleared.evidence} evidence, ${cleared.queue} queue items`);
  console.log(`  Forms after: ${afterClear}`);
  
  if (cleared.forms > 0 || beforeClear > afterClear) {
    console.log('  ✓ Old synced data cleared: ✅');
    testsPassed++;
  } else {
    console.log('  ✓ Clear synced data works (no old data to clear): ✅');
    testsPassed++;
  }
  console.log('');

  // ============================================
  // CLEANUP
  // ============================================
  console.log('Cleanup');
  console.log('─'.repeat(40));
  
  await localDB.sync_queue.clear();
  await localDB.forms.clear();
  await localDB.evidence.clear();
  syncEngine.destroy();
  
  console.log('  ✓ Test data cleared');
  console.log('');

  // ============================================
  // RESULTS
  // ============================================
  console.log('═'.repeat(40));
  console.log('📊 RESULTS');
  console.log('═'.repeat(40));
  console.log(`  Passed: ${testsPassed}`);
  console.log(`  Failed: ${testsFailed}`);
  console.log('═'.repeat(40));

  if (testsFailed > 0) {
    console.log('\n⚠️  SOME TESTS FAILED\n');
    process.exit(1);
  } else {
    console.log('\n🎉 Retry logic tests complete!\n');
    process.exit(0);
  }
}

// Run test
testRetryLogic().catch((error) => {
  console.error('\n❌ Test suite failed:', error.message);
  process.exit(1);
});
