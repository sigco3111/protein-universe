// 단백질 유니버스 - 앱 로직
import { PROTEINS, CATEGORIES, EDGES, CENTERS, WORLD, LEGEND_THRESHOLD, MILESTONES, plddtColor, byAcc, visibleProteins } from './data.js';

const LS_DISCOVERED = 'pu_discovered';
const LS_BEST = 'pu_quiz_best';
const LS_PLAYS = 'pu_quiz_plays';
const LS_MUSEUM_SEEN = 'pu_museum_seen';
const LS_LEGEND = 'pu_legend_revealed';
const LS_MILESTONES = 'pu_milestones';
const LS_SOUND = 'pu_sound';
const LS_BEST_TA = 'pu_challenge_best_timeattack';
const LS_BEST_SV = 'pu_challenge_best_survival';

// 저장소 접근이 막힌 환경(사생활 보호 모드·용량 초과)에서도 앱이 멈추지 않도록 감싼다.
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* 저장 불가 시 이번 세션만 유지되지 않음 */ } },
};

const store = {
  discovered() {
    try { return JSON.parse(ls.get(LS_DISCOVERED) || '[]'); } catch { return []; }
  },
  addDiscovered(acc) {
    const d = store.discovered();
    if (!d.includes(acc)) { d.push(acc); ls.set(LS_DISCOVERED, JSON.stringify(d)); }
  },
  best() { return parseInt(ls.get(LS_BEST) || '0', 10) || 0; },
  setBest(v) { ls.set(LS_BEST, String(v)); },
  plays() { return parseInt(ls.get(LS_PLAYS) || '0', 10) || 0; },
  addPlay() { ls.set(LS_PLAYS, String(store.plays() + 1)); },
  museumSeen() {
    try { return JSON.parse(ls.get(LS_MUSEUM_SEEN) || '[]'); } catch { return []; }
  },
  setMuseumSeen(list) { ls.set(LS_MUSEUM_SEEN, JSON.stringify(list)); },
  legendRevealed() { return ls.get(LS_LEGEND) === '1'; },
  revealLegend() { ls.set(LS_LEGEND, '1'); },
  milestones() {
    try { return JSON.parse(ls.get(LS_MILESTONES) || '[]'); } catch { return []; }
  },
  addMilestone(m) {
    const ms = store.milestones();
    if (!ms.includes(m)) { ms.push(m); ls.set(LS_MILESTONES, JSON.stringify(ms)); }
  },
  soundOn() { return ls.get(LS_SOUND) !== '0'; },
  setSound(on) { ls.set(LS_SOUND, on ? '1' : '0'); },
  bestChallenge(mode) {
    return parseInt(ls.get(mode === 'survival' ? LS_BEST_SV : LS_BEST_TA) || '0', 10) || 0;
  },
  setBestChallenge(mode, v) { ls.set(mode === 'survival' ? LS_BEST_SV : LS_BEST_TA, String(v)); },
};

const $ = (sel) => document.querySelector(sel);
const app = () => $('#screen');
const cleanup = [];

/* ---------- 사운드 (WebAudio 합성, 외부 파일 없음) ---------- */

const sfx = (() => {
  let ctx = null;
  function ac() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, t0, dur, type, vol, slideTo) {
    const c = ac(); if (!c) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime + t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + t0 + dur);
    g.gain.setValueAtTime(0.0001, c.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, c.currentTime + t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(c.currentTime + t0);
    osc.stop(c.currentTime + t0 + dur + 0.05);
  }
  const on = () => store.soundOn();
  return {
    correct() { if (on()) { tone(660, 0, 0.12, 'sine', 0.16); tone(880, 0.09, 0.16, 'sine', 0.16); } },
    wrong() { if (on()) tone(200, 0, 0.28, 'square', 0.1, 120); },
    discover() {
      if (!on()) return;
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.22, 'sine', 0.15));
      tone(2093, 0.28, 0.4, 'sine', 0.05);
    },
    milestone() {
      if (!on()) return;
      [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.16));
    },
    reveal() {
      if (!on()) return;
      [262, 392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.14, 0.5, 'triangle', 0.15));
    },
    tick() { if (on()) tone(1200, 0, 0.05, 'sine', 0.08); },
    finish() {
      if (!on()) return;
      [523, 659, 784].forEach((f, i) => tone(f, i * 0.1, 0.25, 'triangle', 0.14));
    },
  };
})();

/* ---------- 파티클 이펙트 (풀스크린 캔버스) ---------- */

