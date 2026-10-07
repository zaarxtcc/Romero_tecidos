const SUPABASE_URL = "https://lzztvhyhrhwdxkrmuabt.supabase.co";

const SUPABASE_KEY = "sb_publishable_8wPNXLanM-3LiGIoPj1ZHA_GR8Rye53";

window.supabasePublico = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);