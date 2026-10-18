// Scroll timeline, reveal-on-scroll and a back-to-top button.
// Everything here is decoration: the pages read the same without it.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const ease = 'cubic-bezier(.2,.7,.2,1)';

  document.head.insertAdjacentHTML('beforeend', `<style>
    html.motion li.reveal { opacity: 0; transform: translateY(10px); transition: opacity .6s ${ease}, transform .6s ${ease}; transition-delay: var(--d, 0ms); }
    html.motion li.reveal.in { opacity: 1; transform: none; }

    .tl { position: fixed; top: 50%; left: calc(50% - 422px); width: 12px; height: min(56vh, 520px); transform: translateY(-50%); display: none; z-index: 5; }
    .tl svg { position: absolute; inset: 0; width: 12px; height: 100%; overflow: visible; }
    .tl .track { stroke: #262626; stroke-width: 1; }
    .tl .fill { stroke: var(--accent); stroke-width: 1.5; stroke-linecap: round; }
    .tl .tick { fill: #333; transform-box: fill-box; transform-origin: center; transition: fill .3s ease, transform .3s ${ease}; }
    .tl .tick.past { fill: var(--accent); }
    .tl .tick.here { transform: scale(1.6); }
    .tl .node { fill: var(--bg); stroke: #3a3a3a; stroke-width: 1; transition: fill .3s ease, stroke .3s ease; }
    .tl .node.past { fill: var(--accent); stroke: var(--accent); }
    .tl .hit { fill: transparent; cursor: pointer; }
    .tl .head { transition: none; }
    .tl .head circle:first-child { fill: var(--accent); }
    .tl .halo { fill: var(--accent); opacity: .18; transform-box: fill-box; transform-origin: center; }
    .tl-label { position: absolute; right: 24px; transform: translateY(-50%); padding: 2px 0; border: 0; background: none; cursor: pointer; white-space: nowrap; font-family: var(--mono); font-size: .66rem; letter-spacing: .08em; text-transform: uppercase; color: var(--fg-4); transition: color .3s ease; }
    .tl-label:hover { color: var(--fg-2); }
    .tl-label.past { color: var(--fg-3); }
    .tl-label.here { color: var(--fg); }
    .tl-now { position: absolute; top: calc(100% + 22px); right: -2px; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; white-space: nowrap; font-family: var(--mono); font-size: .68rem; transition: opacity .18s ease, transform .18s ease; }
    .tl-now.swap { opacity: 0; transform: translateY(3px); }
    .tl-now b { font-weight: 400; color: var(--fg-2); max-width: 150px; overflow: hidden; text-overflow: ellipsis; }
    .tl-now span { color: var(--accent); font-variant-numeric: tabular-nums; }

    .totop { position: fixed; right: 32px; bottom: 32px; width: 44px; height: 44px; padding: 0; border: 0; border-radius: 50%; background: #111; color: var(--fg-2); cursor: pointer; opacity: 0; transform: translateY(12px) scale(.92); pointer-events: none; transition: opacity .3s ease, transform .3s ${ease}, color .2s ease, background .2s ease; z-index: 6; }
    .totop.on { opacity: 1; transform: none; pointer-events: auto; }
    .totop:hover { color: #fff; background: #161616; }
    .totop:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
    .totop svg { display: block; width: 44px; height: 44px; }
    .totop .ring-bg { fill: none; stroke: #262626; stroke-width: 1.5; }
    .totop .ring { fill: none; stroke: var(--accent); stroke-width: 1.5; stroke-linecap: round; transform: rotate(-90deg); transform-origin: 22px 22px; }
    .totop .arrow { fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; transition: transform .25s ${ease}; }
    .totop:hover .arrow { transform: translateY(-2px); }

    @media (min-width: 1180px) { .tl.ready { display: block; } }
    @media (max-width: 560px) { .totop { right: 16px; bottom: 16px; width: 40px; height: 40px; } .totop svg { width: 40px; height: 40px; } }
    @media (prefers-reduced-motion: no-preference) {
      .tl.ready:not(.drawn) .track { stroke-dasharray: 1; animation: tl-draw 1.1s ${ease} both; }
      .tl.ready:not(.drawn) .tick, .tl.ready:not(.drawn) .node { animation: tl-pop .5s ${ease} both; animation-delay: var(--d); }
      .tl .halo { animation: tl-pulse 2.6s ease-out infinite; }
      @keyframes tl-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
      @keyframes tl-pop { from { opacity: 0; transform: scale(0); } }
      @keyframes tl-pulse { 0% { transform: scale(1); opacity: .28; } 80%, 100% { transform: scale(2.4); opacity: 0; } }
    }
  </style>`);

  const items = [...document.querySelectorAll('li')].filter(li => li.querySelector('.date'));
  const sections = [...document.querySelectorAll('h2')];
  const label = li => {
    const num = li.querySelector('.num');
    const name = li.querySelector('.name a') || li.querySelector('.name');
    return { name: (num || name).textContent.trim(), date: li.querySelector('.date').textContent.trim() };
  };

  // Reveal list rows as they come into view, staggering rows that arrive together.
  if (!reduce && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('motion');
    const io = new IntersectionObserver(entries => {
      entries.filter(e => e.isIntersecting).forEach((e, i) => {
        e.target.style.setProperty('--d', `${Math.min(i, 5) * 70}ms`);
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    items.forEach(li => { li.classList.add('reveal'); io.observe(li); });
  }

  // Timeline rail: a minimap of the page with one tick per row and a node per section.
  const rail = document.createElement('nav');
  rail.className = 'tl';
  rail.setAttribute('aria-label', 'Page timeline');
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  const now = document.createElement('div');
  now.className = 'tl-now';
  now.innerHTML = '<b></b><span></span>';
  rail.append(svg, now);
  document.body.append(rail);

  const el = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };
  const top = n => n.getBoundingClientRect().top + scrollY;
  const go = n => n.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });

  let H = 0, docH = 1, marks = [], fill, head, current = null, hover = null;

  function show(m) {
    if (!m || m === current) return;
    current = m;
    if (hover) return;
    write(m);
  }
  function write(m) {
    const [b, s] = now.children;
    if (reduce) { b.textContent = m.name; s.textContent = m.date; return; }
    now.classList.add('swap');
    clearTimeout(write.t);
    write.t = setTimeout(() => { b.textContent = m.name; s.textContent = m.date; now.classList.remove('swap'); }, 140);
  }

  function layout() {
    H = rail.clientHeight || Math.min(innerHeight * 0.56, 520);
    docH = document.documentElement.scrollHeight;
    const fits = docH > innerHeight * 1.5;
    rail.classList.toggle('ready', fits);
    svg.replaceChildren();
    rail.querySelectorAll('.tl-label').forEach(n => n.remove());
    marks = [];

    svg.append(el('line', { class: 'track', x1: 6, x2: 6, y1: 0, y2: H, pathLength: 1 }));
    fill = el('line', { class: 'fill', x1: 6, x2: 6, y1: 0, y2: 0 });
    svg.append(fill);

    const y = n => Math.max(0, Math.min(H, (top(n) / docH) * H));
    sections.forEach(h => {
      const at = y(h);
      const node = el('circle', { class: 'node', cx: 6, cy: at, r: 3.5, style: `--d:${Math.round(at / H * 700)}ms` });
      const btn = document.createElement('button');
      btn.className = 'tl-label';
      btn.type = 'button';
      btn.textContent = h.textContent;
      btn.style.top = `${at}px`;
      btn.addEventListener('click', () => go(h));
      svg.append(node);
      rail.append(btn);
      marks.push({ kind: 'section', at, node, btn });
    });
    items.forEach(li => {
      const at = y(li.querySelector('.row') || li);
      const tick = el('circle', { class: 'tick', cx: 6, cy: at, r: 2, style: `--d:${Math.round(at / H * 700) + 120}ms` });
      const hit = el('circle', { class: 'hit', cx: 6, cy: at, r: 6 });
      const m = { kind: 'item', at, tick, li, ...label(li) };
      hit.addEventListener('mouseenter', () => { hover = m; write(m); });
      hit.addEventListener('mouseleave', () => { hover = null; if (current) write(current); });
      hit.addEventListener('click', () => go(li));
      svg.append(tick, hit);
      marks.push(m);
    });

    head = el('g', { class: 'head' });
    head.append(el('circle', { cx: 6, cy: 0, r: 4 }), el('circle', { class: 'halo', cx: 6, cy: 0, r: 4 }));
    svg.append(head);
    current = null;
    update();
    if (fits && !layout.done) { layout.done = true; setTimeout(() => rail.classList.add('drawn'), 1600); }
  }

  // Back-to-top button with a ring that fills as you scroll.
  const btn = document.createElement('button');
  btn.className = 'totop';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Back to top');
  btn.innerHTML = '<svg viewBox="0 0 44 44" aria-hidden="true"><circle class="ring-bg" cx="22" cy="22" r="20"/><circle class="ring" cx="22" cy="22" r="20" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/><path class="arrow" d="M22 28.5V15.5M16.5 21 22 15.5 27.5 21"/></svg>';
  btn.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
  document.body.append(btn);
  const ring = btn.querySelector('.ring');

  function update() {
    const max = Math.max(1, docH - innerHeight);
    ring.setAttribute('stroke-dashoffset', 1 - Math.min(1, scrollY / max));
    btn.classList.toggle('on', scrollY > innerHeight * 0.6);
    if (!H) return;

    // The reading line sits about a third of the way down the viewport, easing up to
    // the very top at the start of the page and down to the bottom at its end, so the
    // head reaches both ends of the rail. The ramps scale with the page's length.
    const ramp = Math.min(innerHeight * 0.6, max * 0.3);
    const start = Math.min(1, scrollY / (ramp * 0.6));
    const end = Math.max(0, Math.min(1, (scrollY - (max - ramp)) / ramp));
    const line = scrollY + innerHeight * (0.35 * start + 0.65 * end);
    const hy = Math.max(0, Math.min(H, (line / docH) * H));
    fill.setAttribute('y2', hy);
    head.setAttribute('transform', `translate(0 ${hy})`);
    let here = null, sec = null;
    for (const m of marks) {
      const past = m.at <= hy + 0.5;
      if (m.kind === 'section') { m.node.classList.toggle('past', past); m.btn.classList.toggle('past', past); if (past) sec = m; }
      else { m.tick.classList.toggle('past', past); if (past) here = m; }
    }
    for (const m of marks) {
      if (m.kind === 'section') m.btn.classList.toggle('here', m === sec);
      else m.tick.classList.toggle('here', m === here);
    }
    show(here || marks.find(m => m.kind === 'item'));
  }

  let queued = false;
  addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }, { passive: true });
  addEventListener('resize', layout);
  new ResizeObserver(() => layout()).observe(document.body);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(layout);
})();
