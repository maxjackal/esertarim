// assets/js/supabase_client.js

const SUPABASE_URL = "https://noxbjvyswcvxuqobalxl.supabase.co";
const SUPABASE_KEY = "sb_publishable_qUjar9g0MArtm9TVR7bGqw_y2M-W6w6";

window.sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

window.sb.auth.onAuthStateChange((event, session) => {
    const publicPaths = ['/pages/login.html', '/giris'];
    const currentPath = window.location.pathname;
    
    if (event === 'SIGNED_OUT') {
        if (!publicPaths.some(p => currentPath.includes(p))) {
            window.location.href = '/pages/login.html';
        }
    } else if (event === 'SIGNED_IN') {
        if (publicPaths.some(p => currentPath.includes(p))) {
            window.location.href = '/';
        }
    }
});