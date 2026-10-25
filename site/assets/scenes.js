/* Slide scenes for the Merit deck. Each scene owns one full-stage canvas and draws with the
   Portrait engine; DOM text and cards come from index.html. */
(() => {
  const Deck = window.Deck, M = window.Merit, L = M.LAYERS;
  const clamp = v => Math.max(0, Math.min(1, v));
  const ease = v => { v = clamp(v); return 1 - Math.pow(1 - v, 3); };
  const easeIO = v => { v = clamp(v); return v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };

  /* Wire a canvas scene to its slide. `setup(st)` returns draw(t, dt); st carries timing:
     st.t0 (slide entered), st.step, st.stepAt (when the current step began). */
  function scene(id, setup) {
    const slide = document.getElementById(id);
    if (!slide) return;
    const cv = slide.querySelector('canvas.cv'), ctx = cv.getContext('2d');
    const st = { slide, ctx, k: 1, t0: 0, lastT: -1e9, step: 0, prevStep: 0, stepAt: 0, dirty: true };
    Deck.onResize(() => { st.k = Deck.fit(cv, 1600, 900); st.dirty = true; });
    Deck.onStep(slide, s => { st.prevStep = st.step; st.step = s; st.stepAt = performance.now(); st.dirty = true; });
    const draw = setup(st);
    Deck.render(slide, (t, dt) => {
      if (t - st.lastT > 300) { st.t0 = t; st.dirty = true; if (st.onEnter) st.onEnter(t); }
      st.lastT = t;
      ctx.setTransform(st.k, 0, 0, st.k, 0, 0);
      draw(t, dt);
    });
    return st;
  }
  const clear = st => st.ctx.clearRect(0, 0, 1600, 900);

  /* One protagonist runs through the deck: the same person on the title and layers slides. */
  const HERO_BASES = [0.8, 0.62, 0.7, 0.86, 0.76, 0.58, 0.7];

  /* ---------- 01 · title: the person assembles, ring by ring ---------- */
  scene('s-title', st => {
    const P = new M.Portrait({ bases: HERO_BASES, seed: 7, N: 220 });
    return t => {
      clear(st);
      const el = (t - st.t0) / 1000;
      const reveal = L.map((_, i) => easeIO((el - 0.9 - i * 0.38) / 1.25));
      P.draw(st.ctx, 1135, 478, 830, { reveal, core: ease((el - 0.15) / 0.9), t, width: 1.15 });
    };
  });

  /* ---------- 03 · seven layers: one ring per step, legend row lights with it ---------- */
  const SOURCES = [
    '<span class="chip">MBTI</span><span class="chip">CliftonStrengths</span><span class="chip">DISC</span><span class="chip">Big Five</span>',
    'greenhouse indeed wellfound zoom googlemeet|LinkedIn',
    'jira linear asana notion clickup',
    'github gitlab bitbucket figma sap confluence',
    'gmail googlecalendar discord miro|Slack|Teams',
    'whatsapp telegram loom|Teams',
    '<span class="chip">Tap &amp; Speak</span><span class="chip">Peer recognition</span>',
  ];
  const legend = document.getElementById('legend');
  if (legend) {
    legend.innerHTML = L.map((l, i) => {
      const src = SOURCES[i].startsWith('<') ? SOURCES[i] : SOURCES[i].split('|').map((part, j) =>
        j === 0 ? part.split(' ').map(k => `<i class="logo xs" data-logo="${k}" title="${window.BRANDS[k]?.title || k}"></i>`).join('') : `<span class="chip">${part}</span>`).join('');
      return `<div class="lrow" data-f="${i + 1}" style="--c:${l.color}"><span class="n">${l.n}</span><span class="sw" style="background:${l.color}"></span>
        <div><b>${l.title}</b><span class="sub">${l.sub}</span><div class="srcs">${src}</div></div></div>`;
    }).join('');
    Deck.hydrate(legend);
  }
  scene('s-layers', st => {
    const P = new M.Portrait({ bases: HERO_BASES, seed: 7, N: 200 });
    const rv = L.map(() => 0);
    Deck.onStep(st.slide, s => {
      legend.querySelectorAll('.lrow').forEach((r, i) => {
        r.classList.toggle('now', s === i + 1);
        r.classList.toggle('past', s > i + 1 && s < 8);
      });
      L.forEach((_, i) => { if (s <= i) rv[i] = 0; });
    });
    st.onEnter = () => { L.forEach((_, i) => { rv[i] = st.step > i ? 1 : 0; }); };
    return (t, dt) => {
      clear(st);
      L.forEach((_, i) => { if (st.step > i) rv[i] = Math.min(1, rv[i] + dt / 1.3); });
      const s = st.step;
      const highlight = s >= 1 && s <= 7 ? s - 1 : null;
      P.draw(st.ctx, 470, 482, 800, { reveal: rv.map(easeIO), core: 1, t, highlight, dim: 0.2, width: 1.15 });
    };
  });

  /* ---------- 05 · claims → evidence → context ---------- */
  scene('s-engine', st => {
    const P = new M.Portrait({ bases: [0.72, 0.78, 0.6, 0.82, 0.86, 0.7, 0.56], seed: 21, N: 180 });
    const CX = 800, CY = 505, SIZE = 600;
    const px = p => M.toPx(CX, CY, SIZE, p);
    const claims = [   // ring, angle, card centre y
      { ring: 1, th: -0.62, y: 356 }, { ring: 5, th: -1.12, y: 506 }, { ring: 6, th: -1.78, y: 656 },
    ];
    const evid = [{ ring: 3, th: 0.62, y: 356 }, { ring: 3, th: 1.12, y: 506 }, { ring: 3, th: 1.78, y: 656 }];
    const anchors = () => {
      claims.forEach(c => { c.p = px(P.anchor(c.ring, c.th)); });
      evid.forEach(e => { e.p = px(P.anchor(e.ring, e.th)); });
    };
    anchors();

    function link(ctx, x1, y1, x2, y2, color, prog, dashed) {
      if (prog <= 0) return;
      const mx = (x1 + x2) / 2;
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.9;
      if (dashed) ctx.setLineDash([5, 6]);
      // sample the curve so it can be drawn progressively
      ctx.beginPath();
      const n = 40, end = Math.max(1, Math.round(n * prog));
      for (let k = 0; k <= end; k++) {
        const u = k / n, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3;
        const x = a * x1 + b * mx + c * mx + d * x2, y = a * y1 + b * y1 + c * y2 + d * y2;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x1, y1, 3.5, 0, 7); ctx.fill();
      if (prog >= 1) { ctx.beginPath(); ctx.arc(x2, y2, 5, 0, 7); ctx.fill(); ctx.globalAlpha = .25; ctx.beginPath(); ctx.arc(x2, y2, 11, 0, 7); ctx.fill(); }
      ctx.restore();
    }

    return t => {
      clear(st);
      const s = st.step, since = (t - st.stepAt) / 1000;
      const lit = s === 0 ? null : s === 1 ? [1, 5, 6] : s === 2 ? [1, 3, 5, 6] : [3, 4, 6];
      P.draw(st.ctx, CX, CY, SIZE, { core: 1, t, highlight: lit, dim: 0.16, width: 1.1 });
      const ctx = st.ctx;
      if (s >= 1) claims.forEach((c, i) => link(ctx, 460, c.y, c.p.x, c.p.y, L[c.ring].color, s === 1 ? ease(since / 0.8 - i * 0.2) : 1));
      if (s >= 2) evid.forEach((e, i) => link(ctx, 1140, e.y, e.p.x, e.p.y, L[3].color, s === 2 ? ease(since / 0.8 - i * 0.2) : 1));
      if (s >= 3) {
        const a = px(P.anchor(4, 2.05));
        link(ctx, 1000, 772, a.x, a.y, '#16140F', ease(since / 0.9), true);
      }
    };
  });

  /* ---------- 08 · silent hero: the collaboration layer reveals Lena ---------- */
  const TEAM = [
    { name: 'Ava', role: 'Backend engineer', bases: [0.7, 0.7, 0.75, 0.9, 0.5, 0.6, 0.7], out: 82, col: 22 },
    { name: 'Ben', role: 'Product designer', bases: [0.65, 0.6, 0.7, 0.78, 0.55, 0.7, 0.6], out: 74, col: 18 },
    { name: 'Lena', role: 'Platform engineer', bases: [0.75, 0.6, 0.6, 0.62, 0.5, 0.5, 0.55], out: 58, col: 100, hero: true },
    { name: 'Omar', role: 'Frontend engineer', bases: [0.6, 0.75, 0.8, 0.92, 0.45, 0.75, 0.7], out: 88, col: 26 },
    { name: 'Priya', role: 'Data engineer', bases: [0.7, 0.65, 0.65, 0.74, 0.6, 0.6, 0.65], out: 69, col: 30 },
    { name: 'Sam', role: 'QA engineer', bases: [0.68, 0.55, 0.72, 0.8, 0.52, 0.55, 0.6], out: 77, col: 20 },
  ];
  const teamEl = document.getElementById('team');
  const slotX = i => 160 + i * 256, HERO_Y = 420, HERO_SIZE = 290;
  if (teamEl) {
    teamEl.innerHTML = TEAM.map((m, i) => `<div class="member${m.hero ? ' lena' : ''}" style="left:${slotX(i) - 110}px;top:560px">
      <b>${m.name}</b><span class="role">${m.role}</span>
      <div class="bars"><div class="bar"><span>Visible output</span><i style="--v:${m.out}%"></i></div>
      <div class="bar collab"><span>Unblocked others</span><i style="--v:${m.col}%"></i></div></div></div>`).join('');
  }
  scene('s-hero', st => {
    const people = TEAM.map((m, i) => new M.Portrait({ bases: m.bases, seed: 40 + i * 3, N: 120 }));
    const lena = people[2], LOW = 1, HIGH = 4.6;     // collaboration band thickness multiplier
    let collab = 0, lenaV = LOW;
    const setLena = v => { if (Math.abs(v - lenaV) > 0.02 || (v === LOW && lenaV !== LOW)) { lenaV = v; lena.setBoost(4, v); } };
    Deck.onStep(st.slide, s => { if (s === 0) { setLena(LOW); collab = 0; } });
    st.onEnter = () => { collab = st.step >= 1 ? 1 : 0; setLena(st.step >= 1 ? HIGH : LOW); };
    return (t, dt) => {
      clear(st);
      const el = (t - st.t0) / 1000, s = st.step, since = (t - st.stepAt) / 1000;
      if (s >= 1) collab = Math.min(1, collab + dt / 1.1);
      if (s >= 1) setLena(LOW + (HIGH - LOW) * easeIO((since - 0.9) / 1.8));
      const ctx = st.ctx;
      if (s >= 1) {   // soft light behind Lena
        const g = ctx.createRadialGradient(slotX(2), HERO_Y, 10, slotX(2), HERO_Y, 190);
        g.addColorStop(0, `rgba(63,109,176,${0.12 * ease(since / 1.5)})`); g.addColorStop(1, 'rgba(63,109,176,0)');
        ctx.fillStyle = g; ctx.fillRect(slotX(2) - 200, HERO_Y - 200, 400, 400);
      }
      people.forEach((P, i) => {
        const base = L.map((_, r) => r < 4 ? easeIO((el - 0.2 - i * 0.08 - r * 0.22) / 0.9) : 0);
        base[4] = easeIO(collab);
        const isHero = i === 2;
        P.draw(ctx, slotX(i), HERO_Y, HERO_SIZE, {
          reveal: base, core: ease((el - i * 0.08) / 0.6), t: isHero ? t : 0, tip: false,
          opacity: s >= 1 && !isHero ? 0.4 : 1, highlight: s >= 1 ? 4 : null, dim: 0.45, width: isHero && s >= 1 ? 1.5 : 1,
          band: isHero && s >= 1 ? { i: 4, alpha: 0.16 * easeIO((since - 0.9) / 1.8) } : null,
        });
      });
    };
  });

  /* ---------- 14 · the wall: a whole team of unique portraits ---------- */
  scene('s-wall', st => {
    const r = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(99);
    const COLS = 8, ROWS = 3;
    const wall = Array.from({ length: COLS * ROWS }, (_, j) => ({
      P: new M.Portrait({ bases: L.map(() => 0.1 + r() * 0.95), boost: L.map(() => 0.55 + r() * 1.3), seed: 200 + j, N: 90, variation: 0.8 }),
      x: 140 + (j % COLS) * 188, y: 228 + Math.floor(j / COLS) * 236, delay: (j % COLS) * 0.07 + Math.floor(j / COLS) * 0.18 + r() * 0.1,
    }));
    const DURATION = 0.07 * 7 + 0.18 * 2 + 0.1 + 0.15 * 6 + 0.8 + 0.2;
    return t => {
      const el = (t - st.t0) / 1000;
      if (!st.dirty && el > DURATION) return;     // finished: keep the last frame
      clear(st);
      for (const w of wall) {
        const e = el - w.delay;
        const reveal = L.map((_, i) => easeIO((e - 0.25 - i * 0.15) / 0.8));
        w.P.draw(st.ctx, w.x, w.y, 200, { reveal, core: ease(e / 0.5), tip: false, width: 1 });
      }
      if (el > DURATION) st.dirty = false;
    };
  });
})();
