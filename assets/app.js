/* The portfolio page logic: state and interactions. Words live in content.js. Rendered by runtime.js. */
function initialLang() {
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'ar' || q === 'en') return q;
  } catch (e) {}
  try {
    const saved = localStorage.getItem('lang');
    if (saved === 'ar' || saved === 'en') return saved;
  } catch (e) {}
  return 'en';
}

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { trace: 0, span: 0, replaying: false, auto: true, copied: false, theme: null, active: '', lang: initialLang() };
    this.lens = window.CONTENT.demo.map((d) => d.steps.length);
  }

  componentDidMount() {
    this.applyLang(this.state.lang, false);
    this.autoTimer = setInterval(() => {
      const s = this.state;
      if (!s.auto || s.replaying || this.props.motion === false) return;
      try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
      const n = this.lens[s.trace] || 1;
      this.setState({ span: (s.span + 1) % n });
    }, 2800);
    try {
      const ids = ['experience', 'work', 'oss', 'stack', 'about', 'contact'];
      this.spy = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) this.setState({ active: e.target.id }); });
      }, { rootMargin: '-45% 0px -50% 0px' });
      ids.forEach((id) => { const el = document.getElementById(id); if (el) this.spy.observe(el); });
      const top = document.getElementById('top');
      if (top) {
        this.topSpy = new IntersectionObserver((entries) => {
          entries.forEach((e) => { if (e.isIntersecting) this.setState({ active: '' }); });
        }, { rootMargin: '-45% 0px -50% 0px' });
        this.topSpy.observe(top);
      }
    } catch (e) {}
    this.outside = (e) => {
      if (this.state.contactOpen && !(e.target.closest && e.target.closest('.cmenu-wrap'))) this.setState({ contactOpen: false });
    };
    this.escape = (e) => { if (e.key === 'Escape' && this.state.contactOpen) this.setState({ contactOpen: false }); };
    document.addEventListener('click', this.outside);
    document.addEventListener('keydown', this.escape);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.outside);
    document.removeEventListener('keydown', this.escape);
    if (this.copyTimer) clearTimeout(this.copyTimer);
    if (this.replayTimer) clearTimeout(this.replayTimer);
    if (this.autoTimer) clearInterval(this.autoTimer);
    if (this.spy) this.spy.disconnect();
    if (this.topSpy) this.topSpy.disconnect();
  }

  /** Puts the language on the document: direction, title, description, address bar, and the saved choice. */
  applyLang(lang, remember) {
    const t = window.CONTENT[lang];
    const root = document.documentElement;
    root.lang = t.lang;
    root.dir = t.dir;
    document.title = t.title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', t.metaDesc);
    if (remember) {
      try { localStorage.setItem('lang', lang); } catch (e) {}
      try {
        const url = new URL(window.location.href);
        if (lang === 'ar') url.searchParams.set('lang', 'ar'); else url.searchParams.delete('lang');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      } catch (e) {}
    }
  }

  renderVals() {
    const C = window.CONTENT;
    const motion = this.props.motion ?? true;
    const palette = this.props.darkPalette || 'dimmed';
    const s = this.state;
    const ar = s.lang === 'ar';
    const L = ar ? 1 : 0;
    const t = ar ? C.ar : C.en;
    const theme = s.theme || this.props.theme || 'light';

    // Arabic letters join, so the name rises word by word instead of letter by letter.
    const split = (word, start) => (ar ? [word] : word.split('')).map((ch, i) => ({ ch, d: (start + i * 0.05).toFixed(2) + 's' }));

    const scenarios = C.demo.map((sc, i) => {
      const on = s.trace === i;
      const idx = Math.min(s.span, sc.steps.length - 1);
      const words = (x) => (ar ? x[6] : x[5]);
      return {
        label: ar ? sc.project[1].split(' · ')[0] : sc.label,
        project: sc.project[L],
        caption: sc.caption[L],
        show: on && !s.replaying,
        ariaSel: on ? 'true' : 'false',
        cls: on ? 'is-on' : '',
        pick: () => this.setState({ trace: i, span: 0, auto: true }),
        hidden: on ? 'false' : 'true',
        total: String(sc.steps.length),
        // Every step's card is drawn, stacked in one place; only the current one shows, so the panel never changes height.
        cards: sc.steps.map((x, j) => ({
          cls: j === idx ? 'is-on' : '', hidden: j === idx ? 'false' : 'true',
          num: String(j + 1), tech: x[0], plain: words(x)[0], desc: words(x)[1],
          file: x[4].split('/').pop(), link: C.code(sc.repo, x[4])
        })),
        spans: sc.steps.map((x, j) => ({
          num: String(j + 1).padStart(2, '0'),
          plain: words(x)[0], kind: x[1], left: x[2] + '%', width: x[3] + '%', delay: (j * 0.16).toFixed(2) + 's',
          cls: (j === idx ? 'is-on' : (j < idx ? 'is-done' : '')) + (x[1] === 'fault' ? ' is-fault' : ''),
          pressed: j === idx ? 'true' : 'false',
          pick: () => this.setState({ span: j, auto: false })
        }))
      };
    });

    const replay = () => {
      this.setState({ replaying: true, span: 0, auto: true }, () => {
        if (this.replayTimer) clearTimeout(this.replayTimer);
        this.replayTimer = setTimeout(() => this.setState({ replaying: false }), 40);
      });
    };
    const toggleAuto = () => this.setState({ auto: !s.auto });

    const oss = C.oss.map((p) => ({
      name: p.name[L], sub: p.sub[L], pitch: p.pitch[L], color: p.color,
      link: C.GH + p.repo,
      img: 'assets/oss/' + p.img + '-' + (theme === 'light' ? 'light' : 'dark') + '.svg',
      alt: p.name[0] + ': ' + p.sub[0],
      stats: p.stats.map((x) => ({ num: ar && x[3] ? x[3] : x[0], label: ar ? x[2] : x[1] })),
      stack: p.stack
    }));
    const baton = { name: C.baton.name[L], sub: C.baton.sub[L], pitch: C.baton.pitch[L], link: C.GH + C.baton.repo, stack: C.baton.stack };

    const works = C.work.map((w, i) => ({
      tag: w.tag, color: w.color, stack: w.stack, title: w.title[L], body: w.body[L], num: String(i + 1).padStart(2, '0')
    }));

    const skills = C.skills.map((k) => ({ title: k.title[L], body: k.body[L], items: k.items }));

    const groups = (list) => list.map((g) => ({ name: g[0], color: g[1], items: g[2] }));

    const words = ['React', 'TypeScript', 'Node.js', 'NestJS', 'ASP.NET Core', 'Spring Boot', 'FastAPI', 'Kafka', 'Redis', 'PostgreSQL', 'LangGraph', 'pgvector', 'Docker', 'AWS'];
    const marquee = words.concat(words);

    const roleColors = ['var(--c-ui)', 'var(--accent-strong)', 'var(--c-llm)'];
    const roles = t.roles.map((label, i) => ({ label, color: roleColors[i], d: (1 + i * 0.08).toFixed(2) + 's' }));

    const pipeNames = ['lint', 'test', 'build', 'deploy'];
    const pipeline = pipeNames.map((label, i) => ({ label, d: (i * 0.5) + 's', more: i < pipeNames.length - 1 }));

    const copyEmail = () => {
      try {
        navigator.clipboard.writeText('ibrahim.ahmed.iam@gmail.com').then(() => {
          this.setState({ copied: true });
          if (this.copyTimer) clearTimeout(this.copyTimer);
          this.copyTimer = setTimeout(() => this.setState({ copied: false }), 1800);
        }).catch(() => {});
      } catch (e) {}
    };

    const toggleTheme = () => {
      const next = theme === 'light' ? 'dark' : 'light';
      const apply = () => new Promise((resolve) => this.setState({ theme: next, switching: true }, resolve));
      const done = () => setTimeout(() => this.setState({ switching: false }), 30);
      let reduce = false;
      try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
      if (motion && !reduce && document.startViewTransition) {
        try { const vt = document.startViewTransition(apply); vt.finished.then(done, done); return; } catch (e) {}
      }
      this.setState({ theme: next, switching: true }, done);
    };

    const toggleLang = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      const next = ar ? 'en' : 'ar';
      this.applyLang(next, true);
      this.setState({ lang: next, menuOpen: false });
    };

    return {
      t,
      dir: t.dir,
      lang: t.lang,
      motionClass: motion ? '' : 'no-motion',
      themeClass: theme === 'light' ? 'theme-light' : '',
      switchClass: s.switching ? 'switching' : '',
      paletteClass: palette === 'dimmed' ? '' : 'dk-' + palette,
      darkAccent: this.props.darkAccent ?? '#E8CF8F',
      lightClass: (this.props.lightAccent || 'gold') === 'mint' ? 'lt-mint' : '',
      navItems: t.nav.map((n) => ({
        href: '#' + n[0], label: n[1],
        cls: s.active === n[0] ? 'is-active' : '',
        current: s.active === n[0] ? 'true' : 'false'
      })),
      toggleLang,
      menuCls: s.menuOpen ? 'is-open' : '',
      menuOpen: !!s.menuOpen,
      notMenuOpen: !s.menuOpen,
      menuExpanded: s.menuOpen ? 'true' : 'false',
      menuLabel: s.menuOpen ? t.closeMenu : t.openMenu,
      toggleMenu: () => this.setState({ menuOpen: !s.menuOpen }),
      closeMenu: () => this.setState({ menuOpen: false }),
      contactOpen: !!s.contactOpen,
      contactExpanded: s.contactOpen ? 'true' : 'false',
      toggleContact: (e) => { if (e) e.stopPropagation(); this.setState({ contactOpen: !s.contactOpen }); },
      closeContact: () => this.setState({ contactOpen: false }),
      isLight: theme === 'light',
      isDark: theme !== 'light',
      themeLabel: theme === 'light' ? t.toDark : t.toLight,
      toggleTheme,
      first: split(t.first, 0.15),
      last: split(t.last, 0.5),
      roles,
      pipeline,
      scenarios,
      replay,
      toggleAuto,
      auto: s.auto,
      notAuto: !s.auto,
      autoText: s.auto ? t.pause : t.play,
      autoLabel: s.auto ? t.pauseLabel : t.playLabel,
      oss,
      baton,
      works,
      skills,
      rabbitGroups: groups(t.rabbitGroups),
      numinixGroups: groups(t.numinixGroups),
      marquee,
      rabbitStack: ['NestJS', 'TypeScript', 'React', 'Python', 'FastAPI', 'LangGraph', 'Kafka', 'Redis', 'BullMQ', 'PostgreSQL', 'Prisma', 'pgvector', 'BigQuery', 'Elasticsearch', 'AWS', 'Docker', 'Helm'],
      numinixStack: ['GraphQL', 'REST', 'gRPC', 'PHP', 'Python', 'MySQL', 'Stripe', 'PayPal'],
      copyEmail,
      copied: s.copied,
      notCopied: !s.copied,
      copyLabel: s.copied ? t.copied : t.copyEmail
    };
  }
}
