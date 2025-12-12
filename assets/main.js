/* ============================================================
   main.js
   - All application JS (animations, GitHub fetch, interactions).
   - Heavily commented to explain non-obvious parts.
   ============================================================ */

/* ==========================
   Configuration
   ========================== */
// Default GitHub username shown at load; user can change via input
let GITHUB_USERNAME = 'Ayushchachan';

/* ==========================
   Utility: safeFetchJSON
   - tiny wrapper to centralize fetch error handling.
   ========================== */
async function safeFetchJSON(url) {
    try {
        const res = await fetch(url, { cache: 'no-cache' }); // avoid stale results when testing
        if (!res.ok) throw new Error('Network response not ok: ' + res.status);
        return await res.json();
    } catch (err) {
        console.error('Fetch error', err);
        throw err;
    }
}

/* ==========================
   GitHub Repos Auto-sync
   - Fetches public repos for a username and renders cards.
   - Notes:
   * GitHub unauthenticated API is rate-limited (60/hour per IP).
   * We request 'per_page=100' and sort by updated to show newest activity first.
   ========================== */
async function fetchAndRenderRepos(username) {
    const container = document.getElementById('repos');
    container.innerHTML = '<div class="muted">Loading repos…</div>';

    try {
        const api = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`;
        const data = await safeFetchJSON(api);

        if (!Array.isArray(data)) {
            container.innerHTML = '<div class="muted">No repos found or API limit reached.</div>';
            console.warn('Unexpected data from GitHub API', data);
            return;
        }

        // Filter forks to show user's original projects (optional).
        const repos = data.filter(r => !r.fork);

        if (repos.length === 0) {
            container.innerHTML = '<div class="muted">No public repositories (or only forks). Create a public repo to see it here.</div>';
            return;
        }

        // Clear and render
        container.innerHTML = '';
        repos.forEach(repo => {
            const card = document.createElement('article');
            card.className = 'card';
            card.innerHTML = `
        <h3><a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none">${escapeHtml(repo.name)}</a></h3>
        <p class="muted">${escapeHtml(repo.description || 'No description')}</p>
        <p class="muted" style="margin-top:8px;font-size:12px">Updated ${new Date(repo.updated_at).toLocaleString()}</p>
      `;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = '<div class="muted">Failed to load repos. Check console for details.</div>';
    }
}

/* escapeHtml: avoid injecting untrusted text into the DOM */
function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, function (m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#39;" }[m];
    });
}

/* ==========================
   Hero animation: GSAP + ScrollTrigger scrub
   - Animates the lid from closed -> open depending on scroll position.
   - Also adds mouse-based tilt for polish.
   - Respects prefers-reduced-motion.
   ========================== */
function initHeroAnimation() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
        // For users who prefer reduced motion, set final pose and do not animate.
        document.getElementById('lid').style.transform = 'rotateX(0deg)';
        return;
    }

    // Ensure gsap and ScrollTrigger exist
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        console.warn('GSAP or ScrollTrigger not found. Hero animation will be disabled.');
        return;
    }
    gsap.registerPlugin(ScrollTrigger);

    const lid = document.getElementById('lid');
    const laptop = document.getElementById('laptop');

    // Ensure consistent initial state (match CSS)
    gsap.set(lid, { transformOrigin: '50% 100%', rotateX: -85 });

    // Timeline driven by scroll: scrub ties progress to scroll position
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: '.hero',
            start: 'top center',
            end: 'bottom top',
            scrub: 0.6,
            // markers: true, // enable while debugging to see start/end
        }
    });

    // Animate lid: closed (-85deg) -> open (0deg)
    tl.to(lid, { rotateX: 0, duration: 1, ease: 'power2.out' }, 0);

    // Slight lift and scale for depth while scrubbing
    tl.to(laptop, { y: -24, scale: 1.02, duration: 1.2, ease: 'power2.out' }, 0);

    // Micro-bounce for delight near the end
    tl.to(laptop, { y: -8, duration: 0.6, ease: 'elastic.out(1, 0.4)' }, 0.95);

    // Continuous subtle float (independent loop) for polish
    gsap.to(laptop, { yPercent: 1.2, repeat: -1, yoyo: true, ease: 'sine.inOut', duration: 6 });

    // Mouse-based tilt: map pointer position to small rotations
    const scene = document.querySelector('.scene');
    scene.addEventListener('mousemove', (e) => {
        const r = scene.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        gsap.to(laptop, { rotationY: (px - 0.5) * 8, rotationX: (py - 0.5) * -6, duration: 0.6, ease: 'power1.out' });
    });
    scene.addEventListener('mouseleave', () => {
        gsap.to(laptop, { rotationY: 0, rotationX: 0, duration: 0.8, ease: 'power1.out' });
    });
}

/* ==========================
   Social icons interactions
   - Adds hover/focus animations for icons using GSAP
   ========================== */
function initSocialInteractions() {
    // If GSAP missing, use simple CSS fallback (no-op here)
    const iconEls = document.querySelectorAll('.icon');
    iconEls.forEach(el => {
        el.addEventListener('mouseenter', () => {
            if (typeof gsap !== 'undefined') gsap.to(el, { scale: 1.06, y: -6, duration: 0.28, ease: 'power2.out' });
        });
        el.addEventListener('mouseleave', () => {
            if (typeof gsap !== 'undefined') gsap.to(el, { scale: 1, y: 0, duration: 0.4, ease: 'elastic.out(1,0.6)' });
        });
        el.addEventListener('focus', () => {
            if (typeof gsap !== 'undefined') gsap.to(el, { scale: 1.04, y: -4, duration: 0.2 });
        });
        el.addEventListener('blur', () => {
            if (typeof gsap !== 'undefined') gsap.to(el, { scale: 1, y: 0, duration: 0.2 });
        });
    });
}

/* ==========================
   Wiring: DOMContentLoaded events and UI hooks
   ========================== */
document.addEventListener('DOMContentLoaded', () => {
    // init animations & interactions
    initHeroAnimation();
    initSocialInteractions();

    // GitHub repos controls
    const input = document.getElementById('gh-username');
    input.value = GITHUB_USERNAME || input.value || '';
    input.addEventListener('change', (e) => {
        GITHUB_USERNAME = e.target.value.trim();
    });

    document.getElementById('refresh-repos').addEventListener('click', () => {
        const username = (document.getElementById('gh-username').value || '').trim();
        if (!username) {
            alert('Please enter a GitHub username.');
            return;
        }
        GITHUB_USERNAME = ayushchachan;
        fetchAndRenderRepos(username);
    });

    // initial load
    fetchAndRenderRepos(GITHUB_USERNAME);

    // smooth scroll helpers
    document.getElementById('view-projects-btn').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('projects').scrollIntoView({ behavior: 'smooth' });
    });
    document.getElementById('contact-me').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
    });
});

/* ==========================
   Notes on auto-sync behavior:
   - This client-side approach fetches repos when the page loads (and on Refresh).
   - For automatic push updates (server->client) you'd need a backend + webhooks.
   - Optionally, you can enable periodic polling here (e.g., setInterval) if you
     want the page to refresh repos every N minutes without user interaction.
   ========================== */
