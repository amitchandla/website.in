(function () {
  const cfg = window.BIZGROW_CONFIG || {};
  const url = String(cfg.SUPABASE_URL || "").trim();
  const key = String(cfg.SUPABASE_ANON_KEY || "").trim();
  if (!url || !key || url.includes("YOUR-PROJECT") || key.includes("YOUR-SUPABASE")) { console.error("[BizGrow AI] Supabase configuration is missing."); window.supabaseClient=null; return; }
  if (!window.supabase || typeof window.supabase.createClient !== "function") { console.error("[BizGrow AI] Supabase JS library did not load."); window.supabaseClient=null; return; }
  window.supabaseClient = window.supabase.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
})();
