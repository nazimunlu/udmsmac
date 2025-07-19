import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xsukqhvchoknflfqolgy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzdWtxaHZjaG9rbmZsZnFvbGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MzgyNjAsImV4cCI6MjA2ODUxNDI2MH0.LDKHW1VvG4a-1UiFYY2spIKKYomRB_22h0Wb0t3DiB8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
