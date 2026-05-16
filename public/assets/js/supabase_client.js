// assets/js/supabase_client.js

const SUPABASE_URL = "https://noxbjvyswcvxuqobalxl.supabase.co";
const SUPABASE_KEY = "sb_publishable_qUjar9g0MArtm9TVR7bGqw_y2M-W6w6";

window.AppSecurity = window.AppSecurity || {
    isDev: ["localhost", "127.0.0.1"].includes(window.location.hostname),
    escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    },
    log(...args) {
        if (this.isDev) console.log(...args);
    },
    error(...args) {
        if (this.isDev) console.error(...args);
    }
};

window.sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage,
            flowType: "pkce"
        }
    }
);

window.sb.auth.onAuthStateChange((event, session) => {
    const publicPaths = ['/pages/login.html', '/pages/login', '/giris'];
    const currentPath = window.location.pathname;
    
    if (event === 'SIGNED_OUT') {
        const isPublic = publicPaths.some(p => currentPath === p || currentPath.startsWith(p));
        if (!isPublic) {
            const isLocalStaticServer = ["localhost", "127.0.0.1"].includes(window.location.hostname);
            window.location.replace(isLocalStaticServer ? '/pages/login.html' : '/pages/login');
        }
    }
    // We do NOT redirect on SIGNED_IN here to avoid race conditions with auth_guard.js
});
