(() => {
  const SIDEBAR_PATH = "/components/sidebar.html";
  const TOPBAR_PATH = "/components/topbar.html";
  const STORAGE_KEY = "hal_sidebar_collapsed";

  async function loadComponent(selector, path) {
    const el = document.querySelector(selector);
    if (!el) return;

    const res = await fetch(path);
    if (!res.ok) {
      console.error(`Component yüklenemedi: ${path}`);
      return;
    }

    el.innerHTML = await res.text();
  }

  function setPageTitleFromBody() {
    const title = document.body.dataset.pageTitle || "Hal Takip";
    const titleEl = document.getElementById("topbarPageTitle");
    if (titleEl) titleEl.textContent = title;
    document.title = title;
  }

  function setActiveNav() {
    const path = window.location.pathname;
    document.querySelectorAll(".app-nav-link").forEach((link) => {
      const navPath = link.getAttribute("data-nav");
      if (!navPath) return;

      if (path === navPath) {
        link.classList.add("is-active");
      } else {
        link.classList.remove("is-active");
      }
    });
  }

  function applySidebarState() {
    const collapsed = localStorage.getItem(STORAGE_KEY) === "1";
    document.body.classList.toggle("sidebar-collapsed", collapsed);
  }

  function bindSidebarToggle() {
    const btn = document.getElementById("sidebarToggleBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const next = !(localStorage.getItem(STORAGE_KEY) === "1");
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      applySidebarState();
    });
  }
  (function () {
  const publicPaths = ["/giris", "/pages/login.html", "/", "/index.html"];

  const path = window.location.pathname;

  if (!publicPaths.includes(path)) {
    const user = localStorage.getItem("sb-qUjar9g0MArtm9TVR7bGqw-auth-token") || localStorage.getItem("authUser");

    if (!user) {
      window.location.href = "/pages/login.html";
    }
  }
})();

  async function initLayout() {
    await Promise.all([
      loadComponent("#sidebarMount", SIDEBAR_PATH),
      loadComponent("#topbarMount", TOPBAR_PATH),
    ]);

    applySidebarState();
    setPageTitleFromBody();
    setActiveNav();
    bindSidebarToggle();
  }

  document.addEventListener("DOMContentLoaded", initLayout);
})();