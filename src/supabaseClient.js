import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xsukqhvchoknflfqolgy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzdWtxaHZjaG9rbmZsZnFvbGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNDAxNDAsImV4cCI6MjA2ODcxNjE0MH0.MZd2NtioXJDnPgfKQWG_TZeNsemxWv1voLupv3X82zc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
