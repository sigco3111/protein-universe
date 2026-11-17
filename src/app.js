// 단백질 유니버스 - 앱 로직
import { PROTEINS, CATEGORIES, EDGES, WORLD, plddtColor, byAcc } from './data.js';

const LS_DISCOVERED = 'pu_discovered';
const LS_BEST = 'pu_quiz_best';
const LS_PLAYS = 'pu_quiz_plays';

const store = {
  discovered() {
    try { return JSON.parse(localStorage.getItem(LS_DISCOVERED) || '[]'); } catch { return []; }
  },
  addDiscovered(acc) {
    const d = store.discovered();
    if (!d.includes(acc)) { d.push(acc); localStorage.setItem(LS_DISCOVERED, JSON.stringify(d)); }
  },
  best() { return parseInt(localStorage.getItem(LS_BEST) || '0', 10) || 0; },
  setBest(v) { localStorage.setItem(LS_BEST, String(v)); },
  plays() { return parseInt(localStorage.getItem(LS_PLAYS) || '0', 10) || 0; },
  addPlay() { localStorage.setItem(LS_PLAYS, String(store.plays() + 1)); },
};

const $ = (sel) => document.querySelector(sel);
const app = () => $('#screen');

/* ---------- 3D 뷰어 (PDBe Mol*) ---------- */

let loadListener = null;

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

  if (loadListener) document.removeEventListener('pdbe-molstar.added-component', loadListener);
  const timer = setTimeout(() => onState('timeout'), 15000);
  loadListener = () => { clearTimeout(timer); onState('loaded'); };
  document.addEventListener('pdbe-molstar.added-component', loadListener);
  return el;
}

/* ---------- 화면: 우주맵 ---------- */

function renderUniverse(root) {
  const discovered = store.discovered();
  root.innerHTML = `
    <div class="universe-wrap">
      <div class="universe-hud">
        <div class="hud-title">단백질 유니버스</div>
        <div class="hud-sub">실제 단백질 열두 개가 별로 떠 있습니다. 별을 눌러 발견하세요.</div>
        <div class="hud-progress" id="hud-progress">발견 ${discovered.length}/${PROTEINS.length}</div>
      </div>
      <canvas id="space"></canvas>
      <div class="universe-hint">드래그로 이동 · 핀치/휠로 확대 · 별을 탭하면 상세</div>
      ${attribution()}
    </div>`;

  const canvas = $('#space');
  const ctx = canvas.getContext('2d');
  const view = { x: WORLD.w / 2, y: WORLD.h / 2, scale: 1 };
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let cw = 0, ch = 0;

  // 배경 장식 별 (고정)
  const bgStars = [];
  let seed = 42;
  const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 220; i++) {
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
    }
  }
  resize();

  const toScreen = (wx, wy) => ({
    x: (wx - view.x) * view.scale + cw / 2,
    y: (wy - view.y) * view.scale + ch / 2,
  });

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

    // 성단 연결선
    ctx.lineWidth = 1;
    for (const [a, b] of EDGES) {
      const pa = byAcc(a), pb = byAcc(b);
      const sa = toScreen(pa.x, pa.y), sb = toScreen(pb.x, pb.y);
      ctx.strokeStyle = 'rgba(140,165,255,0.22)';
      ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(sb.x, sb.y); ctx.stroke();
    }

    // 성단 이름
    ctx.textAlign = 'center';
    ctx.font = '12px system-ui, sans-serif';
    const centers = { oxygen: [480, 620], signal: [500, 90], tools: [500, 1030] };
    for (const key of Object.keys(centers)) {
      const [cx, cy] = centers[key];
      const p = toScreen(cx, cy);
      ctx.fillStyle = 'rgba(160,180,230,0.55)';
      ctx.fillText(CATEGORIES[key].name, p.x, p.y);
    }

    // 단백질 별
    const disc = store.discovered();
    for (const p of PROTEINS) {
      const s = toScreen(p.x, p.y);
      const known = disc.includes(p.acc);
      const color = plddtColor(p.plddt);
      const tw = 0.75 + 0.25 * Math.sin(t / 700 + p.x * 0.7);
      const baseR = Math.max(7, Math.min(15, p.length / 80)) * Math.pow(view.scale, 0.35);

      // 광晕
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
      ctx.fillText(known ? p.name : '?', s.x, s.y + baseR * 3.2 + 14);
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
    store.addDiscovered(acc);
    btn.classList.add('done');
    btn.textContent = '✓ 박물관에 전시 중';
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
  const pct = Math.round((disc.length / PROTEINS.length) * 100);
  root.innerHTML = `
    <div class="museum">
      <div class="museum-head">
        <h1>내 박물관</h1>
        <div class="museum-progress"><div class="bar"><div class="fill" style="width:${pct}%"></div></div>
        <span>${disc.length}/${PROTEINS.length} 전시 중</span></div>
        <p class="museum-sub">우주에서 발견한 단백질이 여기에 전시됩니다. ${disc.length === 0 ? '아직 전시품이 없습니다. 탐험 탭에서 별을 찾아보세요.' : ''}</p>
      </div>
      <div class="museum-grid">
        ${PROTEINS.map((p) => {
          const known = disc.includes(p.acc);
          return `<button class="exhibit ${known ? 'known' : 'unknown'}" data-acc="${known ? p.acc : ''}" ${known ? '' : 'disabled'}>
            <span class="exhibit-star" style="--star:${known ? plddtColor(p.plddt) : '#8b8578'}">${known ? '★' : '?'}</span>
            <span class="exhibit-name">${known ? p.name : '미발견'}</span>
            <span class="exhibit-line">${known ? p.oneLiner : '우주에서 이 별을 찾아보세요'}</span>
          </button>`;
        }).join('')}
      </div>
      ${attribution()}
    </div>`;
  root.querySelectorAll('.exhibit.known').forEach((el) => {
    el.onclick = () => { location.hash = '#/p/' + el.dataset.acc; };
  });
}

/* ---------- 화면: 퀴즈 ---------- */

const quiz = { streak: 0, pool: 'all', q: null, answered: false };

function renderQuiz(root) {
  const disc = store.discovered();
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
    const poolArr = quiz.pool === 'mine' ? PROTEINS.filter((p) => store.discovered().includes(p.acc)) : PROTEINS;
    const answer = poolArr[Math.floor(Math.random() * poolArr.length)];
    const others = PROTEINS.filter((p) => p.acc !== answer.acc);
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
    } else {
      quiz.streak = 0;
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

/* ---------- 공통 ---------- */

function attribution() {
  return `<footer class="attrib">3D 구조 데이터: <a href="https://alphafold.ebi.ac.uk/" target="_blank" rel="noopener">AlphaFold DB</a> (EMBL-EBI · DeepMind), CC-BY-4.0 · 3D 뷰어: <a href="https://github.com/PDBeurope/pdbe-molstar" target="_blank" rel="noopener">PDBe Mol*</a></footer>`;
}

const cleanup = [];

function route() {
  cleanup.splice(0).forEach((fn) => fn());
  const root = app();
  root.scrollTop = 0;
  const hash = location.hash || '#/';
  setNav(hash);
  if (hash.startsWith('#/p/')) renderDetail(root, hash.slice(4));
  else if (hash === '#/museum') renderMuseum(root);
  else if (hash === '#/quiz') renderQuiz(root);
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
