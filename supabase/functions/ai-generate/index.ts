// =========================================================
// BizGrow AI — ai-generate Edge Function
// =========================================================
// This is the ONLY place the AI provider's API key should ever
// live. It runs server-side on Supabase Edge Functions (Deno),
// never in the browser.
//
// Deploy:
//   supabase functions deploy ai-generate
//
// Set the secret (never commit the real key):
//   supabase secrets set AI_API_KEY=sk-...
//
// The frontend calls this via supabaseClient.functions.invoke(),
// passing the user's Supabase access token — this function
// verifies that token before doing any AI work, and does basic
// per-user rate limiting against the `usage` table.
// =========================================================

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AI_API_KEY = Deno.env.get("AI_API_KEY")!;
// Point this at whichever AI provider/model you use. Example shown
// uses a generic chat-completions-style endpoint — adjust the request
// body below to match your provider's actual API.
const AI_API_URL = Deno.env.get("AI_API_URL") || "https://api.your-ai-provider.com/v1/generate";

const DAILY_LIMIT_PER_USER = 200; // basic abuse guard; tune per plan

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing auth token" }), { status: 401, headers: corsHeaders });
    }

    // Service-role client, used only for trusted server-side reads/writes.
    // Never send this key to the browser.
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the caller's token and get their user id.
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: corsHeaders });
    }
    const userId = userData.user.id;

    // Basic per-day rate limit, based on the `usage` table.
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await admin
      .from("usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("usage_date", today);
    if ((count || 0) >= DAILY_LIMIT_PER_USER) {
      return new Response(JSON.stringify({ error: "Daily generation limit reached. Please try again tomorrow or upgrade your plan." }), { status: 429, headers: corsHeaders });
    }

    const inputs = await req.json();
    const prompt = buildPrompt(inputs);

    // ---- Call your AI provider (server-side only) ----
    const aiRes = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({
        model: Deno.env.get("AI_MODEL") || "your-model-name",
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI provider error:", errText);
      return new Response(JSON.stringify({ error: "AI generation failed. Please try again." }), { status: 502, headers: corsHeaders });
    }

    const aiData = await aiRes.json();
    const text = extractText(aiData);

    return new Response(JSON.stringify({ text, sections: [["Result", text]] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), { status: 500, headers: corsHeaders });
  }
});

function buildPrompt(inputs: Record<string, unknown>): string {
  const biz = (inputs.business as Record<string, unknown>) || {};
  return [
    `You are a marketing assistant for a small local business.`,
    `Business name: ${biz.business_name ?? "N/A"}`,
    `Business category: ${biz.category ?? "N/A"}`,
    `Products/services: ${biz.products_services ?? "N/A"}`,
    `Task: ${JSON.stringify(inputs)}`,
    `Write clear, ready-to-use marketing content. Keep it concise and practical for a non-technical business owner.`
  ].join("\n");
}

function extractText(aiData: any): string {
  // Adjust to match your provider's actual response shape.
  return (
    aiData?.content?.[0]?.text ||
    aiData?.choices?.[0]?.message?.content ||
    aiData?.output_text ||
    "No content generated."
  );
}
