// Supabase connection for sign-in and sync.
// Find both values in Supabase: Project Settings → API (or the "Connect" button).
// The publishable/anon key is meant to be public; row-level security keeps each
// person's data private. Never put the secret/service_role key here.
// Leave either value empty to run Polymath in local-only mode.
window.POLYMATH_CONFIG = {
  supabaseUrl: "https://vfzqlopfwyzolagaeygs.supabase.co",  // e.g. "https://abcdefghijkl.supabase.co"
  supabaseKey: "sb_publishable_ZE6i_GWFW1x2YFkoU-Mqlg_C-kq-st3",  // the publishable key (sb_publishable_…) or the legacy anon key
};
