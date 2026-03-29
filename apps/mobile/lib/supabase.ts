import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://wrduytomojpmymcjmvwh.supabase.co';
const supabaseKey = Constants.expoConfig?.extra?.supabaseKey || 'sb_publishable_Qviz7W3gktEZNRhWpSBmCQ_LzOaP0OM';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
