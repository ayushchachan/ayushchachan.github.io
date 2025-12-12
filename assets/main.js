/* main.js (updated)
   - Adds a canvas "DBZ-style" energy animation inside #dbz-canvas
   - Moves social icons handling untouched (they are now in Contact section)
   - Keeps repo fetch, GSAP hero animation, and other interactions.
   - Inline comments explain the DBZ canvas logic in detail.
*/

/* ==========================
   Configuration
   ========================== */
// GitHub username is still configured here (not visible in UI)
const GITHUB_USERNAME = 'Ayushchachan';

// Auto-refresh: 2 minutes (keeps repo list in sync)
const AUTO_REFRESH_INTERVAL_MS = 1000 * 60 * 2;

/* ==========================
   Utility: safeFetchJSON
   ========================== */
async function safeFetchJSON(url) {
    try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error('Network response not ok: ' + res.status);
        return await res.json();
    } catch (err) {
        console.error('Fetch error', err);
        throw err;
    }
}

/* ==========================
   GitHub repo fetch & render (unchanged logic)
   ========================== */
async function fetchAndRenderRepos() {
    const username = GITHUB_USERNAME;
    const container = document.getElementById('repos');
    container.innerHTML = '<div class="muted">Loading repos…</div>';

    try {
        const api = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`;
        const data = await safeFetchJSON(api);

        if (!Array.isArray(data)) {
            container.innerHTML = '<div class="muted">No repos found or API error.</div>';
            console.warn('Unexpected data from GitHub API', data);
            return;
        }

        const repos = data.filter(r => !r.fork);
        if (repos.length === 0) {
            container.innerHTML = '<div class="muted">No public repositories (or only forks).</div>';
            return;
        }

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

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, function (m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#39;" }[m];
    });
}

/* ==========================
   DBZ-style canvas animation
   - Creates a stylized "energy sphere / ki blast" animation with particles,
     shockwaves, and radial glow — inspired by DBZ energy effects but fully original.
   - Animation is implemented in plain Canvas API for portability.
   - Respects prefers-reduced-motion: if set, the animation shows a static glow.
   ========================== */
function initDbzCanvas() {
    const canvas = document.getElementById('dbz-canvas');
    if (!canvas) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');

    // sizing helper: make canvas match CSS size (pixel ratio aware)
    function resize() {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    // Central energy orb position (center of canvas)
    let w = canvas.width, h = canvas.height;
    function dims() { w = canvas.width / (window.devicePixelRatio || 1); h = canvas.height / (window.devicePixelRatio || 1); }
    dims();

    // Particle system for sparks that orbit/fly off the orb
    const particles = [];
    const maxParticles = 80;

    // Shockwave rings for the pulsing effect
    const rings = [];

    // Time tracking
    let last = performance.now();

    // Utility random helpers
    function rand(min, max) { return Math.random() * (max - min) + min; }
    function rgba(r, g, b, a) { return `rgba(${r},${g},${b},${a})`; }

    // Create initial particle burst
    function spawnParticle() {
        if (particles.length >= maxParticles) return;
        const px = w / 2, py = h / 2;
        const angle = rand(0, Math.PI * 2);
        const speed = rand(0.6, 3.2);
        const life = rand(600, 1600); // ms
        const size = rand(1, 4);
        particles.push({
            x: px,
            y: py,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life,
            age: 0,
            size,
            hue: rand(30, 60) // warm yellow/orange-ish sparks
        });
    }

    // Add a pulsing ring
    function spawnRing() {
        rings.push({
            age: 0,
            life: 1200,
            maxR: Math.min(w, h) * 0.6,
            hue: rand(200, 260), // bluish/purple ring
        });
    }

    // Orb configuration (colors and radius)
    function orbConfig() {
        const radius = Math.min(w, h) * 0.16; // relative radius
        const coreColor = { r: 255, g: 222, b: 85 }; // warm inner core
        const outerColor = { r: 120, g: 190, b: 255 }; // electric outer tint
        return { radius, coreColor, outerColor };
    }

    // Main draw loop
    function draw(t) {
        const dt = t - last;
        last = t;
        dims();

        // Clear with a subtle radial background so orb pops
        ctx.clearRect(0, 0, w, h);
        // very subtle vignette
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, 'rgba(2,6,20,0.8)');
        bgGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        const cfg = orbConfig();
        const cx = w / 2, cy = h / 2;

        // pulsing scale parameter (sin-based) to make the orb breathe
        const pulse = 0.9 + 0.12 * Math.sin(t / 250);

        // Draw outer glow (radial gradient)
        const glow = ctx.createRadialGradient(cx, cy, cfg.radius * 0.1, cx, cy, cfg.radius * 2.6);
        glow.addColorStop(0, `rgba(${cfg.coreColor.r},${cfg.coreColor.g},${cfg.coreColor.b},0.95)`);
        glow.addColorStop(0.45, `rgba(${cfg.coreColor.r},${cfg.coreColor.g},${cfg.coreColor.b},0.18)`);
        glow.addColorStop(0.8, `rgba(${cfg.outerColor.r},${cfg.outerColor.g},${cfg.outerColor.b},0.06)`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, cfg.radius * 2.6 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Inner noisy core (use many small arcs for texture)
        for (let i = 0; i < 18; i++) {
            const a = (i / 18) * Math.PI * 2 + (t / 900) * (i % 2 ? 1 : -1) * 0.12;
            const r = cfg.radius * (0.32 + Math.sin(i * 1.3 + t / 300) * 0.08) * pulse;
            ctx.beginPath();
            ctx.fillStyle = `rgba(${cfg.coreColor.r + rand(-10, 10)},${cfg.coreColor.g + rand(-10, 10)},${cfg.coreColor.b},${0.06 + Math.random() * 0.12})`;
            ctx.arc(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.6, cfg.radius * 0.7 * (0.05 + Math.random() * 0.08), 0, Math.PI * 2);
            ctx.fill();
        }

        // Bright core
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cfg.radius * 1.1);
        coreGrad.addColorStop(0, `rgba(${cfg.coreColor.r},${cfg.coreColor.g},${cfg.coreColor.b},1)`);
        coreGrad.addColorStop(0.5, `rgba(${cfg.coreColor.r},${cfg.coreColor.g},${cfg.coreColor.b},0.6)`);
        coreGrad.addColorStop(1, `rgba(${cfg.outerColor.r},${cfg.outerColor.g},${cfg.outerColor.b},0.06)`);
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, cfg.radius * 1.02 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Shockwave rings
        for (let i = rings.length - 1; i >= 0; i--) {
            const ring = rings[i];
            ring.age += dt;
            const progress = ring.age / ring.life;
            if (progress >= 1) { rings.splice(i, 1); continue; }
            const r = cfg.radius * (1 + progress * 6);
            ctx.beginPath();
            ctx.lineWidth = 1.2 * (1 - progress);
            ctx.strokeStyle = `rgba(120,180,255,${0.28 * (1 - progress)})`;
            ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.age += dt;
            if (p.age >= p.life) { particles.splice(i, 1); continue; }
            // simple movement with slight noise
            p.x += p.vx * (dt / 16) + Math.sin((p.age + i * 13) / 120) * 0.2;
            p.y += p.vy * (dt / 16) + Math.cos((p.age + i * 7) / 90) * 0.2;
            const fade = 1 - p.age / p.life;

            ctx.beginPath();
            ctx.fillStyle = `rgba(${200 + Math.round((p.hue % 60)), ${ 160 + Math.round((p.hue % 40)) }, ${ 40 + Math.round((p.hue % 30)) }, ${ 0.7 * fade })`;
      ctx.arc(p.x, p.y, p.size * (0.6 + (1 - fade)), 0, Math.PI*2);
      ctx.fill();
    }

    // occasional random micro-sparks
    if (Math.random() < 0.12) spawnParticle();

    // periodic ring spawn synced to time
    if (Math.floor(t / 700) % 2 === 0 && Math.random() < 0.02) {
      spawnRing();
    }

    // subtle static electric arcs (decorative)
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    for (let s = 0; s < 3; s++) {
      const startAngle = (t/800 + s*1.2) % (Math.PI*2);
      const x1 = cx + Math.cos(startAngle) * cfg.radius * (1.6 + s*0.1);
      const y1 = cy + Math.sin(startAngle) * cfg.radius * (1.6 + s*0.1);
      const x2 = cx + Math.cos(startAngle + 0.6) * cfg.radius * (2.2 + s*0.15);
      const y2 = cy + Math.sin(startAngle + 0.6) * cfg.radius * (2.2 + s*0.15);
      ctx.strokeStyle = `rgba(160, 220, 255, ${ 0.06 + 0.12 * Math.random() })`;
      ctx.lineWidth = 1;
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx, cy, x2, y2);
      ctx.stroke();
    }

    // reset composite mode
    ctx.globalCompositeOperation = 'source-over';

    // If reduced motion, draw a simpler static orb and stop animating further
    if (reduceMotion) {
      // static glow drawn above is enough; do not request animation frames repeatedly
      return;
    }
    // loop
    requestAnimationFrame(draw);
  } // end draw()

  // initialize: spawn an initial set of particles and rings
  for (let i = 0; i < 36; i++) spawnParticle();
  spawnRing();
  spawnRing();

  // start the animation
  requestAnimationFrame(draw);

  // Expose a simple pulse trigger (used optionally by other code)
  return {
    triggerPulse: () => spawnRing()
  };
}

/* ==========================
   Hero animation (GSAP) and social interactions
   - kept same as before, unchanged behaviour
   ========================== */
function initHeroAnimation() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    document.getElementById('lid').style.transform = 'rotateX(0deg)';
    return;
  }

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('GSAP or ScrollTrigger not found. Hero animation disabled.');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  const lid = document.getElementById('lid');
  const laptop = document.getElementById('laptop');
  gsap.set(lid, { transformOrigin: '50% 100%', rotateX: -85 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.hero',
      start: 'top center',
      end: 'bottom top',
      scrub: 0.6,
    }
  });
  tl.to(lid, { rotateX: 0, duration: 1, ease: 'power2.out' }, 0);
  tl.to(laptop, { y: -24, scale: 1.02, duration: 1.2, ease: 'power2.out' }, 0);
  tl.to(laptop, { y: -8, duration: 0.6, ease: 'elastic.out(1, 0.4)' }, 0.95);
  gsap.to(laptop, { yPercent: 1.2, repeat: -1, yoyo: true, ease: 'sine.inOut', duration: 6 });

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

function initSocialInteractions() {
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
   Wiring: on DOMContentLoaded
   - initialize animations, repos, canvas, and auto-refresh
   ========================== */
document.addEventListener('DOMContentLoaded', () => {
  initHeroAnimation();
  initSocialInteractions();

  // initialize canvas animation
  try {
    initDbzCanvas();
  } catch (err) {
    console.error('DBZ canvas init failed:', err);
  }

  // initial repo load
  fetchAndRenderRepos();
  // periodic update to auto-sync new public repos
  setInterval(fetchAndRenderRepos, AUTO_REFRESH_INTERVAL_MS);

  // smooth scroll buttons
  const vp = document.getElementById('view-projects-btn');
  if (vp) vp.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('projects').scrollIntoView({ behavior: 'smooth' }); });
  const cm = document.getElementById('contact-me');
  if (cm) cm.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('contact').scrollIntoView({ behavior: 'smooth' }); });
});

/* ==========================
   Notes:
   - The DBZ-style animation uses geometry and particle systems to evoke energy effects.
   - If you'd like a different look (e.g., actual character silhouette animation, or a sequence
     of frames), I can implement a frame-by-frame sprite or Lottie-based vector animation next.
   - No changes were made to assets/styles.css; only index.html and assets/main.js were updated.
   ========================== */
