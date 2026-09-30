import { release } from './release.mjs';

// The bridge drawing is rasterised once; only composited transforms animate at runtime.
export function startIntro() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches,
    root = document.createElement('div'), start = performance.now();
  root.id = 'intro';
  root.className = reduce ? 'intro reduced' : 'intro';
  root.innerHTML = `<div class="intro-grid"></div>
    <div class="intro-reveal"><div class="intro-reveal-inner"><img class="intro-drawing" src="./intro-bridge.png" alt="" width="1200" height="420"></div></div>
    <div class="intro-brand"><h1>Bridge<span>Sketch</span> <em>3D</em></h1>
      <p>A quick visual tool for bridge concepts</p><p class="intro-author">by ${release.author} · v${release.version}</p>
      <div class="intro-progress"><i></i></div><small class="intro-status">Preparing the site…</small></div>
    <button class="intro-skip" type="button">Skip</button>`;
  document.body.append(root);
  const bar = root.querySelector('.intro-progress i'), status = root.querySelector('.intro-status');
  let done = false, resolveExit;
  const exited = new Promise(resolve => (resolveExit = resolve));
  const leave = () => {
    if (done) return;
    done = true;
    removeEventListener('keydown', skip);
    root.classList.add('leaving');
    resolveExit();
    setTimeout(() => root.remove(), 250);
  };
  const skip = e => { if (['Escape', 'Enter', ' '].includes(e.key)) leave(); };
  root.querySelector('button').onclick = leave;
  addEventListener('keydown', skip);
  const painted = root.querySelector('img').decode().catch(() => {}).then(
    () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  return {
    exited, painted,
    progress(fraction, text) {
      if (done) return;
      bar.style.transform = `scaleX(${Math.max(0.04, Math.min(1, fraction))})`;
      if (text) status.textContent = text;
    },
    ready() {
      this.progress(1, 'Ready');
      setTimeout(leave, Math.max(0, (reduce ? 300 : 2000) - (performance.now() - start)));
    },
  };
}
