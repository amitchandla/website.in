function friendlyDbError(err){const m=String((err&&err.message)||"");if(/row-level security|permission denied|not authorized/i.test(m))return "Database permissions are not configured. Run supabase/schema.sql in Supabase SQL Editor.";if(/relation .* does not exist|Could not find the table/i.test(m))return "BizGrow AI tables are missing. Run supabase/schema.sql in Supabase SQL Editor.";return m?"Could not save your business: "+m:"Could not save your business. Please try again.";}

/* =========================================================
   BizGrow AI — Business onboarding
   ========================================================= */

(function () {
  const { showFormMsg, clearFormMsg, setFieldError, clearAllFieldErrors, Validate, requireSession, DB } = window.BizGrowUtils;

  (async function init() {
    const session = await requireSession("/login.html");
    if (!session) return;

    // If a business already exists, prefill (lets users edit before dashboard).
    const existing = await DB.getBusiness(session.user.id);
    if (existing) {
      document.getElementById("business_name").value = existing.business_name || "";
      document.getElementById("category").value = existing.category || "";
      document.getElementById("owner_name").value = existing.owner_name || "";
      document.getElementById("phone").value = existing.phone || "";
      document.getElementById("whatsapp").value = existing.whatsapp || "";
      document.getElementById("business_email").value = existing.email || "";
      document.getElementById("website").value = existing.website || "";
      document.getElementById("address").value = existing.address || "";
      document.getElementById("city").value = existing.city || "";
      document.getElementById("state").value = existing.state || "";
      document.getElementById("instagram").value = existing.instagram || "";
      document.getElementById("facebook").value = existing.facebook || "";
      document.getElementById("description").value = existing.description || "";
      document.getElementById("products_services").value = existing.products_services || "";
      document.getElementById("target_customers").value = existing.target_customers || "";
    }

    const form = document.getElementById("onboardingForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAllFieldErrors(form);
      clearFormMsg("formMsg");

      const fields = {
        business_name: document.getElementById("business_name").value.trim(),
        category: document.getElementById("category").value,
        owner_name: document.getElementById("owner_name").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        whatsapp: document.getElementById("whatsapp").value.trim(),
        email: document.getElementById("business_email").value.trim(),
        website: document.getElementById("website").value.trim(),
        address: document.getElementById("address").value.trim(),
        city: document.getElementById("city").value.trim(),
        state: document.getElementById("state").value.trim(),
        instagram: document.getElementById("instagram").value.trim(),
        facebook: document.getElementById("facebook").value.trim(),
        description: document.getElementById("description").value.trim(),
        products_services: document.getElementById("products_services").value.trim(),
        target_customers: document.getElementById("target_customers").value.trim()
      };

      let valid = true;
      const requiredMap = {
        business_name: "f-business_name",
        category: "f-category",
        owner_name: "f-owner_name",
        phone: "f-phone",
        whatsapp: "f-whatsapp",
        city: "f-city",
        state: "f-state",
        products_services: "f-products"
      };
      Object.entries(requiredMap).forEach(([key, fieldId]) => {
        if (!Validate.required(fields[key])) {
          setFieldError(fieldId, "This field is required.");
          valid = false;
        }
      });
      if (fields.phone && !Validate.phone(fields.phone)) { setFieldError("f-phone", "Enter a valid phone number."); valid = false; }
      if (fields.whatsapp && !Validate.phone(fields.whatsapp)) { setFieldError("f-whatsapp", "Enter a valid WhatsApp number."); valid = false; }
      if (!valid) return;

      const btn = document.getElementById("submitBtn");
      btn.disabled = true;
      btn.textContent = "Saving...";

      try {
        await DB.upsertBusiness({ user_id: session.user.id, ...fields });
        window.location.href = "/dashboard.html";
      } catch (err) {
        console.error(err);
        showFormMsg("formMsg", friendlyDbError(err), "error");
        btn.disabled = false;
        btn.textContent = "Save & Go to Dashboard";
      }
    });
  })();
})();
