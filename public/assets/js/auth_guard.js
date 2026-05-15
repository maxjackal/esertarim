(async function () {
    // Flicker önlemek için sayfayı gizle
    const style = document.createElement('style');
    style.id = 'auth-guard-style';
    style.innerHTML = 'body { opacity: 0 !important; pointer-events: none !important; transition: opacity 0.2s ease; } body.auth-ready { opacity: 1 !important; pointer-events: auto !important; }';
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
        window.location.replace(targetPath);
    };

    try {
        const { data: { session }, error } = await window.sb.auth.getSession();
        console.log('auth_guard.js - session result:', session ? 'Valid Session' : 'No Session');
        console.log('auth_guard.js - current path:', currentPath);

        if (error) {
            console.error('auth_guard.js - Session error:', error);
        }

        if (session) {
            if (isPublic) {
                console.log('auth_guard.js - redirect path: /pages/dashboard.html');
                safeRedirect('/pages/dashboard.html');
            } else {
                showPage();
            }
        } else {
            if (!isPublic) {
                console.log('auth_guard.js - redirect path: /pages/login.html');
                safeRedirect('/pages/login.html');
            } else {
                showPage();
            }
        }
    } catch (err) {
        console.error('auth_guard.js - Error checking session:', err);
        if (!isPublic) {
            safeRedirect('/pages/login.html');
        } else {
            showPage();
        }
    }
})();
