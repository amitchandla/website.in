/* =========================================================
   BizGrow AI — Landing page nav
   Opens/closes the mobile hamburger menu and closes it again
   whenever a link inside it is tapped or the viewport is
   resized back up to desktop width.
   ========================================================= */

(function () {
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("mobileMenu");
  if (!toggle || !menu) return;

  function closeMenu() {
    menu.classList.remove("open");
    toggle.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }
  function openMenu() {
    menu.classList.add("open");
    toggle.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
  }

  toggle.addEventListener("click", () => {
    if (menu.classList.contains("open")) closeMenu(); else openMenu();
  });

  menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) closeMenu();
  });
})();
