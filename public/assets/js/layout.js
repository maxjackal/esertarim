(() => {
  const SIDEBAR_PATH = "/components/sidebar.html";
  const TOPBAR_PATH = "/components/topbar.html";
  const STORAGE_KEY = "hal_sidebar_collapsed";
  const MOBILE_QUERY = "(max-width: 960px)";

  function isMobileLayout() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  async function loadComponent(selector, path) {
    const el = document.querySelector(selector);
    if (!el) return;

    const res = await fetch(path);
    if (!res.ok) {
      window.AppSecurity?.error(`Component yüklenemedi: ${path}`);
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

  function closeMobileSidebar() {
    document.body.classList.remove("sidebar-mobile-open");
    document.getElementById("sidebarToggleBtn")?.setAttribute("aria-expanded", "false");
  }

  function toggleMobileSidebar() {
    const isOpen = document.body.classList.toggle("sidebar-mobile-open");
    document.getElementById("sidebarToggleBtn")?.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  function ensureSidebarOverlay() {
    if (document.querySelector(".app-sidebar-backdrop")) return;

    const backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "app-sidebar-backdrop";
    backdrop.setAttribute("aria-label", "Menüyü kapat");
    backdrop.addEventListener("click", closeMobileSidebar);
    document.body.appendChild(backdrop);
  }

  function bindSidebarToggle() {
    const btn = document.getElementById("sidebarToggleBtn");
    if (!btn) return;

    btn.setAttribute("aria-controls", "sidebarMount");
    btn.setAttribute("aria-expanded", "false");

    btn.addEventListener("click", () => {
      if (isMobileLayout()) {
        toggleMobileSidebar();
        return;
      }

      const next = !(localStorage.getItem(STORAGE_KEY) === "1");
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      applySidebarState();
    });

    document.querySelectorAll(".app-nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        if (isMobileLayout()) closeMobileSidebar();
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMobileSidebar();
    });

    window.addEventListener("resize", () => {
      if (!isMobileLayout()) closeMobileSidebar();
    });
  }

  function bindLogout() {
    const btn = document.getElementById("logoutBtn");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      btn.setAttribute("disabled", "disabled");
      try {
        if (window.sb?.auth) {
          await window.sb.auth.signOut();
        }
      } finally {
        window.location.replace("/pages/login");
      }
    });
  }

  async function initLayout() {
    await Promise.all([
      loadComponent("#sidebarMount", SIDEBAR_PATH),
      loadComponent("#topbarMount", TOPBAR_PATH),
    ]);

    ensureSidebarOverlay();
    applySidebarState();
    setPageTitleFromBody();
    setActiveNav();
    bindSidebarToggle();
    bindLogout();
  }

  document.addEventListener("DOMContentLoaded", initLayout);
})();
