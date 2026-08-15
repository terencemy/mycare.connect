import { createClient } from '@supabase/supabase-js';

// User's Supabase Project Configuration
const RAW_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  'https://jjaduhfcetzhzwmcjuri.supabase.co';

const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYWR1aGZjZXR6aHp3bWNqdXJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2OTYwMDksImV4cCI6MjEwMjI3MjAwOX0.eUCwj5RC-Tixnte7RrEDyUQ3FbY_WufP3MaVkQVsaek';

// Automatically normalize URL by stripping any appended '/rest/v1' or trailing slashes
const sanitizeSupabaseUrl = (url: string) => {
  if (!url) return 'https://jjaduhfcetzhzwmcjuri.supabase.co';
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
};

export const SUPABASE_URL = sanitizeSupabaseUrl(RAW_URL);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
