(async function () {
    // Flicker önlemek için sayfayı gizle
    const style = document.createElement('style');
    style.id = 'auth-guard-style';
    style.textContent = 'body { opacity: 0 !important; pointer-events: none !important; transition: opacity 0.2s ease; } body.auth-ready { opacity: 1 !important; pointer-events: auto !important; }';
    document.head.appendChild(style);

    const publicPaths = ['/pages/login.html', '/pages/login', '/giris', '/index.html', '/'];
    let currentPath = window.location.pathname;

    // Uzantı karmaşasını çözmek için .html kısmını atıp kontrol edebiliriz
    const currentPathClean = currentPath.endsWith('.html') ? currentPath.slice(0, -5) : currentPath;
    
    const isPublic = publicPaths.some(p => {
        const pClean = p.endsWith('.html') ? p.slice(0, -5) : p;
        return currentPathClean === pClean || (pClean !== '/' && currentPathClean.startsWith(pClean));
    });

    const showPage = () => {
        if (document.body) {
            document.body.classList.add('auth-ready');
            document.body.classList.remove('auth-loading');
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.classList.add('auth-ready');
                document.body.classList.remove('auth-loading');
            });
        }
        // Yedek olarak style etiketini kaldır
        setTimeout(() => {
            const s = document.getElementById('auth-guard-style');
            if (s) s.remove();
        }, 300);
    };

    const safeRedirect = (targetPath) => {
        const targetClean = targetPath.endsWith('.html') ? targetPath.slice(0, -5) : targetPath;
        if (currentPathClean === targetClean) {
            // Zaten bu sayfadayız, loop'u engelle
            showPage();
            return;
        }
        // Vercel cleanUrls ile tam uyum için .html olmadan yönlendir
        const isLocalStaticServer = ["localhost", "127.0.0.1"].includes(window.location.hostname);
        const localTarget = isLocalStaticServer && targetClean.startsWith("/pages/")
            ? `${targetClean}.html`
            : targetClean;
        window.location.replace(localTarget);
    };

    try {
        const { data: { session }, error } = await window.sb.auth.getSession();

        if (error) {
            window.AppSecurity?.error('auth_guard.js - Session error:', error);
        }

        if (session) {
            if (isPublic) {
                safeRedirect('/pages/dashboard');
            } else {
                showPage();
            }
        } else {
            if (!isPublic) {
                safeRedirect('/pages/login');
            } else {
                showPage();
            }
        }
    } catch (err) {
        window.AppSecurity?.error('auth_guard.js - Error checking session:', err);
        if (!isPublic) {
            safeRedirect('/pages/login');
        } else {
            showPage();
        }
    }
})();
