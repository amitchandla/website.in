/* =========================================================
   BizGrow AI — Content tools
   Wires up every generator UI to js/ai.js, and saves/loads
   generated content, usage counters and the analytics view.
   Waits for "bizgrow:ready" (fired by dashboard.js after the
   session/business/subscription are loaded).
   ========================================================= */

document.addEventListener("bizgrow:ready", () => {
  const { DB, showToast } = window.BizGrowUtils;
  const state = window.BizGrowState;
  const escapeHtml = window.BizGrowEscapeHtml;

  function currentBusiness() { return state.business; }
  function userId() { return state.session.user.id; }

  function chipGroup(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return null;
    el.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      el.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
    return el;
  }
  function chipValue(containerId) {
    const el = document.getElementById(containerId);
    const active = el && el.querySelector("button.active");
    return active ? active.dataset.val : null;
  }

  function renderSections(cardEl, sections) {
    const body = sections.map(([label, text]) => `<h4>${escapeHtml(label)}</h4><div>${escapeHtml(text)}</div>`).join("");
    const plainText = sections.map(([label, text]) => `${label}:\n${text}`).join("\n\n");
    cardEl.innerHTML = `
      <span class="result-tag">AI Generated</span>
      <div class="result-body">${body}</div>
      <div class="result-actions">
        <button class="btn btn-ghost btn-sm act-copy">Copy</button>
        <button class="btn btn-primary btn-sm act-save">Save</button>
        <button class="btn btn-ghost btn-sm act-regen">Regenerate</button>
      </div>`;
    cardEl.dataset.plainText = plainText;
  }

  function renderPlain(cardEl, text) {
    cardEl.innerHTML = `
      <span class="result-tag">AI Generated</span>
      <div class="result-body">${escapeHtml(text)}</div>
      <div class="result-actions">
        <button class="btn btn-ghost btn-sm act-copy">Copy</button>
        <button class="btn btn-primary btn-sm act-save">Save</button>
        <button class="btn btn-ghost btn-sm act-regen">Regenerate</button>
      </div>`;
    cardEl.dataset.plainText = text;
  }

  function loadingCard(cardEl) {
    cardEl.innerHTML = `<div class="loading-row"><span class="spinner"></span> AI is creating your content...</div>`;
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied to clipboard.", "success");
    } catch {
      showToast("Could not copy — please select and copy manually.", "error");
    }
  }

  async function saveContent(category, contentType, inputData, text) {
    try {
      await DB.saveGeneratedContent({
        user_id: userId(),
        business_id: (currentBusiness() && currentBusiness().id) || null,
        content_type: contentType,
        input_data: inputData,
        generated_content: text,
        category
      });
      showToast("Saved to your content library.", "success");
    } catch (err) {
      console.error(err);
      showToast("Could not save right now.", "error");
    }
  }

  async function logUsage(feature) {
    try { await DB.logUsage(userId(), feature); } catch (e) { /* non-fatal */ }
  }

  function wireResultActions(cardEl, meta) {
    cardEl.addEventListener("click", async (e) => {
      const copyBtn = e.target.closest(".act-copy");
      const saveBtn = e.target.closest(".act-save");
      const regenBtn = e.target.closest(".act-regen");
      if (copyBtn) copyToClipboard(cardEl.dataset.plainText || "");
      if (saveBtn) saveContent(meta.category, meta.contentType, meta.inputData, cardEl.dataset.plainText || "");
      if (regenBtn && meta.regenerate) meta.regenerate();
    });
  }

  /* ================= AI CONTENT GENERATOR ================= */
  chipGroup("contentTypeChips");
  chipGroup("toneChips");
  chipGroup("langChips");
  const genBtn = document.getElementById("generateBtn");
  const genResultCard = document.getElementById("resultCard");

  async function runContentGenerator() {
    const contentType = chipValue("contentTypeChips") || "Instagram Post";
    const tone = chipValue("toneChips") || "Friendly";
    const language = chipValue("langChips") || "English";
    const topic = document.getElementById("gc_topic").value.trim();
    const offer = document.getElementById("gc_offer").value.trim();
    const audience = document.getElementById("gc_audience").value.trim();

    loadingCard(genResultCard);
    genBtn.disabled = true;
    try {
      const result = await window.BizGrowAI.generate({
        kind: "social", contentType, tone, language, topic, offer, audience,
        business: currentBusiness(), city: currentBusiness() && currentBusiness().city
      });
      renderSections(genResultCard, result.sections);
      wireResultActions(genResultCard, {
        category: mapCategory(contentType), contentType,
        inputData: { topic, offer, audience, tone, language },
        regenerate: runContentGenerator
      });
      logUsage("ai_content_generator");
    } catch (err) {
      console.error(err);
      genResultCard.innerHTML = `<p class="result-placeholder">Something went wrong. Please try again.</p>`;
    } finally {
      genBtn.disabled = false;
    }
  }
  function mapCategory(contentType) {
    if (/instagram|facebook|caption/i.test(contentType)) return "Social Posts";
    if (/whatsapp/i.test(contentType)) return "WhatsApp";
    if (/advertisement/i.test(contentType)) return "Advertisements";
    if (/reel/i.test(contentType)) return "Reel Scripts";
    if (/festival|offer/i.test(contentType)) return "Offers";
    return "Social Posts";
  }
  if (genBtn) genBtn.addEventListener("click", runContentGenerator);

  /* ================= SOCIAL MEDIA GENERATOR ================= */
  chipGroup("platformChips");
  chipGroup("smToneChips");
  const smGenBtn = document.getElementById("smGenerateBtn");
  const smResultCard = document.getElementById("smResultCard");

  async function runSocialGenerator() {
    const platform = chipValue("platformChips") || "Instagram";
    const tone = chipValue("smToneChips") || "Friendly";
    const topic = document.getElementById("sm_topic").value.trim();
    const offer = document.getElementById("sm_offer").value.trim();

    loadingCard(smResultCard);
    smGenBtn.disabled = true;
    try {
      const result = await window.BizGrowAI.generate({
        kind: "social", platform, tone, language: "English", topic, offer,
        business: currentBusiness()
      });
      renderSections(smResultCard, result.sections);
      wireResultActions(smResultCard, {
        category: "Social Posts", contentType: `${platform} Post`,
        inputData: { platform, topic, offer, tone },
        regenerate: runSocialGenerator
      });
      logUsage("social_media_generator");
    } catch (err) {
      console.error(err);
      smResultCard.innerHTML = `<p class="result-placeholder">Something went wrong. Please try again.</p>`;
    } finally {
      smGenBtn.disabled = false;
    }
  }
  if (smGenBtn) smGenBtn.addEventListener("click", runSocialGenerator);

  /* ================= ADVERTISEMENT GENERATOR ================= */
  const adGenBtn = document.getElementById("adGenerateBtn");
  const adResultCard = document.getElementById("adResultCard");

  async function runAdGenerator() {
    const product = document.getElementById("ad_product").value.trim();
    const price = document.getElementById("ad_price").value.trim();
    const discount = document.getElementById("ad_discount").value.trim();
    const offer = document.getElementById("ad_offer").value.trim();
    const audience = document.getElementById("ad_audience").value.trim();

    if (!product) { showToast("Please enter a product or service.", "error"); return; }

    loadingCard(adResultCard);
    adGenBtn.disabled = true;
    try {
      const result = await window.BizGrowAI.generate({
        kind: "advertisement", product, price, discount, offer, audience, business: currentBusiness()
      });
      renderSections(adResultCard, result.sections);
      wireResultActions(adResultCard, {
        category: "Advertisements", contentType: "Advertisement",
        inputData: { product, price, discount, offer, audience },
        regenerate: runAdGenerator
      });
      logUsage("advertisement_generator");
    } catch (err) {
      console.error(err);
      adResultCard.innerHTML = `<p class="result-placeholder">Something went wrong. Please try again.</p>`;
    } finally {
      adGenBtn.disabled = false;
    }
  }
  if (adGenBtn) adGenBtn.addEventListener("click", runAdGenerator);

  /* ================= WHATSAPP MARKETING ================= */
  const waTemplates = ["New Customer", "Discount Offer", "Festival Offer", "New Product", "Customer Follow-up", "Thank You", "Re-engagement"];
  const waGrid = document.getElementById("waTemplateGrid");
  const waPanel = document.getElementById("waResultPanel");
  const waCard = document.getElementById("waResultCard");

  if (waGrid) {
    waGrid.innerHTML = waTemplates.map((t) => `
      <div class="template-card">
        <h4>${t}</h4>
        <p>Ready-to-send WhatsApp message for this moment.</p>
        <button class="btn btn-primary btn-sm btn-block" data-template="${t}">Generate WhatsApp Message</button>
      </div>`).join("");

    waGrid.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-template]");
      if (!btn) return;
      const templateType = btn.dataset.template;
      waPanel.style.display = "block";
      loadingCard(waCard);
      waPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      try {
        const result = await window.BizGrowAI.generate({ kind: "whatsapp_template", templateType, business: currentBusiness() });
        renderPlain(waCard, result.text);
        const waNumber = currentBusiness() && currentBusiness().whatsapp;
        const extra = document.createElement("div");
        extra.className = "result-actions";
        extra.style.marginTop = "-6px";
        const openBtn = document.createElement("button");
        openBtn.className = "btn btn-dark btn-sm";
        openBtn.textContent = "Open WhatsApp";
        openBtn.addEventListener("click", () => {
          if (!waNumber) { showToast("Add your WhatsApp number in My Business first.", "error"); return; }
          const digits = waNumber.replace(/[^0-9]/g, "");
          window.open(`https://wa.me/${digits}?text=${encodeURIComponent(result.text)}`, "_blank");
        });
        waCard.appendChild(extra);
        extra.appendChild(openBtn);
        wireResultActions(waCard, {
          category: "WhatsApp", contentType: templateType,
          inputData: { templateType },
          regenerate: () => btn.click()
        });
        logUsage("whatsapp_marketing");
      } catch (err) {
        console.error(err);
        waCard.innerHTML = `<p class="result-placeholder">Something went wrong. Please try again.</p>`;
      }
    });
  }

  /* ================= REEL SCRIPT GENERATOR ================= */
  chipGroup("durationChips");
  const reelGenBtn = document.getElementById("reelGenerateBtn");
  const reelResultCard = document.getElementById("reelResultCard");

  async function runReelGenerator() {
    const product = document.getElementById("rs_product").value.trim();
    const topic = document.getElementById("rs_topic").value.trim();
    const duration = chipValue("durationChips") || "30 seconds";

    if (!product) { showToast("Please enter a product or service.", "error"); return; }

    loadingCard(reelResultCard);
    reelGenBtn.disabled = true;
    try {
      const result = await window.BizGrowAI.generate({ kind: "reel", product, topic, duration, business: currentBusiness() });
      renderSections(reelResultCard, result.sections);
      wireResultActions(reelResultCard, {
        category: "Reel Scripts", contentType: "Reel Script",
        inputData: { product, topic, duration },
        regenerate: runReelGenerator
      });
      logUsage("reel_script_generator");
    } catch (err) {
      console.error(err);
      reelResultCard.innerHTML = `<p class="result-placeholder">Something went wrong. Please try again.</p>`;
    } finally {
      reelGenBtn.disabled = false;
    }
  }
  if (reelGenBtn) reelGenBtn.addEventListener("click", runReelGenerator);

  /* ================= AI BUSINESS ADVISOR ================= */
  const chatLog = document.getElementById("chatLog");
  const chatInput = document.getElementById("chatInput");
  const chatSendBtn = document.getElementById("chatSendBtn");
  const chatSuggest = document.getElementById("chatSuggest");

  function addChatMsg(role, text) {
    if (!chatLog) return;
    const el = document.createElement("div");
    el.className = `chat-msg ${role}`;
    el.textContent = text;
    chatLog.appendChild(el);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  async function askAdvisor(question) {
    if (!question) return;
    addChatMsg("user", question);
    chatInput.value = "";
    const thinking = document.createElement("div");
    thinking.className = "chat-msg bot";
    thinking.innerHTML = `<span class="spinner" style="display:inline-block;vertical-align:middle;"></span>`;
    chatLog.appendChild(thinking);
    chatLog.scrollTop = chatLog.scrollHeight;
    try {
      const result = await window.BizGrowAI.generate({ kind: "advisor", question, business: currentBusiness() });
      thinking.textContent = result.text;
      logUsage("ai_business_advisor");
    } catch (err) {
      console.error(err);
      thinking.textContent = "Something went wrong. Please try again.";
    }
  }

  if (chatSendBtn) chatSendBtn.addEventListener("click", () => askAdvisor(chatInput.value.trim()));
  if (chatInput) chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") askAdvisor(chatInput.value.trim()); });
  if (chatSuggest) chatSuggest.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-q]");
    if (btn) askAdvisor(btn.dataset.q);
  });
  if (chatLog && chatLog.children.length === 0) {
    addChatMsg("bot", `Hi! I'm your AI business advisor${currentBusiness() ? ` for ${currentBusiness().business_name}` : ""}. Ask me anything about growing your business, or tap a suggestion below.`);
  }

  /* ================= SAVED CONTENT LIBRARY ================= */
  const libContainer = document.getElementById("libraryContent");
  const libSearch = document.getElementById("libSearch");
  const libFilter = document.getElementById("libFilter");
  let allSavedContent = [];

  async function loadLibrary() {
    if (!libContainer) return;
    allSavedContent = await DB.listGeneratedContent(userId());
    renderLibrary();
  }

  function renderLibrary() {
    const q = (libSearch && libSearch.value.trim().toLowerCase()) || "";
    const filterCat = (libFilter && libFilter.value) || "";
    const filtered = allSavedContent.filter((row) => {
      const matchesQ = !q || (row.generated_content || "").toLowerCase().includes(q) || (row.content_type || "").toLowerCase().includes(q);
      const matchesCat = !filterCat || row.category === filterCat;
      return matchesQ && matchesCat;
    });

    if (filtered.length === 0) {
      libContainer.innerHTML = `
        <div class="empty-state">
          <div class="glyph">🗂️</div>
          <p>Your saved content will appear here.</p>
          <button class="btn btn-primary btn-sm" id="emptyCreateBtn">Create Your First Content</button>
        </div>`;
      const btn = document.getElementById("emptyCreateBtn");
      if (btn) btn.addEventListener("click", () => window.BizGrowShowView("ai-content"));
      return;
    }

    libContainer.innerHTML = `<div class="lib-grid">${filtered.map((row) => `
      <div class="lib-card" data-id="${row.id}">
        <span class="tag">${escapeHtml(row.category || row.content_type || "Content")}</span>
        <div class="snippet">${escapeHtml((row.generated_content || "").slice(0, 220))}${(row.generated_content || "").length > 220 ? "…" : ""}</div>
        <div class="lib-actions">
          <button class="btn btn-ghost btn-sm act-lib-copy">Copy</button>
          <button class="btn btn-ghost btn-sm act-lib-delete">Delete</button>
        </div>
      </div>`).join("")}</div>`;
  }

  if (libContainer) {
    libContainer.addEventListener("click", async (e) => {
      const card = e.target.closest(".lib-card");
      if (!card) return;
      const id = card.dataset.id;
      const row = allSavedContent.find((r) => String(r.id) === String(id));
      if (e.target.closest(".act-lib-copy") && row) copyToClipboard(row.generated_content || "");
      if (e.target.closest(".act-lib-delete") && row) {
        try {
          await DB.deleteGeneratedContent(row.id);
          allSavedContent = allSavedContent.filter((r) => r.id !== row.id);
          renderLibrary();
          showToast("Deleted.", "success");
        } catch (err) {
          console.error(err);
          showToast("Could not delete right now.", "error");
        }
      }
    });
  }
  if (libSearch) libSearch.addEventListener("input", renderLibrary);
  if (libFilter) libFilter.addEventListener("change", renderLibrary);

  /* ================= ANALYTICS ================= */
  async function loadAnalytics() {
    const statGrid = document.getElementById("statGrid");
    const barChart = document.getElementById("barChart");
    if (!statGrid) return;

    const content = allSavedContent.length ? allSavedContent : await DB.listGeneratedContent(userId());
    const usage = await DB.listUsage(userId());

    const totalGenerations = usage.length;
    const savedCount = content.length;
    const byCategory = {};
    content.forEach((row) => {
      const cat = row.category || "Other";
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    const stats = [
      { label: "AI Generations", num: totalGenerations },
      { label: "Saved Content", num: savedCount },
      { label: "Social Posts", num: byCategory["Social Posts"] || 0 },
      { label: "Advertisements", num: byCategory["Advertisements"] || 0 },
      { label: "WhatsApp Messages", num: byCategory["WhatsApp"] || 0 },
      { label: "Reel Scripts", num: byCategory["Reel Scripts"] || 0 }
    ];

    statGrid.innerHTML = stats.slice(0, 4).map((s) => `
      <div class="stat-card"><div class="num">${s.num}</div><div class="lbl">${s.label}</div></div>`).join("");

    const maxVal = Math.max(1, ...Object.values(byCategory));
    const categories = ["Social Posts", "Advertisements", "WhatsApp", "Reel Scripts", "Captions", "Offers"];
    if (Object.keys(byCategory).length === 0) {
      barChart.innerHTML = `<p class="result-placeholder" style="margin:auto;">No content created yet. Your chart will fill in as you generate content.</p>`;
    } else {
      barChart.innerHTML = categories.map((cat) => {
        const v = byCategory[cat] || 0;
        const heightPct = Math.round((v / maxVal) * 100);
        return `<div class="bar-col"><div class="bar" style="height:${Math.max(heightPct, v ? 6 : 2)}%;"></div><span class="bar-label">${v}</span><span class="bar-label">${cat}</span></div>`;
      }).join("");
    }
  }

  // Load library/analytics data once, then refresh analytics whenever that tab opens.
  loadLibrary().then(loadAnalytics);
  document.querySelectorAll('.side-nav button[data-view="analytics"], .side-nav button[data-view="library"]').forEach((btn) => {
    btn.addEventListener("click", () => { loadLibrary().then(loadAnalytics); });
  });
});
