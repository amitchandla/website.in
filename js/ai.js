/* =========================================================
   BizGrow AI — AI generation layer
   =========================================================
   Two paths:
   1) DEMO MODE (default): produces realistic sample content
      entirely in the browser, so the interface can be tested
      before any AI API key exists.
   2) PRODUCTION: calls the Supabase Edge Function named in
      config.AI_FUNCTION_NAME, which holds the real AI API key
      server-side and returns generated text. The frontend
      NEVER sees or sends an AI API key.

   Switch modes with window.BIZGROW_CONFIG.DEMO_MODE in
   js/config.js — no other code needs to change.
   ========================================================= */

const BizGrowAI = (function () {

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  const toneWords = {
    Professional: { open: "Introducing", flair: "" },
    Friendly: { open: "Hey there! ", flair: " 😊" },
    Attractive: { open: "You won't want to miss this — ", flair: " ✨" },
    Premium: { open: "An exclusive experience awaits. ", flair: "" },
    Local: { open: "Good news for the neighbourhood! ", flair: "" },
    Urgent: { open: "⏰ Don't wait — ", flair: " Limited time only!" }
  };

  function hindiWrap(text, language) {
    if (language === "Hindi") {
      return `[हिंदी में] ${text} — आज ही संपर्क करें!`;
    }
    if (language === "Hinglish") {
      return `${text} — Aaj hi try karein, aapko pasand aayega!`;
    }
    return text;
  }

  function businessLine(business) {
    if (!business) return "your business";
    return business.business_name || "your business";
  }

  /* ---------------- Demo content builders ---------------- */

  function demoSocialCaption(inputs) {
    const { topic, offer, audience, tone, language, business, contentType, platform } = inputs;
    const t = toneWords[tone] || toneWords.Friendly;
    const name = businessLine(business);
    const cat = (business && business.category) || "local business";
    const topicLine = topic || "our latest offering";
    const offerLine = offer ? ` ${offer} — for a limited time.` : "";
    const audienceLine = audience ? ` Perfect for ${audience}.` : "";

    const hook = pick([
      `Craving something new?`,
      `Here's why everyone's talking about ${name}.`,
      `Your ${cat.toLowerCase()} just got better.`,
      `Big news from ${name}!`
    ]);

    const body = `${t.open}${topicLine} at ${name}.${offerLine}${audienceLine}${t.flair}`;
    const cta = pick([
      "📍 Visit us today.",
      "📲 DM us to book.",
      "☎️ Call now to grab this offer.",
      "🛍️ Drop by before it's gone."
    ]);
    const hashtags = `#${(cat || "Business").replace(/\s+/g, "")} #${(name || "Local").replace(/\s+/g, "")} #ShopLocal #${(inputs.city || "SupportLocal").replace(/\s+/g, "")}`;

    let sections = [];
    if (contentType === "Instagram Post" || platform === "Instagram") {
      sections = [
        ["Hook", hook],
        ["Caption", hindiWrap(body, language)],
        ["Call to action", cta],
        ["Hashtags", hashtags]
      ];
    } else if (contentType === "Facebook Post" || platform === "Facebook") {
      sections = [["Post", hindiWrap(`${hook} ${body}`, language)], ["Call to action", cta]];
    } else if (platform === "LinkedIn") {
      sections = [["Professional post", hindiWrap(`${name} is growing. ${body} We're proud to serve ${audience || "our community"} with reliable, quality service.`, language)]];
    } else if (contentType === "WhatsApp Message" || platform === "WhatsApp") {
      sections = [["WhatsApp message", hindiWrap(`${hook} ${body} ${cta}`, language)]];
    } else if (contentType === "Product Description") {
      sections = [["Product description", hindiWrap(`${topicLine} — crafted with care at ${name}.${offerLine} ${audienceLine}`, language)]];
    } else if (contentType === "Festival Offer") {
      sections = [
        ["Offer headline", `🎉 ${topicLine || "Festival"} Special at ${name}!`],
        ["Details", hindiWrap(`${offer || "Special festive discount"} on ${topicLine || "select items"}.${audienceLine}`, language)],
        ["Call to action", cta]
      ];
    } else if (contentType === "Promotional Caption") {
      sections = [["Caption", hindiWrap(`${hook} ${body} ${cta}`, language)]];
    } else {
      sections = [["Content", hindiWrap(`${hook} ${body} ${cta}`, language)]];
    }

    return sections;
  }

  function demoAdvertisement(inputs) {
    const { product, price, discount, offer, audience, business } = inputs;
    const name = businessLine(business);
    const headline = `${discount ? discount + " OFF — " : ""}${product || "Our Best Offering"} at ${name}`;
    const priceLine = price ? ` Now just ${price}.` : "";
    const offerLine = offer ? ` ${offer}.` : "";
    const audienceLine = audience ? ` Made for ${audience}.` : "";
    const mainCopy = `Looking for ${product || "something special"}? ${name} has you covered.${priceLine}${offerLine}${audienceLine}`;
    const shortVersion = `${discount ? discount + " off " : ""}${product || "our offer"} — only at ${name}. ${offer || ""}`.trim();
    const longVersion = `${mainCopy} Our customers keep coming back for quality and service they can trust. Don't miss this — offer valid for a limited time. Visit ${name} today or reach out to book yours.`;

    return [
      ["Headline", headline],
      ["Main copy", mainCopy],
      ["Call to action", "📞 Contact us today or visit in person."],
      ["Short version", shortVersion],
      ["Long version", longVersion]
    ];
  }

  function demoReelScript(inputs) {
    const { product, topic, duration, business } = inputs;
    const name = businessLine(business);
    const subject = topic || product || "what we do best";

    return [
      ["Hook (0-3s)", `POV: you just found ${name}'s ${subject}. 👀`],
      ["Scene 1", `Show the product/service up close — quick, punchy cuts of ${subject}.`],
      ["Scene 2", `Show it in use / being made / customers enjoying it at ${name}.`],
      ["Scene 3", `Show the result — happy customer, finished look, satisfied smile.`],
      ["Voiceover", `"At ${name}, we make sure ${subject} is always worth the visit."`],
      ["Call to action", `Tag someone who needs to try this. 📍 ${name} — link in bio.`],
      ["Suggested length", duration || "30 seconds"]
    ];
  }

  function demoWhatsApp(templateType, business) {
    const name = businessLine(business);
    const templates = {
      "New Customer": `Welcome to ${name}! 🎉 We're glad to have you. Reply to this message anytime for offers, updates or to place an order.`,
      "Discount Offer": `✨ Special offer just for you! Enjoy a discount on your next visit to ${name}. Offer valid this week only — reply "YES" to claim.`,
      "Festival Offer": `🪔 Festive greetings from ${name}! Celebrate with special festival prices on your favourites. Limited stock — order now.`,
      "New Product": `📦 Just launched at ${name}! Come check out what's new — we think you'll love it.`,
      "Customer Follow-up": `Hi! Just checking in after your recent visit to ${name} — how did everything go? We'd love your feedback. 🙏`,
      "Thank You": `Thank you for choosing ${name}! Your support means everything to us. See you again soon. 💛`,
      "Re-engagement": `We miss you at ${name}! It's been a while — come back this week for a little something extra on us.`
    };
    return templates[templateType] || `Hello from ${name}! We have something special for you.`;
  }

  function demoAdvisorReply(question, business) {
    const name = businessLine(business);
    const cat = (business && business.category) || "your business";
    const q = (question || "").toLowerCase();

    if (q.includes("more customers")) {
      return `Here are 3 ways to bring more customers to ${name}:\n\n1. Post consistently on Instagram/WhatsApp — even 3x a week builds recall.\n2. Run a simple referral offer: "Bring a friend, both get 10% off."\n3. Ask happy customers for reviews — social proof drives new footfall.`;
    }
    if (q.includes("promote")) {
      return `To promote ${name} as a ${cat.toLowerCase()}:\n\n1. Share before/after or behind-the-scenes content — people love seeing the process.\n2. Partner with 1-2 nearby businesses for cross-promotion.\n3. Use WhatsApp broadcast lists for weekly updates to past customers.`;
    }
    if (q.includes("instagram ideas") || q.includes("10 instagram")) {
      return `10 Instagram ideas for ${name}:\n\n1. Behind-the-scenes reel\n2. Customer testimonial\n3. Before/after transformation\n4. "Meet the owner" post\n5. Limited-time offer countdown\n6. Staff spotlight\n7. Poll/quiz story\n8. Product close-up carousel\n9. Local shoutout/collab\n10. Weekly Q&A story`;
    }
    if (q.includes("repeat customers")) {
      return `To increase repeat visits at ${name}:\n\n1. Start a simple loyalty card ("6th visit free").\n2. Send a WhatsApp thank-you message after every visit.\n3. Offer a small "welcome back" discount for lapsed customers.`;
    }
    if (q.includes("30-day") || q.includes("marketing plan")) {
      return `A simple 30-day plan for ${name}:\n\nWeek 1 — Introduce: post your story, share what makes you different.\nWeek 2 — Educate: show your process, products or services in detail.\nWeek 3 — Offer: run a limited-time promotion to drive action.\nWeek 4 — Engage: collect reviews, run a poll, thank your customers.`;
    }
    if (q.includes("offer") && q.includes("week")) {
      return `A good offer to try this week at ${name}: a "bring a friend" deal — both get a small discount. It's low-cost and naturally brings in new customers through people you already have.`;
    }
    return `Great question! For ${name}, I'd suggest starting simple: post 2-3 times a week, run one clear offer at a time, and always include a call to action (visit, call or WhatsApp). Want me to turn this into a specific post or offer?`;
  }

  /* ---------------- Public generate function ---------------- */

  async function generate(inputs) {
    const demoMode = !window.BIZGROW_CONFIG || window.BIZGROW_CONFIG.DEMO_MODE;

    if (demoMode) {
      // Simulate latency so the loading state is visible/testable.
      await new Promise((res) => setTimeout(res, 900 + Math.random() * 500));

      switch (inputs.kind) {
        case "advertisement":
          return { sections: demoAdvertisement(inputs) };
        case "reel":
          return { sections: demoReelScript(inputs) };
        case "whatsapp_template":
          return { text: demoWhatsApp(inputs.templateType, inputs.business) };
        case "advisor":
          return { text: demoAdvisorReply(inputs.question, inputs.business) };
        default:
          return { sections: demoSocialCaption(inputs) };
      }
    }

    // PRODUCTION PATH — calls the secure Supabase Edge Function.
    // The function holds the AI API key server-side; only the
    // Supabase session token is sent from the browser.
    const fnName = window.BIZGROW_CONFIG.AI_FUNCTION_NAME || "ai-generate";
    const { data: sessionData } = await window.supabaseClient.auth.getSession();
    const accessToken = sessionData && sessionData.session ? sessionData.session.access_token : null;

    const { data, error } = await window.supabaseClient.functions.invoke(fnName, {
      body: inputs,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
    });
    if (error) throw error;
    return data;
  }

  return { generate };
})();

window.BizGrowAI = BizGrowAI;