const fx = (() => {
  let canvas = null, ctx = null, raf = null, particles = [];
  function ensure() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'fx-canvas';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
  }
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function loop() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const now = performance.now();
    particles = particles.filter((p) => now - p.born < p.life);
    for (const p of particles) {
      const t = (now - p.born) / p.life;
      p.x += p.vx; p.y += p.vy;
      p.vy += p.gravity; p.vx *= p.drag; p.vy *= p.drag;
      if (p.spin) { p.rot = (p.rot || 0) + p.spin; }
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.fillStyle = p.color;
      if (p.rect) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (particles.length) raf = requestAnimationFrame(loop);
    else { raf = null; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  function kick() {
    ensure(); resize();
    if (!raf) raf = requestAnimationFrame(loop);
  }
  return {
    // 별 발견: 지점에서 별빛 폭발
    burst(x, y, color) {
      const now = performance.now();
      const colors = [color || '#ffd54f', '#ffffff', '#ffe9a8', '#9db8ff'];
      for (let i = 0; i < 70; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1.5 + Math.random() * 6.5;
        particles.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2,
          r: 1.2 + Math.random() * 3.2, color: colors[i % colors.length],
          born: now, life: 700 + Math.random() * 800, gravity: 0.08, drag: 0.985,
        });
      }
      kick();
    },
    // 마일스톤: 화면 전체 색종이
    confetti(gold) {
      const now = performance.now();
      const colors = gold
        ? ['#ffd54f', '#fff3c4', '#ffecb3', '#ffffff', '#ffc94d']
        : ['#5e97ff', '#6fd3f2', '#ff8a80', '#ffd180', '#b388ff', '#8ff0b8'];
      for (let i = 0; i < 130; i++) {
        particles.push({
          x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.35,
          vx: (Math.random() - 0.5) * 1.6, vy: 2 + Math.random() * 3.4,
          r: 3 + Math.random() * 4, color: colors[i % colors.length],
          born: now, life: 2400 + Math.random() * 1400, gravity: 0.02, drag: 0.999,
          rect: true, spin: (Math.random() - 0.5) * 0.25,
        });
      }
      kick();
    },
  };
})();

/* ---------- 축하 오버레이 ---------- */

