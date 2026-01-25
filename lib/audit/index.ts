// Audit module exports - CLIENT-SAFE only
// Do NOT export server-side modules that use next/headers here

// Client-safe exports
export * from './types';
export * from './utils';
export * from './mock-audit-prompts';
export * from './interview-questions';
export * from './mock-interview';

// Note: The following modules use server-side Supabase client and should be 
// imported directly in server components or API routes:
// - compliance-scoring
// - evidence-mapper
// - package-generator  
// - action-plan-generator
// - document-evidence-finder
// - converted-forms-evidence
