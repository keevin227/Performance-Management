/* Merit Portrait engine.
 *
 * A person is a signed distance field (head + neck + shoulders). Seven rings are iso-contours around
 * it, one per evidence layer. The band between ring i-1 and ring i is as thick as the evidence for
 * layer i at that angle, so strong layers swell, weak ones thin out, and rings never cross.
 * Missing evidence (strength below MISSING) is drawn dotted: unknown is not zero.
 *
 * Contours come from marching squares, chained into polylines that run from the left shoulder over
 * the head to the right shoulder, so they can be drawn progressively like a pen plotter.
 *
 * Public API (window.Merit):
 *   Merit.LAYERS                      seven layer descriptors {key, n, title, sub, color}
 *   new Merit.Portrait(opts)          opts: {bases:[7 strengths 0..1], seed, N, bumps, variation, boost:[7]}
 *   portrait.draw(ctx, cx, cy, size, state)
 *       size   pixel width of the figure's frame (the domain is 2·D wide)
 *       state  {reveal: number | number[7] (0..1 per ring), core: 0..1, highlight: i | null,
 *               (highlight may be an array of ring indices), dim: 0..1, opacity: 0..1, mono: color,
 *               coreColor, width: multiplier, t: ms (breathing), tip: bool,
 *               band: {i, alpha, color} tints the band between ring i-1 and ring i}
 *   portrait.setBase(i, v)            change a layer's strength and rebuild (for morphs)
 *   portrait.setBoost(i, v)           scale a layer's band thickness and rebuild (dramatic morphs)
 *   portrait.anchor(i, theta)         {x, y} in domain units on ring i at angle theta (0 = top,
 *                                     negative = left, positive = right; ±π/2 = shoulders level)
 *   Merit.toPx(cx, cy, size, p)       map a domain point to pixels for the same draw call
 */