function celebrate({ title, sub, gold }) {
  const ov = document.createElement('div');
  ov.className = 'celebrate' + (gold ? ' gold' : '');
  ov.innerHTML = `
    <div class="celebrate-card">
      <div class="celebrate-emoji">${gold ? '🌟' : '🎉'}</div>
      <div class="celebrate-title">${title}</div>
      ${sub ? `<div class="celebrate-sub">${sub}</div>` : ''}
      <button class="celebrate-btn">계속하기</button>
    </div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('show'));
  fx.confetti(gold);
  ov.querySelector('.celebrate-btn').onclick = () => {
    ov.classList.remove('show');
    setTimeout(() => ov.remove(), 300);
  };
}

// 발견 후 마일스톤·전설 해금 판정
function afterDiscovery() {
  const disc = store.discovered();
  const nonLegend = disc.filter((a) => { const p = byAcc(a); return p && !p.legendary; }).length;

  if (!store.legendRevealed() && nonLegend >= LEGEND_THRESHOLD) {
    store.revealLegend();
    store.addMilestone(LEGEND_THRESHOLD);
    sfx.reveal();
    celebrate({
      title: '전설의 별이 나타났습니다!',
      sub: `별 ${LEGEND_THRESHOLD}개 발견 — 우주 지도 아래쪽에 숨겨져 있던 전설의 성단이 모습을 드러냈습니다. 지도를 내려 찾아보세요.`,
      gold: true,
    });
    return;
  }
  const m = MILESTONES.find((v) => v === disc.length && !store.milestones().includes(v));
  if (m) {
    store.addMilestone(m);
    sfx.milestone();
    const full = m === PROTEINS.length;
    celebrate({
      title: full ? '모든 별을 발견했습니다!' : `${m}개의 별 발견!`,
      sub: full
        ? '단백질 유니버스를 정복했습니다. 이제 도전 탭에서 기록에 도전해 보세요.'
        : `박물관의 ${Math.round((m / PROTEINS.length) * 100)}%가 채워졌습니다.`,
    });
  }
}

/* ---------- 3D 뷰어 (PDBe Mol*) ---------- */

// pdbe-molstar 컴포넌트는 구조 로딩 시 'pdbe-molstar.added-component' 이벤트를 발행한다.
// 버블링되므로 e.target이 해당 엘리먼트.
const viewerLoads = new Map(); // el -> {resolve}
let viewerBusInit = false;
function initViewerBus() {
  if (viewerBusInit) return;
  viewerBusInit = true;
  document.addEventListener('pdbe-molstar.added-component', (e) => {
    let rec = viewerLoads.get(e.target);
    if (!rec && viewerLoads.size) {
      const [k, v] = viewerLoads.entries().next().value;
      rec = v; viewerLoads.delete(k);
    } else if (rec) viewerLoads.delete(e.target);
    if (rec) rec.resolve('loaded');
  });
}

function createViewer(container, p, onState) {
  container.innerHTML = '';
  const el = document.createElement('pdbe-molstar');
  el.setAttribute('custom-data-url', p.cif);
  el.setAttribute('custom-data-format', 'cif');
  el.setAttribute('alphafold-view', 'true');
  el.setAttribute('bg-color-r', '10');
  el.setAttribute('bg-color-g', '14');
  el.setAttribute('bg-color-b', '30');
  el.setAttribute('hide-controls', 'true');
  el.setAttribute('hide-expand-icon', 'true');
  el.setAttribute('hide-animation-icon', 'true');
  el.style.width = '100%';
  el.style.height = '100%';
  el.style.display = 'block';
  container.appendChild(el);

  initViewerBus();
  const timer = setTimeout(() => {
    viewerLoads.delete(el);
    if (onState) onState('timeout');
  }, 15000);
  viewerLoads.set(el, {
    resolve: (s) => { clearTimeout(timer); if (onState) onState(s); },
  });
  return el;
}

/* ---------- 화면: 우주맵 ---------- */

function renderUniverse(root) {
  const discovered = store.discovered();
  const revealed = store.legendRevealed();
  const visible = visibleProteins(revealed || discovered.some((a) => byAcc(a) && byAcc(a).legendary));
  const total = revealed ? PROTEINS.length : PROTEINS.length - PROTEINS.filter((p) => p.legendary).length;
  root.innerHTML = `
    <div class="universe-wrap">
      <div class="universe-hud">
        <div class="hud-title">단백질 유니버스</div>
        <div class="hud-sub">실제 단백질 ${PROTEINS.length}개가 별로 떠 있습니다. 별을 눌러 발견하세요.</div>
        <div class="hud-row">
          <span class="hud-progress">발견 ${discovered.length}/${total}</span>
          ${revealed ? '<span class="hud-progress legend-on">전설의 성단 출현</span>' : ''}
        </div>
      </div>
      <button class="sound-btn" id="sound-btn" title="효과음">${store.soundOn() ? '🔊' : '🔇'}</button>
      <canvas id="space"></canvas>
      <div class="universe-hint">드래그로 이동 · 핀치/휠로 확대 · 별을 탭하면 상세</div>
      ${attribution()}
    </div>`;

  $('#sound-btn').onclick = (e) => {
    const onNow = !store.soundOn();
    store.setSound(onNow);
    e.target.textContent = onNow ? '🔊' : '🔇';
    if (onNow) sfx.correct();
  };

  const canvas = $('#space');
  const ctx = canvas.getContext('2d');
  const view = { x: WORLD.w / 2, y: WORLD.h / 2, scale: 1 };
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let cw = 0, ch = 0;

  // 배경 장식 별 (고정)
  const bgStars = [];
  let seed = 42;
  const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 380; i++) {
    bgStars.push({ x: rand() * WORLD.w, y: rand() * WORLD.h, r: 0.4 + rand() * 1.2, a: 0.15 + rand() * 0.5 });
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    cw = rect.width; ch = rect.height;
    canvas.width = cw * dpr; canvas.height = ch * dpr;
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    if (!resize.init) {
      resize.init = true;
      view.scale = Math.min(cw / WORLD.w, ch / WORLD.h);
      view.y = Math.min(WORLD.h / 2, ch / 2 / view.scale);
      view.y = ch / 2 / view.scale > WORLD.h / 2 ? WORLD.h / 2 : 750;
    }
  }
  resize();

  const toScreen = (wx, wy) => ({
    x: (wx - view.x) * view.scale + cw / 2,
    y: (wy - view.y) * view.scale + ch / 2,
  });

  const isVisible = (p) => !p.legendary || store.legendRevealed() || store.discovered().includes(p.acc);

  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    // 배경
    const g = ctx.createRadialGradient(cw / 2, ch * 0.35, 50, cw / 2, ch / 2, Math.max(cw, ch));
    g.addColorStop(0, '#111a38');
    g.addColorStop(1, '#05070f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);

    // 장식 별
    for (const s of bgStars) {
      const p = toScreen(s.x, s.y);
      const tw = 0.6 + 0.4 * Math.sin(t / 900 + s.x);
      ctx.globalAlpha = s.a * tw;
      ctx.fillStyle = '#cdd8ff';
      ctx.beginPath(); ctx.arc(p.x, p.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 성단 연결선 (전설 성단은 해금 후에만)
    ctx.lineWidth = 1;
    for (const [a, b] of EDGES) {
      const pa = byAcc(a), pb = byAcc(b);
      if (!isVisible(pa) || !isVisible(pb)) continue;
      const sa = toScreen(pa.x, pa.y), sb = toScreen(pb.x, pb.y);
      ctx.strokeStyle = pa.legendary ? 'rgba(255,213,79,0.35)' : 'rgba(140,165,255,0.22)';
      ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(sb.x, sb.y); ctx.stroke();
    }

    // 성단 이름
    ctx.textAlign = 'center';
    ctx.font = '12px system-ui, sans-serif';
    for (const key of Object.keys(CENTERS)) {
      if (key === 'legend' && !store.legendRevealed() && !discovered.some((a) => byAcc(a) && byAcc(a).legendary)) continue;
      const [cx, cy] = CENTERS[key];
      const p = toScreen(cx, cy);
      ctx.fillStyle = key === 'legend' ? 'rgba(255,213,79,0.7)' : 'rgba(160,180,230,0.55)';
      ctx.fillText(CATEGORIES[key].name, p.x, p.y);
    }

    // 단백질 별
    const disc = store.discovered();
    for (const p of PROTEINS) {
      if (!isVisible(p)) continue;
      const s = toScreen(p.x, p.y);
      const known = disc.includes(p.acc);
      const color = p.legendary ? '#ffd54f' : plddtColor(p.plddt);
      const tw = 0.75 + 0.25 * Math.sin(t / 700 + p.x * 0.7);
      const baseR = Math.max(7, Math.min(15, p.length / 80)) * Math.pow(view.scale, 0.35);

      // 전설 별: 금색 맥동 고리
      if (p.legendary) {
        const ring = baseR * (3.6 + 0.5 * Math.sin(t / 500));
        ctx.globalAlpha = 0.5 * tw;
        ctx.strokeStyle = '#ffd54f';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(s.x, s.y, ring, 0, Math.PI * 2); ctx.stroke();
      }

      // 광륜
      const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, baseR * 3.2);
      glow.addColorStop(0, color + (known ? 'cc' : '55'));
      glow.addColorStop(1, color + '00');
      ctx.globalAlpha = known ? tw : 0.45 * tw;
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(s.x, s.y, baseR * 3.2, 0, Math.PI * 2); ctx.fill();

      // 중심
      ctx.globalAlpha = 1;
      ctx.fillStyle = known ? '#ffffff' : color;
      ctx.beginPath(); ctx.arc(s.x, s.y, baseR * 0.55, 0, Math.PI * 2); ctx.fill();

      // 라벨
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillStyle = known ? 'rgba(235,240,255,0.95)' : 'rgba(160,170,200,0.6)';
      const label = known ? (p.short || p.name) : p.legendary ? '전설의 별' : '?';
      ctx.fillText(label, s.x, s.y + baseR * 3.2 + 14);
    }

    raf = requestAnimationFrame(draw);
  }
  let raf = requestAnimationFrame(draw);

  // 조작: 드래그/핀치/휠/탭
  const pointers = new Map();
  let pinchDist = 0;
  let downAt = 0, downPos = null, moved = false;

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) { downAt = performance.now(); downPos = { x: e.clientX, y: e.clientY }; moved = false; }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      if (Math.abs(e.clientX - downPos.x) + Math.abs(e.clientY - downPos.y) > 8) moved = true;
      view.x -= dx / view.scale; view.y -= dy / view.scale;
      clampView();
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist > 0) {
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        zoomAt(mid, d / pinchDist);
      }
      pinchDist = d;
      moved = true;
    }
  });
  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size === 0 && downPos && !moved && performance.now() - downAt < 400) {
      hitTest(e.clientX, e.clientY);
    }
    if (pointers.size < 2) pinchDist = 0;
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt({ x: e.clientX, y: e.clientY }, e.deltaY < 0 ? 1.12 : 0.89);
  }, { passive: false });

  function zoomAt(screenPt, factor) {
    const rect = canvas.getBoundingClientRect();
    const sx = screenPt.x - rect.left, sy = screenPt.y - rect.top;
    const wx = view.x + (sx - cw / 2) / view.scale;
    const wy = view.y + (sy - ch / 2) / view.scale;
    view.scale = Math.max(0.35, Math.min(5, view.scale * factor));
    view.x = wx - (sx - cw / 2) / view.scale;
    view.y = wy - (sy - ch / 2) / view.scale;
    clampView();
  }
  function clampView() {
    view.x = Math.max(-100, Math.min(WORLD.w + 100, view.x));
    view.y = Math.max(-100, Math.min(WORLD.h + 100, view.y));
  }
  function hitTest(cx, cy) {
    const rect = canvas.getBoundingClientRect();
    const sx = cx - rect.left, sy = cy - rect.top;
    for (const p of PROTEINS) {
      if (!isVisible(p)) continue;
      const s = toScreen(p.x, p.y);
      const r = Math.max(22, Math.min(15, p.length / 80) * Math.pow(view.scale, 0.35) * 2.2);
      if (Math.hypot(s.x - sx, s.y - sy) < r) {
        location.hash = '#/p/' + p.acc;
        return;
      }
    }
  }

  cleanup.push(() => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
  });
  window.addEventListener('resize', resize);
}

/* ---------- 화면: 단백질 상세 ---------- */

function renderDetail(root, acc) {
  const p = byAcc(acc);
  if (!p) { location.hash = '#/'; return; }
  // 전설의 별인데 해금 전이면 지도로 돌려보냄
  if (p.legendary && !store.legendRevealed() && !store.discovered().includes(acc)) {
    location.hash = '#/'; return;
  }
  const known = store.discovered().includes(acc);
  root.innerHTML = `
    <div class="detail">
      <div class="detail-head">
        <button class="back-btn" id="back">← 우주로</button>
      </div>
      <div class="detail-viewer" id="viewer">
        <div class="viewer-loading" id="viewer-loading">3D 구조를 불러오는 중…</div>
      </div>
      <div class="detail-body">
        <div class="detail-title-row">
          <h1>${p.name}</h1>
          <span class="chip" style="--chip:${plddtColor(p.plddt)}">신뢰도 ${p.plddt}</span>
          ${p.legendary ? '<span class="chip chip-legend">✦ 전설의 별</span>' : ''}
        </div>
        <div class="detail-sub">${p.name_en} · ${p.organism} · ${p.length.toLocaleString()} aa</div>
        <p class="detail-role">${p.oneLiner}</p>
        <p class="detail-story">${p.story}</p>
        ${p.caution ? `<div class="caution">${p.caution}</div>` : ''}
        <div class="detail-legend">색상은 예측 신뢰도(pLDDT): 파랑 계열이 높고 노랑·주황 계열이 낮은 영역입니다.</div>
        <button class="discover-btn ${known ? 'done' : ''}" id="discover">
          ${known ? '✓ 박물관에 전시 중' : '별 발견 등록 · 박물관에 전시'}
        </button>
        ${attribution()}
      </div>
    </div>`;

  $('#back').onclick = () => { history.length > 1 ? history.back() : (location.hash = '#/'); };
  const btn = $('#discover');
  btn.onclick = () => {
    const isNew = !store.discovered().includes(acc);
    store.addDiscovered(acc);
    btn.classList.add('done');
    btn.textContent = '✓ 박물관에 전시 중';
    if (isNew) {
      const rect = btn.getBoundingClientRect();
      fx.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, p.legendary ? '#ffd54f' : plddtColor(p.plddt));
      sfx.discover();
      afterDiscovery();
    }
  };

  createViewer($('#viewer'), p, (state) => {
    const loading = $('#viewer-loading');
    if (!loading) return;
    if (state === 'loaded') loading.remove();
    else loading.textContent = '3D 뷰어를 불러오지 못했습니다. 네트워크나 브라우저 WebGL 상태를 확인해 주세요.';
  });
}

/* ---------- 화면: 박물관 ---------- */

function renderMuseum(root) {
  const disc = store.discovered();
  const revealed = store.legendRevealed() || disc.some((a) => byAcc(a) && byAcc(a).legendary);
  const visible = PROTEINS.filter((p) => !p.legendary || revealed);
  const sealed = PROTEINS.filter((p) => p.legendary && !revealed);
  const pct = Math.round((disc.length / visible.length) * 100);
  const seen = store.museumSeen();
  root.innerHTML = `
    <div class="museum">
      <div class="museum-head">
        <h1>내 박물관</h1>
        <div class="museum-progress"><div class="bar"><div class="fill" style="width:${pct}%"></div></div>
        <span>${disc.length}/${visible.length} 전시 중</span></div>
        <p class="museum-sub">우주에서 발견한 단백질이 여기에 전시됩니다. ${disc.length === 0 ? '아직 전시품이 없습니다. 탐험 탭에서 별을 찾아보세요.' : ''}</p>
      </div>
      <div class="museum-grid">
        ${visible.map((p) => {
          const known = disc.includes(p.acc);
          const isNew = known && !seen.includes(p.acc);
          return `<button class="exhibit ${known ? 'known' : 'unknown'} ${p.legendary ? 'legendary' : ''} ${isNew ? 'is-new' : ''}" data-acc="${known ? p.acc : ''}" ${known ? '' : 'disabled'}>
            ${isNew ? '<span class="new-badge">NEW</span>' : ''}
            <span class="exhibit-star" style="--star:${known ? (p.legendary ? '#c9a24b' : plddtColor(p.plddt)) : '#8b8578'}">${known ? '★' : p.legendary ? '✦' : '?'}</span>
            <span class="exhibit-name">${known ? p.name : p.legendary ? '전설의 별' : '미발견'}</span>
            <span class="exhibit-line">${known ? p.oneLiner : '우주에서 이 별을 찾아보세요'}</span>
          </button>`;
        }).join('')}
        ${sealed.map(() => `
          <button class="exhibit sealed" disabled>
            <span class="exhibit-star" style="--star:#c9a24b">✦</span>
            <span class="exhibit-name">전설의 별</span>
            <span class="exhibit-line">별 ${LEGEND_THRESHOLD}개를 발견하면 나타납니다</span>
          </button>`).join('')}
      </div>
      ${attribution()}
    </div>`;
  root.querySelectorAll('.exhibit.known').forEach((el) => {
    el.onclick = () => { location.hash = '#/p/' + el.dataset.acc; };
  });
  // 새 전시품은 잠시 NEW 표시 후 본 것으로 기록
  const fresh = disc.filter((a) => !seen.includes(a));
  if (fresh.length) {
    setTimeout(() => {
      store.setMuseumSeen([...new Set([...store.museumSeen(), ...disc])]);
    }, 1600);
  }
}

/* ---------- 화면: 퀴즈 ---------- */

const quiz = { streak: 0, pool: 'all', q: null, answered: false };

function renderQuiz(root) {
  const disc = store.discovered();
  const revealed = store.legendRevealed();
  const all = visibleProteins(revealed);
  const canMine = disc.length >= 4;
  if (quiz.pool === 'mine' && !canMine) quiz.pool = 'all';
  root.innerHTML = `
    <div class="quiz">
      <div class="quiz-head">
        <h1>이 단백질은 무엇일까?</h1>
        <div class="quiz-stats">
          <span class="chip">연속 정답 <b id="q-streak">${quiz.streak}</b></span>
          <span class="chip">최고 기록 <b>${store.best()}</b></span>
        </div>
        <div class="quiz-pool">
          <button class="pool-btn ${quiz.pool === 'all' ? 'on' : ''}" data-pool="all">전체 출제</button>
          <button class="pool-btn ${quiz.pool === 'mine' ? 'on' : ''}" data-pool="mine" ${canMine ? '' : 'disabled title="4개 이상 발견하면 열립니다"'}>발견한 것만 ${canMine ? '' : '(4개 이상 발견 시)'}</button>
        </div>
      </div>
      <div class="quiz-viewer" id="quiz-viewer"><div class="viewer-loading">문제를 준비하는 중…</div></div>
      <div class="quiz-choices" id="quiz-choices"></div>
      <div class="quiz-feedback" id="quiz-feedback"></div>
      ${attribution()}
    </div>`;

  root.querySelectorAll('.pool-btn').forEach((b) => {
    b.onclick = () => { quiz.pool = b.dataset.pool; newQuestion(); };
  });
  newQuestion();

  function newQuestion() {
    const poolArr = quiz.pool === 'mine' ? all.filter((p) => store.discovered().includes(p.acc)) : all;
    const answer = poolArr[Math.floor(Math.random() * poolArr.length)];
    const others = all.filter((p) => p.acc !== answer.acc);
    shuffle(others);
    const choices = shuffle([answer, ...others.slice(0, 3)]);
    quiz.q = answer; quiz.answered = false;
    $('#quiz-feedback').innerHTML = '';
    const box = $('#quiz-choices');
    box.innerHTML = choices.map((c) => `<button class="choice" data-acc="${c.acc}">${c.name}</button>`).join('');
    box.querySelectorAll('.choice').forEach((b) => { b.onclick = () => answerChoice(b); });
    const loading = $('#quiz-viewer .viewer-loading');
    if (loading) loading.style.display = '';
    createViewer($('#quiz-viewer'), answer, (state) => {
      const l = $('#quiz-viewer .viewer-loading');
      if (!l) return;
      if (state === 'loaded') l.remove();
      else l.textContent = '3D 뷰어를 불러오지 못했습니다. 네트워크를 확인해 주세요.';
    });
  }

  function answerChoice(btn) {
    if (quiz.answered) return;
    quiz.answered = true;
    store.addPlay();
    const correct = btn.dataset.acc === quiz.q.acc;
    document.querySelectorAll('.choice').forEach((b) => {
      if (b.dataset.acc === quiz.q.acc) b.classList.add('right');
      else if (b === btn) b.classList.add('wrong');
      b.disabled = true;
    });
    if (correct) {
      quiz.streak += 1;
      if (quiz.streak > store.best()) store.setBest(quiz.streak);
      sfx.correct();
    } else {
      quiz.streak = 0;
      sfx.wrong();
    }
    $('#q-streak').textContent = quiz.streak;
    const f = $('#quiz-feedback');
    f.innerHTML = `
      <div class="fb ${correct ? 'ok' : 'no'}">
        <b>${correct ? '정답!' : `오답. 정답은 「${quiz.q.name}」`}</b>
        <span>${quiz.q.oneLiner} — ${quiz.q.organism}, ${quiz.q.length.toLocaleString()} aa</span>
        <div class="fb-actions">
          <button id="fb-detail">이 단백질 보기</button>
          <button id="fb-next" class="primary">다음 문제</button>
        </div>
      </div>`;
    $('#fb-detail').onclick = () => { location.hash = '#/p/' + quiz.q.acc; };
    $('#fb-next').onclick = newQuestion;
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ---------- 화면: 도전 (타임어택·서바이벌) ---------- */

const TA_SECONDS = 60;

function challengePool() {
  const disc = store.discovered();
  return PROTEINS.filter((p) => !p.legendary || disc.includes(p.acc));
}

function genQuestion(pool) {
  const r = Math.random();
  const type = r < 0.5 ? 'structure' : r < 0.8 ? 'desc' : 'partial';
  const answer = pool[Math.floor(Math.random() * pool.length)];
  const others = shuffle(pool.filter((p) => p.acc !== answer.acc)).slice(0, 3);
  return { type, answer, choices: shuffle([answer, ...others]) };
}

function renderChallenge(root) {
  root.innerHTML = `
    <div class="challenge">
      <div class="challenge-head">
        <h1>도전 모드</h1>
        <p class="challenge-sub">기억과 눈썰미로 기록을 깨 보세요. 정답을 연속으로 맞힐수록 콤보 점수가 붙습니다(최대 ×5).</p>
      </div>
      <div class="mode-cards">
        <button class="mode-card" data-mode="timeattack">
          <span class="mode-ico">⏱</span>
          <span class="mode-name">타임어택 60초</span>
          <span class="mode-desc">60초 안에 최대한 많이 맞히기<br>정답 100점 × 콤보 배율</span>
          <span class="mode-best">최고 기록 <b>${store.bestChallenge('timeattack')}</b></span>
        </button>
        <button class="mode-card" data-mode="survival">
          <span class="mode-ico">❤️</span>
          <span class="mode-name">서바이벌</span>
          <span class="mode-desc">목숨 3개로 끝까지 버티기<br>틀리면 목숨 감소</span>
          <span class="mode-best">최고 기록 <b>${store.bestChallenge('survival')}</b></span>
        </button>
      </div>
      <div class="challenge-types">
        <div class="ct-item">🧬 <b>구조 보고 맞히기</b> — 실제 3D 구조가 제시됩니다</div>
        <div class="ct-item">📖 <b>설명 읽고 맞히기</b> — 역할 설명만 보고 맞힙니다</div>
        <div class="ct-item">🔭 <b>일부만 보고 맞히기</b> — 구조의 한 조각만 보입니다</div>
      </div>
      ${attribution()}
    </div>`;
  root.querySelectorAll('.mode-card').forEach((b) => {
    b.onclick = () => startChallenge(root, b.dataset.mode);
  });
}

function startChallenge(root, mode) {
  const st = {
    mode, score: 0, combo: 0, bestCombo: 0, correct: 0,
    lives: mode === 'survival' ? 3 : Infinity,
    timeLeft: TA_SECONDS * 10, // 0.1초 단위
    over: false, locked: false, timer: null, lastTick: TA_SECONDS,
  };
  const pool = challengePool();

  root.innerHTML = `
    <div class="challenge run">
      <div class="cq-hud">
        <div class="cq-hud-left">
          ${mode === 'timeattack'
            ? '<span class="cq-time" id="cq-time">60.0</span>'
            : '<span class="cq-lives" id="cq-lives">❤️❤️❤️</span>'}
        </div>
        <div class="cq-hud-right">
          <span class="cq-combo" id="cq-combo"></span>
          <span class="cq-score" id="cq-score">0</span>
        </div>
      </div>
      <div class="cq-stage" id="cq-stage">
        <div class="cq-pane" id="cq-pane"></div>
      </div>
      <div class="cq-choices" id="cq-choices"></div>
      <button class="cq-quit" id="cq-quit">그만하기</button>
    </div>`;

  // Mol*는 보이는 상태에서 생성되어야 렌더링되므로 단일 패널을 사용한다.
  const pane = $('#cq-pane');
  let curQ = genQuestion(pool);
  let nextQ = genQuestion(pool);

  function preparePane(pane, q) {
    pane.innerHTML = '';
    pane.classList.remove('is-partial');
    if (q.type === 'desc') {
      pane.innerHTML = `
        <div class="cq-desc-card">
          <div class="cq-desc-tag">📖 설명 읽고 맞히기</div>
          <div class="cq-desc-line">“${q.answer.oneLiner}”</div>
          <div class="cq-desc-meta">${q.answer.organism} · ${q.answer.length.toLocaleString()} aa</div>
        </div>`;
      q.ready = true;
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'cq-viewer';
      wrap.innerHTML = '<div class="viewer-loading">구조를 불러오는 중…</div>';
      pane.appendChild(wrap);
      createViewer(wrap, q.answer, (state) => {
        if (state === 'loaded') {
          q.ready = true;
          const l = wrap.querySelector('.viewer-loading');
          if (l) l.remove();
        }
      });
      if (q.type === 'partial') {
        pane.classList.add('is-partial');
        const mx = 22 + Math.random() * 56; // %
        const my = 28 + Math.random() * 44;
        const mask = document.createElement('div');
        mask.className = 'cq-mask';
        mask.style.setProperty('--mx', mx + '%');
        mask.style.setProperty('--my', my + '%');
        wrap.appendChild(mask);
        const tag = document.createElement('div');
        tag.className = 'cq-partial-tag';
        tag.textContent = '🔭 일부만 보고 맞히기';
        wrap.appendChild(tag);
      } else {
        const tag = document.createElement('div');
        tag.className = 'cq-partial-tag';
        tag.textContent = '🧬 구조 보고 맞히기';
        wrap.appendChild(tag);
      }
    }
  }

  function showQuestion() {
    preparePane(pane, curQ);
    const box = $('#cq-choices');
    box.innerHTML = curQ.choices.map((c) => `<button class="choice" data-acc="${c.acc}">${c.name}</button>`).join('');
    box.querySelectorAll('.choice').forEach((b) => { b.onclick = () => answer(b); });
    st.locked = false;
    // 다음 문제 구조를 HTTP 캐시에 미리 받아 둔다 (같은 출처).
    if (nextQ && nextQ.type !== 'desc') fetch(nextQ.answer.cif).catch(() => {});
  }

  function updateHud() {
    const sc = $('#cq-score'); if (sc) sc.textContent = st.score;
    const cb = $('#cq-combo'); if (cb) cb.textContent = st.combo >= 2 ? `콤보 ×${Math.min(st.combo, 5)}` : '';
    if (st.mode === 'survival') {
      const lv = $('#cq-lives');
      if (lv) lv.textContent = '❤️'.repeat(Math.max(0, st.lives)) + '🖤'.repeat(Math.max(0, 3 - st.lives));
    }
  }

  function floatScore(pts) {
    const hud = $('.cq-hud-right');
    if (!hud) return;
    const f = document.createElement('span');
    f.className = 'cq-float';
    f.textContent = `+${pts}`;
    hud.appendChild(f);
    setTimeout(() => f.remove(), 900);
  }

  function answer(btn) {
    if (st.locked || st.over) return;
    st.locked = true;
    const correct = btn.dataset.acc === curQ.answer.acc;
    document.querySelectorAll('#cq-choices .choice').forEach((b) => {
      if (b.dataset.acc === curQ.answer.acc) b.classList.add('right');
      else if (b === btn) b.classList.add('wrong');
      b.disabled = true;
    });
    if (correct) {
      st.combo += 1;
      st.bestCombo = Math.max(st.bestCombo, st.combo);
      const pts = 100 * Math.min(st.combo, 5);
      st.score += pts;
      st.correct += 1;
      sfx.correct();
      floatScore(pts);
    } else {
      st.combo = 0;
      sfx.wrong();
      if (st.mode === 'survival') {
        st.lives -= 1;
        document.querySelector('.challenge.run').classList.add('shake');
        setTimeout(() => { const c = document.querySelector('.challenge.run'); if (c) c.classList.remove('shake'); }, 400);
      }
    }
    updateHud();
    if (st.mode === 'survival' && st.lives <= 0) {
      setTimeout(finish, 900);
      return;
    }
    setTimeout(() => {
      if (st.over) return;
      curQ = nextQ;
      nextQ = genQuestion(pool);
      showQuestion();
    }, correct ? 550 : 950);
  }

  function finish() {
    if (st.over) return;
    st.over = true;
    if (st.timer) { clearInterval(st.timer); st.timer = null; }
    const prevBest = store.bestChallenge(mode);
    const isRecord = st.score > prevBest;
    if (isRecord) store.setBestChallenge(mode, st.score);
    sfx.finish();
    if (isRecord && st.score > 0) fx.confetti(false);
    root.innerHTML = `
      <div class="challenge">
        <div class="cq-end">
          <div class="cq-end-mode">${mode === 'timeattack' ? '⏱ 타임어택 결과' : '❤️ 서바이벌 결과'}</div>
          <div class="cq-end-score">${st.score}<span>점</span></div>
          ${isRecord && st.score > 0 ? '<div class="cq-record">✨ 신기록!</div>' : ''}
          <div class="cq-end-stats">
            <span class="chip">정답 <b>${st.correct}</b>개</span>
            <span class="chip">최대 콤보 <b>×${Math.min(st.bestCombo, 5)}</b></span>
            <span class="chip">최고 기록 <b>${store.bestChallenge(mode)}</b></span>
          </div>
          <div class="cq-end-actions">
            <button id="cq-retry" class="primary">다시 도전</button>
            <button id="cq-menu">모드 선택</button>
          </div>
        </div>
        ${attribution()}
      </div>`;
    $('#cq-retry').onclick = () => startChallenge(root, mode);
    $('#cq-menu').onclick = () => renderChallenge(root);
  }

  $('#cq-quit').onclick = finish;

  // 첫 문제 표시 (뷰어는 패널이 보이는 상태에서 생성된다)
  showQuestion();

  if (mode === 'timeattack') {
    // 탭이 백그라운드로 가면 setInterval이 느려지므로 실제 시계(마감 시각) 기준으로 남은 시간을 계산한다.
    const deadline = Date.now() + TA_SECONDS * 1000;
    st.timer = setInterval(() => {
      st.timeLeft = Math.max(0, Math.round((deadline - Date.now()) / 100));
      const sec = st.timeLeft / 10;
      const el = $('#cq-time');
      if (el) {
        el.textContent = sec.toFixed(1);
        el.classList.toggle('urgent', sec <= 10);
      }
      if (sec <= 5.5 && Math.ceil(sec) < st.lastTick) { st.lastTick = Math.ceil(sec); sfx.tick(); }
      if (st.timeLeft <= 0) finish();
    }, 100);
    cleanup.push(() => { if (st.timer) clearInterval(st.timer); st.over = true; });
  } else {
    cleanup.push(() => { st.over = true; if (st.timer) clearInterval(st.timer); });
  }
}

/* ---------- 공통 ---------- */

function attribution() {
  return `<footer class="attrib">3D 구조 데이터: <a href="https://alphafold.ebi.ac.uk/" target="_blank" rel="noopener">AlphaFold DB</a> (EMBL-EBI · DeepMind), CC-BY-4.0 · 3D 뷰어: <a href="https://github.com/PDBeurope/pdbe-molstar" target="_blank" rel="noopener">PDBe Mol*</a></footer>`;
}

function route() {
  cleanup.splice(0).forEach((fn) => { try { fn(); } catch { /* noop */ } });
  const root = app();
  root.scrollTop = 0;
  const hash = location.hash || '#/';
  setNav(hash);
  if (hash.startsWith('#/p/')) renderDetail(root, hash.slice(4));
  else if (hash === '#/museum') renderMuseum(root);
  else if (hash === '#/quiz') renderQuiz(root);
  else if (hash === '#/challenge') renderChallenge(root);
  else renderUniverse(root);
}

function setNav(hash) {
  document.querySelectorAll('nav .nav-btn').forEach((b) => {
    const target = b.dataset.nav;
    const active = (target === '#/' && (hash === '#/' || hash === '')) || (target !== '#/' && hash.startsWith(target));
    b.classList.toggle('on', !!active);
  });
}

window.addEventListener('hashchange', route);
route();
