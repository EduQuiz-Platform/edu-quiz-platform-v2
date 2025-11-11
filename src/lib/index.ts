// Main Supabase client and exports
export { supabase, UserRole, Profile } from './supabase';
export { supabase as supabaseEnhanced, SupabaseService, TABLES, STORAGE_BUCKETS, uploadFile, getPublicUrl } from './supabase-enhanced';

// Re-export types for convenience
export type * from './supabase';
export type * from './supabase-enhanced';