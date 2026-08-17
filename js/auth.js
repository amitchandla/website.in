/* =========================================================
   BizGrow AI — Authentication
   Handles Sign Up, Login, Forgot Password and Reset Password.
   Each page only has the form relevant to it, so this file
   simply checks which form exists before wiring it up.
   ========================================================= */

(function () {
  const {
    showToast, showFormMsg, clearFormMsg,
    setFieldError, clearFieldError, clearAllFieldErrors,
    Validate, friendlyAuthError, DB
  } = window.BizGrowUtils;

  function setLoading(btn, loading, loadingText, normalText) {
    btn.disabled = loading;
    btn.textContent = loading ? loadingText : normalText;
  }

  /* ---------------- Sign Up ---------------- */
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAllFieldErrors(signupForm);
      clearFormMsg("formMsg");

      const fullName = document.getElementById("fullName").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      let valid = true;
      if (!Validate.required(fullName)) { setFieldError("f-name", "Please enter your full name."); valid = false; }
      if (!Validate.email(email)) { setFieldError("f-email", "Please enter a valid email address."); valid = false; }
      if (!Validate.minLength(password, 8)) { setFieldError("f-password", "Password must be at least 8 characters."); valid = false; }
      if (password !== confirmPassword) { setFieldError("f-confirm", "Passwords do not match."); valid = false; }
      if (!valid) return;

      const btn = document.getElementById("submitBtn");
      setLoading(btn, true, "Creating account...", "Start 7 Days Free");

      try {
        if (!window.supabaseClient) throw new Error("Supabase is not configured. Check js/config.js.");
        const { data, error } = await window.supabaseClient.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
        if (error) throw error;
        const user = data && data.user;
        if (!user) throw new Error("Supabase did not return a user after signup.");
        if (data.session) {
          try {
            await DB.upsertProfile({ id:user.id, full_name:fullName, email });
            await DB.createTrialSubscription(user.id);
          } catch (dbErr) { console.error("[BizGrow AI] Post-signup database setup:", dbErr); }
          showToast("Account created! Setting up your trial...", "success");
          window.location.href = "/onboarding.html";
        } else {
          showFormMsg("formMsg", "Account created successfully. Please check your email to confirm your address, then log in.", "success");
        }
      } catch (err) {
        console.error("[BizGrow AI] Signup error:", err);
        showFormMsg("formMsg", friendlyAuthError(err), "error");
      } finally {
        setLoading(btn, false, "", "Start 7 Days Free");
      }
    });
  }

  /* ---------------- Login ---------------- */
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAllFieldErrors(loginForm);
      clearFormMsg("formMsg");

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      let valid = true;
      if (!Validate.email(email)) { setFieldError("f-email", "Please enter a valid email address."); valid = false; }
      if (!Validate.required(password)) { setFieldError("f-password", "Please enter your password."); valid = false; }
      if (!valid) return;

      const btn = document.getElementById("submitBtn");
      setLoading(btn, true, "Logging in...", "Log In");

      try {
        if (!window.supabaseClient) throw new Error("Supabase is not configured. Check js/config.js.");
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const user = data && data.user;
        if (user) {
          try {
            const profile = await DB.getProfile(user.id);
            if (!profile) await DB.upsertProfile({ id:user.id, full_name:user.user_metadata?.full_name || "", email:user.email || email });
            await DB.createTrialSubscription(user.id);
          } catch (dbErr) { console.error("[BizGrow AI] Post-login database setup:", dbErr); }
        }
        window.location.href = "/dashboard.html";
      } catch (err) {
        console.error("[BizGrow AI] Login error:", err);
        showFormMsg("formMsg", friendlyAuthError(err), "error");
      } finally {
        setLoading(btn, false, "", "Log In");
      }
    });
  }

  /* ---------------- Forgot Password ---------------- */
  const forgotForm = document.getElementById("forgotForm");
  if (forgotForm) {
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAllFieldErrors(forgotForm);
      clearFormMsg("formMsg");

      const email = document.getElementById("email").value.trim();
      if (!Validate.email(email)) { setFieldError("f-email", "Please enter a valid email address."); return; }

      const btn = document.getElementById("submitBtn");
      setLoading(btn, true, "Sending...", "Send Reset Link");

      try {
        const redirectTo = window.location.origin + "/reset-password.html";
        const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
        showFormMsg("formMsg", "If an account exists for that email, a reset link is on its way.", "success");
      } catch (err) {
        showFormMsg("formMsg", friendlyAuthError(err), "error");
      } finally {
        setLoading(btn, false, "", "Send Reset Link");
      }
    });
  }

  /* ---------------- Reset Password ---------------- */
  const resetForm = document.getElementById("resetForm");
  if (resetForm) {
    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAllFieldErrors(resetForm);
      clearFormMsg("formMsg");

      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      let valid = true;
      if (!Validate.minLength(password, 8)) { setFieldError("f-password", "Password must be at least 8 characters."); valid = false; }
      if (password !== confirmPassword) { setFieldError("f-confirm", "Passwords do not match."); valid = false; }
      if (!valid) return;

      const btn = document.getElementById("submitBtn");
      setLoading(btn, true, "Updating...", "Update Password");

      try {
        const { error } = await window.supabaseClient.auth.updateUser({ password });
        if (error) throw error;
        showFormMsg("formMsg", "Password updated! Redirecting to login...", "success");
        setTimeout(() => (window.location.href = "/login.html"), 1500);
      } catch (err) {
        showFormMsg("formMsg", friendlyAuthError(err), "error");
      } finally {
        setLoading(btn, false, "", "Update Password");
      }
    });
  }
})();
