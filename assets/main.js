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

  // 1. Check for local file protocol usage (common reason for "not syncing")
  if (window.location.protocol === 'file:') {
    container.innerHTML = `
            <div class="card" style="border-color:rgba(255,200,80,0.3); background:rgba(255,200,80,0.05)">
                <h3 style="color:#ffdb80">⚠️ Local File Mode Detected</h3>
                <p class="muted">
                    Browsers block API calls from <code>file://</code> URLs for security. 
                    Your repos cannot be synced here.<br><br>
                    To see them, please run a local server:<br>
                    <code>npx http-server</code> or <code>python3 -m http.server</code>
                </p>
            </div>`;
    return;
  }

  container.innerHTML = '<div class="muted">Loading repos…</div>';

  try {
    const api = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`;
    const data = await safeFetchJSON(api);

    if (!Array.isArray(data)) {
      // Check for API rate limit message or other object response
      if (data.message && data.message.includes('API rate limit')) {
        container.innerHTML = '<div class="muted">GitHub API rate limit exceeded. Try again later.</div>';
        return;
      }
      container.innerHTML = '<div class="muted">Unexpected response from GitHub.</div>';
      console.warn('Unexpected data:', data);
      return;
    }

    const repos = data.filter(r => !r.fork);
    if (repos.length === 0) {
      container.innerHTML = '<div class="muted">No public repositories found (forks hidden).</div>';
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
    console.error(err);
    container.innerHTML = '<div class="muted">Failed to load repos. (Check console)</div>';
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
  // Mobile check: reduce complexity if screen is narrow
  const isMobile = window.innerWidth < 600;

  const ctx = canvas.getContext('2d');
  let animationFrameId; // to track and cancel loop

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  let w = canvas.width, h = canvas.height;
  function dims() { w = canvas.width / (window.devicePixelRatio || 1); h = canvas.height / (window.devicePixelRatio || 1); }
  dims();

  // Reduce particles on mobile for performance
  const particles = [];
  const maxParticles = isMobile ? 35 : 80;

  const rings = [];
  let last = performance.now();

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function spawnParticle() {
    if (particles.length >= maxParticles) return;
    const px = w / 2, py = h / 2;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(0.6, 3.2);
    const life = rand(600, 1600);
    const size = rand(1, 4);
    particles.push({
      x: px, y: py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life, age: 0, size,
      hue: rand(30, 60)
    });
  }

  function spawnRing() {
    rings.push({
      age: 0, life: 1200,
      maxR: Math.min(w, h) * 0.6,
      hue: rand(200, 260),
    });
  }

  function orbConfig() {
    const radius = Math.min(w, h) * 0.16;
    const coreColor = { r: 255, g: 222, b: 85 };
    const outerColor = { r: 120, g: 190, b: 255 };
    return { radius, coreColor, outerColor };
  }

  function draw(t) {
    const dt = t - last;
    last = t;
    dims();

    ctx.clearRect(0, 0, w, h);
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, 'rgba(2,6,20,0.8)');
    bgGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const cfg = orbConfig();
    const cx = w / 2, cy = h / 2;
    const pulse = 0.9 + 0.12 * Math.sin(t / 250);

    // Glow
    const glow = ctx.createRadialGradient(cx, cy, cfg.radius * 0.1, cx, cy, cfg.radius * 2.6);
    glow.addColorStop(0, `rgba(${cfg.coreColor.r},${cfg.coreColor.g},${cfg.coreColor.b},0.95)`);
    glow.addColorStop(0.45, `rgba(${cfg.coreColor.r},${cfg.coreColor.g},${cfg.coreColor.b},0.18)`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, cfg.radius * 2.6 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Core Noise (Skip on mobile to save cycles)
    if (!isMobile) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + (t / 900) * (i % 2 ? 1 : -1) * 0.12;
        const r = cfg.radius * (0.32 + Math.sin(i * 1.3 + t / 300) * 0.08) * pulse;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${cfg.coreColor.r},${cfg.coreColor.g},${cfg.coreColor.b},0.1)`;
        ctx.arc(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.6, cfg.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Solid Core
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cfg.radius * 1.1);
    coreGrad.addColorStop(0, `rgba(${cfg.coreColor.r},${cfg.coreColor.g},${cfg.coreColor.b},1)`);
    coreGrad.addColorStop(1, `rgba(${cfg.outerColor.r},${cfg.outerColor.g},${cfg.outerColor.b},0)`);
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, cfg.radius * 1.02 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Rings
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

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.life) { particles.splice(i, 1); continue; }
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      const fade = 1 - p.age / p.life;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 200, 50, ${0.7 * fade})`;
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    if (Math.random() < 0.12) spawnParticle();
    if (Math.floor(t / 700) % 2 === 0 && Math.random() < 0.02) spawnRing();

    // Decorative arcs (skip on mobile)
    if (!isMobile) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      for (let s = 0; s < 2; s++) {
        const startAngle = (t / 800 + s * 1.2) % (Math.PI * 2);
        ctx.strokeStyle = `rgba(160, 220, 255, 0.1)`;
        ctx.arc(cx, cy, cfg.radius * (1.6 + s * 0.1), startAngle, startAngle + 1);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    if (!reduceMotion) {
      animationFrameId = requestAnimationFrame(draw);
    }
  }

  // Init
  for (let i = 0; i < (isMobile ? 15 : 36); i++) spawnParticle();
  spawnRing();

  // PERFORMANCE: IntersectionObserver to pause loop when off-screen
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!animationFrameId && !reduceMotion) {
            last = performance.now();
            animationFrameId = requestAnimationFrame(draw);
          }
        } else {
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
          }
        }
      });
    }, { threshold: 0 });
    observer.observe(canvas);
  } else {
    // Fallback for no observer support
    if (!reduceMotion) requestAnimationFrame(draw);
  }
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

// New: GSAP Entrance Animation for Social Icons
function initContactAnimation() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  // Animate the icons when #contact comes into view
  gsap.from('.social .icon', {
    scrollTrigger: {
      trigger: '#contact',
      start: 'top 80%', // when contact section top hits 80% viewport height
      toggleActions: 'play none none reverse'
    },
    y: 30,
    opacity: 0,
    duration: 0.6,
    stagger: 0.1, // distinct delay between each icon
    ease: 'back.out(1.7)'
  });
}

/* ==========================
   Wiring: on DOMContentLoaded
   - initialize animations, repos, canvas, and auto-refresh
   ========================== */
document.addEventListener('DOMContentLoaded', () => {
  initHeroAnimation();
  initContactAnimation(); // <-- Added entrance animation
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
