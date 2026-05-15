// assets/js/supabase_client.js

const SUPABASE_URL = "https://noxbjvyswcvxuqobalxl.supabase.co";
const SUPABASE_KEY = "sb_publishable_qUjar9g0MArtm9TVR7bGqw_y2M-W6w6";

window.sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

window.sb.auth.onAuthStateChange((event, session) => {
    const publicPaths = ['/pages/login.html', '/pages/login', '/giris'];
    const currentPath = window.location.pathname;
    
    if (event === 'SIGNED_OUT') {
        const isPublic = publicPaths.some(p => currentPath === p || currentPath.startsWith(p));
        if (!isPublic) {
            window.location.replace('/pages/login.html');
        }
    }
    // We do NOT redirect on SIGNED_IN here to avoid race conditions with auth_guard.js
});