import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://eqqixsdgyzvuabgjiiyv.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxcWl4c2RneXp2dWFiZ2ppaXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDg4NjMsImV4cCI6MjA4ODEyNDg2M30.CXL05_exOgfF3pBtGJYfwMZtXW2Uj_ba2U1H88LBsKw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,        // 토큰을 AsyncStorage에 저장 → 앱 재시작해도 자동로그인
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
