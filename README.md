# BizGrow AI

An AI-powered marketing content platform for small local businesses — restaurants,
cafes, salons, gyms, clothing stores, clinics, coaching institutes and more.
Business owners pick a simple button ("Create Instagram Post", "Create WhatsApp
Offer"...) and AI generates ready-to-use marketing content. No prompts required.

Built with plain HTML5 / CSS3 / vanilla JavaScript on the frontend, Supabase for
auth + database, and a secure server-side Edge Function for AI calls.

---

## 1. Project structure

```
bizgrow-ai/
├── index.html              Landing / marketing homepage
├── login.html               Log in
├── signup.html               Sign up (starts 7-day trial)
├── forgot-password.html      Request a password reset email
├── reset-password.html       Set a new password (linked from the reset email)
├── onboarding.html           "Let's Set Up Your Business" form
├── dashboard.html            The app shell — sidebar + all feature views
├── css/
│   ├── style.css              Design tokens, landing page, auth pages
│   └── dashboard.css          Dashboard shell, generators, library, analytics
├── js/
│   ├── config.js               Public Supabase config + DEMO_MODE flag  ← edit this
│   ├── supabaseClient.js       Creates the shared Supabase client
│   ├── utils.js                 Toasts, validation, trial math, data-access layer
│   ├── auth.js                   Sign up / log in / forgot / reset logic
│   ├── onboarding.js             Business setup form logic
│   ├── ai.js                     AI generation (demo mode + production call)
│   ├── dashboard.js              Sidebar nav, session guard, business/profile forms
│   └── content.js                All content generators, library, analytics
├── supabase/
│   ├── schema.sql                Full DB schema + Row Level Security policies
│   └── functions/ai-generate/
│       └── index.ts               Edge Function: the ONLY place the AI key lives
└── .env.example                  Where every credential goes, explained
```

---

## 2. Set up Supabase (5 minutes)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste the contents of `supabase/schema.sql` → run it.
   This creates `profiles`, `businesses`, `subscriptions`, `generated_content`,
   `usage`, enables Row Level Security on every table, and adds policies so a
   user can only ever read/write their own rows.
3. Open **Project Settings → API** and copy:
   - Project URL
   - `anon` public key
4. Open `js/config.js` and paste them in:

   ```js
   window.BIZGROW_CONFIG = {
     SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
     SUPABASE_ANON_KEY: "YOUR-ANON-PUBLIC-KEY",
     ...
   };
   ```

That's it for auth + database — signup, login, business profiles, saved
content and analytics all work at this point, even before any AI key exists,
because of Demo Mode (next section).

---

## 3. Demo Mode (test the whole app without an AI key)

`js/config.js` ships with:

```js
DEMO_MODE: true
```

While `true`, every generator (content, ads, WhatsApp, reels, advisor) produces
realistic sample content **entirely in the browser** (`js/ai.js`) — nothing is
sent to any AI provider. This lets you click through the entire product —
signup → onboarding → every "Generate with AI" button → save → library →
analytics — before wiring up real AI credentials.

When you're ready to go live:

1. Follow the "Connect a real AI provider" steps below.
2. In `js/config.js`, set `DEMO_MODE: false`.

No other code changes are needed — `js/ai.js` calls the Edge Function instead
of the local template engine, and every screen keeps working exactly as before.

---

## 4. Connect a real AI provider (production)

AI calls must never happen from the browser with a bare API key. Instead:

1. Open `supabase/functions/ai-generate/index.ts`. It's a working template —
   adjust `AI_API_URL`, the request body, and `extractText()` to match
   whichever AI provider/model you use.
2. Deploy it:
   ```
   supabase functions deploy ai-generate
   ```
3. Set the AI key as a **secret**, never in code:
   ```
   supabase secrets set AI_API_KEY=your-real-api-key
   supabase secrets set AI_API_URL=https://api.your-ai-provider.com/v1/generate
   supabase secrets set AI_MODEL=your-model-name
   ```
4. Set `DEMO_MODE: false` in `js/config.js`.

The Edge Function verifies the caller's Supabase session before doing any AI
work, and applies a basic daily per-user generation limit using the `usage`
table — adjust `DAILY_LIMIT_PER_USER` in `index.ts` to match your plan limits.

---

## 5. Run it locally

This is a static site — no build step. Any static server works, for example:

```
npx serve .
# or
python3 -m http.server 5500
```

Then open `http://localhost:5500` (or whichever port your server prints).

---

## 6. Deploy

Any static host works (Netlify, Vercel, Cloudflare Pages, GitHub Pages, etc.).
Deploy the whole folder as-is — there's no build step. Just make sure
`js/config.js` has your real Supabase URL/anon key before deploying, and that
your Supabase project's **Auth → URL Configuration** includes your deployed
domain as a valid Site URL / Redirect URL (needed for the password-reset
email link to work).

---

## 7. Adding payments later (Razorpay)

Payments are intentionally **not** wired up yet — every "Coming Soon" button
is disabled and does nothing destructive. The architecture is ready for it:

- `subscriptions` table already has `plan`, `status`, `subscription_start`,
  `subscription_end` columns.
- The planned flow (documented in code comments) is:
  `User selects a plan → Razorpay Checkout → payment success → a server-side
  function verifies the payment signature → that function (using the
  service-role key) updates the user's row in subscriptions → premium
  features unlock.`
- Never verify payments or unlock plans from frontend JavaScript — always do
  it in a server-side function, the same way `ai-generate` is structured.

When you're ready, add a `razorpay-verify` Edge Function alongside
`ai-generate`, and swap the disabled "Coming Soon" buttons in `dashboard.html`
/ `index.html` for real Razorpay Checkout calls.

---

## 8. What's implemented

- Supabase Authentication: sign up, log in, log out, forgot password, reset
  password, with inline validation and friendly error messages.
- 7-day free trial, created automatically on signup, shown as a countdown
  banner, with an expired state and Upgrade/View Plans buttons.
- Pricing section (Starter ₹199 / Growth ₹399 / Business ₹799) with disabled
  "Coming Soon" payment buttons.
- Business onboarding form, saved to Supabase, editable later from
  **My Business**.
- Dashboard with sidebar navigation (hamburger menu on mobile) covering:
  Dashboard home, My Business, AI Content, Social Media (Instagram / Facebook
  / LinkedIn / WhatsApp), Advertisements, WhatsApp Marketing (7 ready-made
  templates + "Open WhatsApp" using the business's saved number), Reel
  Scripts, AI Business Advisor (chat, uses saved business info), Saved
  Content (search/filter/copy/delete), Analytics (real usage only, nothing
  faked), Pricing, Settings (profile, account/trial status, language).
- Every generator supports Copy / Save / Regenerate, tone selection, and an
  English / Hindi / Hinglish language option.
- Empty states for no saved content and an incomplete business profile.
- Friendly, non-technical error messages everywhere; no technical details,
  API keys or database errors are ever shown to the user.
- Responsive down to mobile: sidebar becomes a hamburger drawer, grids
  collapse to one column, forms go full width.
- Row Level Security on every table — a user can only ever see their own
  data.

## 9. What's intentionally stubbed for later

- Real payment processing (Razorpay) — architecture is ready, not wired up.
- Real AI provider call — works today via Demo Mode; production call is a
  ready-to-edit Edge Function template.
- Business logo upload — the field exists in the onboarding form; wire it to
  Supabase Storage when ready (`supabase.storage.from('logos').upload(...)`).
- WhatsApp Business API, AI image/video generation, Google Business,
  Instagram/Facebook API integration, email marketing, team accounts,
  multiple businesses per user, automated campaigns — noted in code comments
  as future additions, not built into the MVP.

---

## 10. Manual test checklist

Before shipping, click through:

- [ ] Sign up with a new email → lands on onboarding
- [ ] Fill and save the business form → lands on dashboard
- [ ] Log out → log back in
- [ ] Forgot password → check the email flow end to end
- [ ] Dashboard home shows the trial countdown and business summary
- [ ] Every action card and sidebar item opens the right view
- [ ] AI Content Generator: change type/tone/language → Generate → Copy →
      Save → Regenerate
- [ ] Social Media Generator for each platform
- [ ] Advertisement Generator with and without optional fields
- [ ] WhatsApp Marketing: generate a template → Open WhatsApp uses the saved
      number
- [ ] Reel Script Generator for each duration
- [ ] AI Business Advisor: suggested questions + free-text question
- [ ] Saved Content: search, filter by category, copy, delete
- [ ] Analytics reflects real generations/saves (not fake data)
- [ ] Empty states: brand-new account with no saved content, and with no
      business profile
- [ ] Resize to mobile width: hamburger menu opens/closes, forms and cards
      go full width
- [ ] Try loading `dashboard.html` directly while logged out → redirected to
      login


## Supabase setup
Run the complete `supabase/schema.sql` in the Supabase SQL Editor before using signup, onboarding, or dashboard database features. This build is configured with the supplied project URL and publishable key.
