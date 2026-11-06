import { createClient } from "@supabase/supabase-js";
import { createPublicDataFetch } from '@/lib/public-data-fetch';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing required Supabase environment variables. " +
    "Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment."
  );
}

const publicGateway = import.meta.env.VITE_PUBLIC_DATA_URL ??
  (supabaseUrl === 'https://mpqphroecgfwonclmkyb.supabase.co' ? 'https://unseen-data.unseen-deboshoot.workers.dev' : '');
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: createPublicDataFetch(supabaseUrl, supabaseAnonKey, publicGateway) },
});
