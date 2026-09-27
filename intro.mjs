// BridgeSketch 3D · Launch sequence (< 5 s): a blueprint elevation of a three-span haunched bridge draws
// itself (supports, soffit, deck, railings, dimension chain), the wordmark resolves, a progress rule follows
// the real start-up, then the sheet lifts off the live 3D scene while the camera settles on the bridge.
// Any click or key skips it; reduced-motion users get a short fade.

const svg = `
<svg viewBox="0 0 1200 420" aria-hidden="true" class="intro-drawing">
  <defs>
    <linearGradient id="introGlow" x1="0" x2="1">
      <stop offset="0" stop-color="#73e4c2" stop-opacity="0"/>
      <stop offset=".5" stop-color="#73e4c2"/>
      <stop offset="1" stop-color="#73e4c2" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <g class="intro-dims">
    <path pathLength="1" class="d" style="--d:1.35s" d="M130 150H1070M130 142v16M420 142v16M780 142v16M1070 142v16"/>
    <text x="275" y="136">SPAN 1</text><text x="600" y="136">SPAN 2</text><text x="925" y="136">SPAN 3</text>
  </g>
  <g class="intro-lines">
    <path pathLength="1" class="d" style="--d:.05s" d="M40 330H1160"/>
    <path pathLength="1" class="d thin" style="--d:.15s" d="M200 346q20-6 40 0t40 0M560 350q20-6 40 0t40 0M880 346q20-6 40 0t40 0"/>
    <path pathLength="1" class="d" style="--d:.25s" d="M80 330V236H132V330M1068 330V236H1120V330"/>
    <path pathLength="1" class="d" style="--d:.4s" d="M408 330V276H432V330M768 330V276H792V330M396 276H444M756 276H804"/>
    <path pathLength="1" class="d strong" style="--d:.6s" d="M132 246C230 250 360 256 420 272C480 256 540 248 600 247C660 248 720 256 780 272C840 256 970 250 1068 246"/>
    <path pathLength="1" class="d strong" style="--d:.85s" d="M112 228Q600 206 1088 228"/>
    <path pathLength="1" class="d thin" style="--d:1.05s" d="M112 214Q600 192 1088 214"/>
    <path pathLength="1" class="d thin posts" style="--d:1.15s" d="M150 227v-13M230 224v-13M310 222v-13M390 220v-13M470 218v-13M550 217v-13M630 217v-13M710 218v-13M790 219v-13M870 221v-13M950 223v-13M1030 226v-13"/>
  </g>
  <rect class="intro-scan" x="0" y="120" width="160" height="240" fill="url(#introGlow)" opacity=".18"/>
</svg>`;

export function startIntro() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches,
    start = performance.now(),
    root = document.createElement('div');
  root.id = 'intro';
  root.className = reduce ? 'intro reduced' : 'intro';
  root.innerHTML = `<div class="intro-grid"></div>${svg}
    <div class="intro-brand">
      <h1>Bridge<span>Sketch</span> <em>3D</em></h1>
      <p>A quick visual tool for bridge concepts</p>
      <div class="intro-progress"><i></i></div>
      <small class="intro-status">Preparing the site\u2026</small>
    </div>
    <button class="intro-skip" type="button">Skip</button>`;
  document.body.append(root);
  const bar = root.querySelector('.intro-progress i'),
    status = root.querySelector('.intro-status');
  let done = false,
    resolveExit;
  const exited = new Promise(r => (resolveExit = r));
  const leave = () => {
    if (done) return;
    done = true;
    bar.style.transform = 'scaleX(1)';
    root.classList.add('leaving');
    resolveExit();
    setTimeout(() => root.remove(), reduce ? 250 : 750);
  };
  root.addEventListener('click', leave);
  addEventListener('keydown', leave, { once: true });
  // Hard ceiling: whatever happens, the viewer is uncovered before 5 s.
  setTimeout(leave, 4300);
  return {
    exited,
    progress(fraction, text) {
      if (done) return;
      bar.style.transform = `scaleX(${Math.max(0.04, Math.min(1, fraction))})`;
      if (text) status.textContent = text;
    },
    // Leaves once the scene is ready, but not before the drawing has finished (about 2.6 s).
    ready() {
      this.progress(1, 'Ready');
      const wait = Math.max(0, (reduce ? 300 : 2600) - (performance.now() - start));
      setTimeout(leave, wait);
    },
  };
}