(() => {
  const D = 1.15;            // half extent of the domain
  const CUT = 0.93;          // portrait crop line (y)
  const CY = 0.15;           // centre used for angles
  const BASE = 0.035;        // gap between the silhouette and ring 1
  const STEP = 0.045;        // nominal band thickness
  const MISSING = 0.22;      // below this strength a layer is drawn dotted

  const LAYERS = [
    { key: 'psych', n: '01', title: 'Psychometric core', sub: 'MBTI · CliftonStrengths · DISC · Big Five', color: '#C4553B' },
    { key: 'prehire', n: '02', title: 'Pre-hire', sub: 'Résumé · LinkedIn · structured interview · work sample', color: '#D49A3A' },
    { key: 'intent', n: '03', title: 'Intent', sub: 'OKRs · project commitments', color: '#8C9A52' },
    { key: 'proof', n: '04', title: 'Proof of work', sub: 'Git · tickets · ERP · shipped outcomes', color: '#2E9384' },
    { key: 'collab', n: '05', title: 'Collaboration', sub: 'Slack · Teams · email · who unblocks whom', color: '#3F6DB0' },
    { key: 'voice', n: '06', title: 'Employee voice', sub: 'Weekly voice check-in on WhatsApp or Teams', color: '#7558A3' },
    { key: 'review', n: '07', title: 'Manager & peer voice', sub: 'Tap & Speak · peer recognition', color: '#B0507A' },
  ];

  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  function sdf(x, y) {
    const head = Math.hypot(x, y + 0.33) - 0.25;
    const ny = Math.min(Math.max(y, -0.2), 0.32), neck = Math.hypot(x, y - ny) - 0.105;
    const bx = 0.62, by = 0.40, r = 0.34, cy = 0.67;
    const qx = Math.abs(x) - bx + r, qy = Math.abs(y - cy) - by + r;
    const box = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
    return smin(smin(head, neck, 0.12), box, 0.16);
  }
  const angleOf = (x, y) => Math.atan2(x, -(y - CY));

  /* Base distance field and angle per grid node, cached per resolution. */
  const cache = new Map();
  function base(N) {
    if (cache.has(N)) return cache.get(N);
    const M = N + 1, grid = new Float32Array(M * M), theta = new Float32Array(M * M);
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
      const x = -D + 2 * D * i / N, y = -D + 2 * D * j / N;
      grid[j * M + i] = sdf(x, y); theta[j * M + i] = angleOf(x, y);
    }
    const b = { N, M, grid, theta };
    cache.set(N, b); return b;
  }

  /* Marching squares on field f (zero level), segments cropped at CUT, chained into polylines. */
  function polylines(f, N) {
    const M = N + 1, segs = [];
    const P = (i, j) => [-D + 2 * D * i / N, -D + 2 * D * j / N];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
      const v = c.map(([a, b]) => f[b * M + a]);
      const pts = [];
      for (let e = 0; e < 4; e++) {
        const a = v[e], b = v[(e + 1) % 4];
        if ((a < 0) !== (b < 0)) {
          const t = a / (a - b), p1 = P(...c[e]), p2 = P(...c[(e + 1) % 4]);
          pts.push([p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t]);
        }
      }
      for (let k = 0; k + 1 < pts.length; k += 2) {
        if (pts[k][1] > CUT && pts[k + 1][1] > CUT) continue;
        segs.push([pts[k], pts[k + 1]]);
      }
    }
    // chain by shared endpoints
    const key = p => `${Math.round(p[0] * 2e4)},${Math.round(p[1] * 2e4)}`;
    const ends = new Map();
    segs.forEach((s, idx) => s.forEach((p, e) => { const k = key(p); if (!ends.has(k)) ends.set(k, []); ends.get(k).push([idx, e]); }));
    const used = new Uint8Array(segs.length), lines = [];
    const extend = (p, out) => {
      for (;;) {
        const nx = (ends.get(key(p)) || []).find(([n]) => !used[n]);
        if (!nx) break;
        used[nx[0]] = 1; p = segs[nx[0]][1 - nx[1]]; out.push(p);
      }
    };
    for (let s = 0; s < segs.length; s++) {
      if (used[s]) continue;
      used[s] = 1;
      const fwd = [segs[s][1]], back = [];
      extend(segs[s][1], fwd); extend(segs[s][0], back);
      const pts = back.reverse().concat([segs[s][0]], fwd);
      if (pts.length > 8) lines.push(pts);
    }
    return lines.map(pts => {
      if (pts[0][0] > pts[pts.length - 1][0]) pts.reverse();   // left shoulder → right shoulder
      const th = new Float32Array(pts.length), cum = new Float32Array(pts.length);
      for (let k = 0; k < pts.length; k++) {
        th[k] = angleOf(pts[k][0], pts[k][1]);
        if (k) cum[k] = cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      }
      return { pts, th, cum, len: cum[pts.length - 1] };
    }).sort((a, b) => b.len - a.len);
  }

  function rng(seed) { let s = seed % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

  class Portrait {
    constructor({ bases = [0.75, 0.6, 0.7, 0.8, 0.7, 0.6, 0.65], seed = 7, N = 200, bumps = 4, variation = 0.45, boost } = {}) {
      this.N = N;
      this.bases = bases.slice();
      this.boost = (boost || bases.map(() => 1)).slice();   // band thickness multiplier per layer
      const r = rng(seed * 7919 + 13);
      // a few smooth bumps per layer so every portrait is unique
      this.bumps = bases.map(() => Array.from({ length: bumps }, () => [r() * 2 * Math.PI - Math.PI, 0.3 + r() * 0.6, (r() - 0.45) * variation]));
      this.build();
    }
    strength(i, th) {
      let s = this.bases[i];
      for (const [c, w, a] of this.bumps[i]) { const d = Math.atan2(Math.sin(th - c), Math.cos(th - c)); s += a * Math.exp(-(d * d) / (w * w)); }
      return Math.max(0, Math.min(1.15, s));
    }
    build(from = 0) {
      const { N, M, grid, theta } = base(this.N);
      if (!this.core) this.core = polylines(grid, N)[0];
      this.rings = this.rings || [];
      // cumulative offset per node up to ring i
      const acc = new Float32Array(M * M).fill(BASE);
      for (let i = 0; i < LAYERS.length; i++) {
        const b = STEP * this.boost[i];
        for (let k = 0; k < acc.length; k++) acc[k] += b * (0.4 + 1.1 * this.strength(i, theta[k]));
        if (i < from) continue;
        const f = new Float32Array(M * M);
        for (let k = 0; k < f.length; k++) f[k] = grid[k] - acc[k];
        this.rings[i] = polylines(f, N);
      }
    }
    setBase(i, v) { this.bases[i] = v; this.build(i); }
    setBoost(i, v) { this.boost[i] = v; this.build(i); }
    anchor(i, th) {
      const lines = i < 0 ? [this.core] : this.rings[i];
      let best = null, bd = 1e9;
      for (const L of lines) for (let k = 0; k < L.pts.length; k += 2) {
        const d = Math.abs(Math.atan2(Math.sin(L.th[k] - th), Math.cos(L.th[k] - th)));
        if (d < bd) { bd = d; best = L.pts[k]; }
      }
      return best ? { x: best[0], y: best[1] } : { x: 0, y: 0 };
    }

    draw(ctx, cx, cy, size, st = {}) {
      const S = size / (2 * D);
      const X = x => cx + x * S, Y = y => cy + y * S;
      const t = st.t || 0, wm = st.width ?? 1;
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (st.band && st.band.alpha > 0) {          // tint one layer's band, e.g. to show its mass
        const i = st.band.i, outer = this.rings[i][0], inner = i ? this.rings[i - 1][0] : this.core;
        if (outer && inner) {
          ctx.globalAlpha = st.band.alpha; ctx.fillStyle = st.band.color || LAYERS[i].color;
          ctx.beginPath();
          outer.pts.forEach((p, k) => k ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])));
          for (let k = inner.pts.length - 1; k >= 0; k--) ctx.lineTo(X(inner.pts[k][0]), Y(inner.pts[k][1]));
          ctx.closePath(); ctx.fill();
        }
      }
      for (let i = LAYERS.length - 1; i >= 0; i--) {
        const rv = Array.isArray(st.reveal) ? st.reveal[i] : (st.reveal ?? 1);
        if (!(rv > 0)) continue;
        const color = st.mono || LAYERS[i].color;
        const hl = st.highlight;
        const lit = hl == null || (Array.isArray(hl) ? hl.includes(i) : hl === i);
        const alpha = (lit ? 1 : (st.dim ?? 0.14)) * (st.opacity ?? 1);
        const breathe = 1 + 0.006 * Math.sin(t * 0.0011 + i * 0.7);
        ctx.save();
        ctx.translate(cx, cy + 0.15 * S); ctx.scale(breathe, breathe); ctx.translate(-cx, -(cy + 0.15 * S));
        ctx.strokeStyle = color;
        for (const L of this.rings[i]) {
          const limit = L.len * Math.min(1, rv);
          let curW = -1, open = false, lastK = 0;
          for (let k = 0; k < L.pts.length - 1; k++) {
            if (L.cum[k] > limit) break;
            lastK = k;
            const s = this.strength(i, L.th[k]);
            if (s < MISSING && Math.floor(L.cum[k] * S / 5) % 2) { if (open) { ctx.stroke(); open = false; } continue; }
            const w = Math.round((0.6 + 2.3 * Math.min(1, s)) * wm * (size / 700) * 4) / 4 + 0.35;
            const a = alpha * (s < MISSING ? 0.55 : 0.45 + 0.55 * Math.min(1, s));
            if (w !== curW || !open) {
              if (open) ctx.stroke();
              ctx.lineWidth = w; ctx.globalAlpha = a; curW = w;
              ctx.beginPath(); ctx.moveTo(X(L.pts[k][0]), Y(L.pts[k][1])); open = true;
            }
            ctx.lineTo(X(L.pts[k + 1][0]), Y(L.pts[k + 1][1]));
          }
          if (open) ctx.stroke();
          if (st.tip !== false && rv < 1 && rv > 0) {   // the pen
            const p = L.pts[lastK + 1] || L.pts[lastK];
            ctx.globalAlpha = alpha; ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), Math.max(2.2, 3.2 * size / 700), 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.restore();
      }
      const core = st.core ?? 1;
      if (core > 0 && this.core) {
        ctx.globalAlpha = core * (st.opacity ?? 1); ctx.fillStyle = st.coreColor || '#16140F';
        ctx.beginPath();
        this.core.pts.forEach((p, k) => k ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])));
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }

  window.Merit = {
    LAYERS, Portrait, D, CUT,
    toPx: (cx, cy, size, p) => ({ x: cx + p.x * size / (2 * D), y: cy + p.y * size / (2 * D) }),
  };
})();
