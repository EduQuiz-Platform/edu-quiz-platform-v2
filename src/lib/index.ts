// Main Supabase client and exports
export { supabase } from './supabase';
export { supabase as supabaseEnhanced, SupabaseService, TABLES, STORAGE_BUCKETS, uploadFile, getPublicUrl } from './supabase-enhanced';

// Re-export all types from supabase
export type * from './supabase';
// Re-export all types from supabase-enhanced
export type * from './supabase-enhanced';