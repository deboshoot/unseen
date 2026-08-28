import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "https://mpqphroecgfwonclmkyb.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "sb_publishable_BWGWu1l2rJqnj0g4DbGR2w_5CwDsEUa";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
