/* =========================================================
   BizGrow AI — Dashboard shell
   Handles: auth guard, sidebar navigation, mobile menu,
   trial banner, business summary card, profile/business
   settings forms, and logout. Content-generation logic for
   individual tools lives in js/content.js.
   ========================================================= */

window.BizGrowState = { session: null, profile: null, business: null, subscription: null };

(function () {
  const {
    requireSession, DB, getTrialInfo, formatDate,
    showToast, showFormMsg, clearFormMsg,
    setFieldError, clearAllFieldErrors, Validate
  } = window.BizGrowUtils;

  /* ---------------- View switching ---------------- */
  function showView(viewKey) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    document.querySelectorAll(".side-nav button[data-view]").forEach((b) => b.classList.remove("active"));
    const target = document.getElementById(`view-${viewKey}`);
    if (target) target.classList.add("active");
    const navBtn = document.querySelector(`.side-nav button[data-view="${viewKey}"]`);
    if (navBtn) navBtn.classList.add("active");
    closeMobileSidebar();
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }
  window.BizGrowShowView = showView;

  document.querySelectorAll(".side-nav button[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });

  document.querySelectorAll(".action-card[data-goto]").forEach((card) => {
    card.addEventListener("click", () => {
      showView(card.dataset.goto);
      if (card.dataset.type) {
        const chip = document.querySelector(`#contentTypeChips button[data-val="${card.dataset.type}"]`);
        if (chip) chip.click();
      }
    });
  });

  /* ---------------- Mobile sidebar ---------------- */
  const sidebar = document.getElementById("sidebar");
  const scrim = document.getElementById("scrim");
  const menuToggle = document.getElementById("menuToggle");
  function openMobileSidebar() { sidebar.classList.add("open"); scrim.classList.add("show"); }
  function closeMobileSidebar() { sidebar.classList.remove("open"); scrim.classList.remove("show"); }
  if (menuToggle) menuToggle.addEventListener("click", openMobileSidebar);
  if (scrim) scrim.addEventListener("click", closeMobileSidebar);

  /* ---------------- Logout ---------------- */
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.supabaseClient.auth.signOut();
      window.location.href = "/login.html";
    });
  }

  /* ---------------- Settings tabs ---------------- */
  document.querySelectorAll(".settings-tabs button").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".settings-tabs button").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".settings-pane").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`pane-${tab.dataset.tab}`).classList.add("active");
    });
  });

  /* ---------------- Trial banner rendering ---------------- */
  function renderTrialBanner(containerId, trial) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (trial.status === "active") { el.innerHTML = ""; return; }

    if (trial.expired) {
      el.innerHTML = `
        <div class="trial-banner expired">
          <div class="txt"><strong>Your free trial has ended.</strong><span>Upgrade to keep creating AI content for ${escapeHtml((window.BizGrowState.business && window.BizGrowState.business.business_name) || "your business")}.</span></div>
          <div class="actions">
            <button class="btn btn-ghost btn-sm" data-goto-view="pricing">View Plans</button>
            <button class="btn btn-primary btn-sm" data-goto-view="pricing">Upgrade</button>
          </div>
        </div>`;
    } else {
      el.innerHTML = `
        <div class="trial-banner">
          <div class="txt"><strong>Your Free Trial</strong><span>${trial.daysRemaining} day${trial.daysRemaining === 1 ? "" : "s"} remaining · ends ${formatDate(trial.trialEnd)}</span></div>
          <div class="actions"><button class="btn btn-ghost btn-sm" data-goto-view="pricing">View Plans</button></div>
        </div>`;
    }
    el.querySelectorAll("[data-goto-view]").forEach((b) => b.addEventListener("click", () => showView(b.dataset.gotoView)));
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  window.BizGrowEscapeHtml = escapeHtml;

  /* ---------------- Business form ---------------- */
  function fillBusinessForm(biz) {
    if (!biz) return;
    const map = {
      b_business_name: biz.business_name, b_category: biz.category, b_owner_name: biz.owner_name,
      b_phone: biz.phone, b_whatsapp: biz.whatsapp, b_email: biz.email, b_website: biz.website,
      b_address: biz.address, b_city: biz.city, b_state: biz.state, b_instagram: biz.instagram,
      b_facebook: biz.facebook, b_description: biz.description, b_products_services: biz.products_services,
      b_target_customers: biz.target_customers
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val || "";
    });
  }

  const businessForm = document.getElementById("businessForm");
  if (businessForm) {
    businessForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAllFieldErrors(businessForm);
      clearFormMsg("bizFormMsg");

      const fields = {
        business_name: val("b_business_name"), category: val("b_category"), owner_name: val("b_owner_name"),
        phone: val("b_phone"), whatsapp: val("b_whatsapp"), email: val("b_email"), website: val("b_website"),
        address: val("b_address"), city: val("b_city"), state: val("b_state"), instagram: val("b_instagram"),
        facebook: val("b_facebook"), description: val("b_description"), products_services: val("b_products_services"),
        target_customers: val("b_target_customers")
      };

      const requiredMap = { business_name: "bf-business_name", category: "bf-category", owner_name: "bf-owner_name", phone: "bf-phone", whatsapp: "bf-whatsapp", city: "bf-city", state: "bf-state", products_services: "bf-products" };
      let valid = true;
      Object.entries(requiredMap).forEach(([k, fieldId]) => {
        if (!Validate.required(fields[k])) { setFieldError(fieldId, "This field is required."); valid = false; }
      });
      if (!valid) return;

      const btn = document.getElementById("bizSaveBtn");
      btn.disabled = true; btn.textContent = "Saving...";
      try {
        const updated = await DB.upsertBusiness({ user_id: window.BizGrowState.session.user.id, ...fields });
        window.BizGrowState.business = updated;
        renderBusinessSummary(updated);
        showFormMsg("bizFormMsg", "Business details saved.", "success");
        showToast("Business details updated.", "success");
      } catch (err) {
        console.error(err);
        showFormMsg("bizFormMsg", "Something went wrong. Please try again.", "error");
      } finally {
        btn.disabled = false; btn.textContent = "Save Changes";
      }
    });
  }

  function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ""; }

  function renderBusinessSummary(biz) {
    const nameEl = document.getElementById("bizName");
    const catEl = document.getElementById("bizCategory");
    const avatarEl = document.getElementById("bizAvatar");
    if (!nameEl) return;
    if (biz && biz.business_name) {
      nameEl.textContent = biz.business_name;
      catEl.textContent = biz.category || "Category not set";
      avatarEl.textContent = biz.business_name.trim().charAt(0).toUpperCase();
    } else {
      nameEl.textContent = "Complete your business profile";
      catEl.textContent = "Add your business to get better AI results";
      avatarEl.textContent = "?";
    }
  }

  /* ---------------- Profile form ---------------- */
  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearFormMsg("profileFormMsg");
      const btn = profileForm.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        const updated = await DB.upsertProfile({
          id: window.BizGrowState.session.user.id,
          full_name: val("p_name"),
          email: window.BizGrowState.session.user.email,
          phone: val("p_phone")
        });
        window.BizGrowState.profile = updated;
        document.getElementById("welcomeName").textContent = (updated.full_name || "there").split(" ")[0];
        showFormMsg("profileFormMsg", "Profile updated.", "success");
      } catch (err) {
        console.error(err);
        showFormMsg("profileFormMsg", "Something went wrong. Please try again.", "error");
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ---------------- Init ---------------- */
  async function init() {
    const session = await requireSession("/login.html");
    if (!session) return;
    window.BizGrowState.session = session;

    let [profile, business, subscription] = await Promise.all([
      DB.getProfile(session.user.id), DB.getBusiness(session.user.id), DB.getSubscription(session.user.id)
    ]);
    if (!profile) { try { profile = await DB.upsertProfile({id:session.user.id, full_name:session.user.user_metadata?.full_name || "", email:session.user.email || ""}); } catch(e){console.error("[BizGrow AI] Profile setup:",e);} }
    if (!subscription) { try { subscription = await DB.createTrialSubscription(session.user.id); } catch(e){console.error("[BizGrow AI] Trial setup:",e);} }
    window.BizGrowState.profile = profile;
    window.BizGrowState.business = business;
    window.BizGrowState.subscription = subscription;

    const firstName = ((profile && profile.full_name) || session.user.email || "there").split(" ")[0];
    const welcomeEl = document.getElementById("welcomeName");
    if (welcomeEl) welcomeEl.textContent = firstName;

    renderBusinessSummary(business);
    fillBusinessForm(business);

    if (!business) {
      const home = document.getElementById("view-home");
      if (home) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.style.marginBottom = "24px";
        empty.innerHTML = `<div class="glyph">🏪</div><p>Complete your business profile to get better AI results.</p><a href="/onboarding.html" class="btn btn-primary btn-sm">Complete Business Profile</a>`;
        home.insertBefore(empty, home.children[1]);
      }
    }

    const trial = getTrialInfo(subscription);
    renderTrialBanner("trialBannerHome", trial);
    renderTrialBanner("trialBannerPricing", trial);

    // Settings → Account tab
    const acctPlan = document.getElementById("acctPlan");
    if (acctPlan) {
      acctPlan.textContent = trial.planLabel;
      document.getElementById("acctStatus").innerHTML = `<span class="badge ${trial.status}">${trial.status}</span>`;
      document.getElementById("acctTrialEnd").textContent = subscription ? formatDate(subscription.trial_end) : "—";
    }

    // Settings → Profile tab
    const pName = document.getElementById("p_name");
    if (pName) {
      pName.value = (profile && profile.full_name) || "";
      document.getElementById("p_email").value = session.user.email || "";
      document.getElementById("p_phone").value = (profile && profile.phone) || "";
    }

    document.dispatchEvent(new CustomEvent("bizgrow:ready"));
  }

  init();
})();
