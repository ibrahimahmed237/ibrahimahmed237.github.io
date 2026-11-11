/* The portfolio page logic: data and interactions. Rendered by runtime.js. */
class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { trace: 0, span: 0, replaying: false, auto: true, copied: false, theme: null, workFilter: 'all', showAllWork: false, active: '', now: Date.now() };
    this.lens = [9, 10, 7, 8];
  }

  componentDidMount() {
    this.autoTimer = setInterval(() => {
      const s = this.state;
      if (!s.auto || s.replaying || this.props.motion === false) return;
      try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
      const n = this.lens[s.trace] || 1;
      this.setState({ span: (s.span + 1) % n });
    }, 2600);
    try {
      const ids = ['work', 'experience', 'stack', 'about', 'contact'];
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
    if (this.clockTimer) clearInterval(this.clockTimer);
    if (this.spy) this.spy.disconnect();
    if (this.topSpy) this.topSpy.disconnect();
  }

  renderVals() {
    const motion = this.props.motion ?? true;
    const palette = this.props.darkPalette || 'dimmed';
    const s = this.state;
    const split = (word, start) => word.split('').map((ch, i) => ({ ch, d: (start + i * 0.05).toFixed(2) + 's' }));

    // [technical name, plain label, kind, start %, width %, plain explanation]
    const scenarioData = [
      {
        label: 'Demand planning', project: 'Demand forecasting & replenishment platform',
        caption: 'A planner opens the forecast screen. The screen, the server and the database work together in under a second.',
        spans: [
          ['GET /planner', 'Open the page', 'ui', 0, 100, 'The page shows its layout right away, then asks the server for the data.'],
          ['react-query cache', 'Reuse saved data', 'ui', 3, 34, 'If you have been here before, the saved data appears instantly while fresh data loads.'],
          ['GET /api/forecasts', 'Ask the server for numbers', 'http', 8, 38, 'The screen asks the server for the forecast numbers.'],
          ['auth.verify', 'Check who is asking', 'http', 10, 6, 'The server confirms you are logged in and allowed to see this.'],
          ['redis.get', 'Look in the fast cache', 'db', 17, 5, 'Popular data is kept in memory, so most answers come back almost instantly.'],
          ['db.select', 'Read from the database', 'db', 23, 20, 'If it is not cached, one efficient database query fetches it.'],
          ['GET /api/overrides', 'Fetch edits at the same time', 'http', 10, 26, 'A second request runs in parallel, so the page does not wait twice.'],
          ['render table', 'Draw the table', 'ui', 50, 30, 'Thousands of rows appear and scroll smoothly.'],
          ['optimistic update', 'Save an edit instantly', 'ui', 84, 14, 'Your change shows right away. The server confirms it in the background, or undoes it if something failed.']
        ]
      },
      {
        label: 'Inventory', project: 'Inventory rebalancing engine',
        caption: 'Stock moves from the warehouse to a store. Nothing gets lost or done twice, even if a step fails halfway.',
        spans: [
          ['POST /transfers', 'Receive the request', 'http', 0, 100, 'The system accepts a request to move stock and replies quickly. The heavy work happens in the background.'],
          ['auth.verify', 'Check permissions', 'http', 2, 8, 'Only people who are allowed can create transfers.'],
          ['validate', 'Check the data', 'http', 10, 6, 'Wrong or missing values are rejected right away.'],
          ['db.transaction', 'Save it safely', 'db', 16, 22, 'The transfer is saved in one all-or-nothing step.'],
          ['outbox.write', 'Save a note of what comes next', 'db', 30, 8, 'A note about the next step is saved together with it, so it can never get lost.'],
          ['kafka.publish', 'Announce it', 'queue', 40, 10, 'The new transfer is broadcast to the services that need to know.'],
          ['worker.consume', 'Pick up the job', 'queue', 52, 6, 'A background worker takes the job. If the message arrives twice, that is handled.'],
          ['redis.lock', 'Only one worker does it', 'db', 58, 6, 'A lock stops two workers from doing the same job at the same time.'],
          ['allocator.compute', 'Decide the quantities', 'http', 64, 22, 'It compares forecasts with live stock to decide how much each store gets.'],
          ['notify.store', 'Tell the store, once', 'queue', 87, 12, 'The store gets exactly one notification, even if the job had to retry.']
        ]
      },
      {
        label: 'Support bot', project: 'Multi-agent customer support',
        caption: 'A customer writes to support. The AI understands the request, checks the real order, replies, then double-checks.',
        spans: [
          ['chat.webhook', 'Customer sends a message', 'http', 0, 100, 'A customer writes to support and the message reaches the bot.'],
          ['supervisor.route', 'Understand the request', 'llm', 4, 14, 'A lead AI agent works out what the customer needs and picks the right specialist.'],
          ['pgvector.search', 'Look up the rules', 'db', 20, 12, 'It finds the company policies that apply, so the answer is based on facts.'],
          ['tool.order_lookup', 'Check the real order', 'http', 34, 14, 'It looks up the customer’s actual order instead of guessing.'],
          ['llm.generate', 'Write the reply', 'llm', 50, 30, 'The AI drafts a reply using the order details and the policies.'],
          ['guardrail.check', 'Double-check the answer', 'llm', 82, 8, 'A safety check reviews the reply. If it keeps failing, a human agent takes over.'],
          ['chat.reply', 'Send the answer', 'http', 92, 8, 'The customer gets the answer, and the whole conversation is logged for review.']
        ]
      },
      {
        label: 'Invoices', project: 'Mawrid (open source)',
        caption: 'A supplier sends an invoice. It is checked against the order and the delivery before anyone pays it.',
        spans: [
          ['POST /invoices', 'Receive the invoice', 'http', 0, 100, 'A supplier sends an invoice, as an e-invoice file or a PDF.'],
          ['ubl.parse', 'Read the file', 'http', 3, 10, 'The invoice file is read safely, line by line.'],
          ['zatca.qr.decode', 'Verify the tax QR code', 'http', 14, 8, 'The Saudi tax authority QR code is decoded and its totals are checked.'],
          ['db.load', 'Find the order and delivery', 'db', 24, 14, 'It loads what was ordered and what was actually received.'],
          ['three_way_match', 'Compare all three', 'http', 40, 18, 'Order, delivery and invoice must match, within the agreed tolerance.'],
          ['outbox.write', 'Record the result', 'db', 60, 6, 'The result is saved together with a note of what happens next.'],
          ['hangfire.release', 'Approve for payment', 'queue', 68, 10, 'A background job releases the invoice for payment.'],
          ['erp.webhook', 'Notify accounting', 'queue', 80, 18, 'The accounting system gets a secure, signed message, retried until it is received.']
        ]
      }
    ];
    this.lens = scenarioData.map((sc) => sc.spans.length);

    const scenarios = scenarioData.map((sc, i) => {
      const on = s.trace === i;
      const idx = Math.min(s.span, sc.spans.length - 1);
      const active = sc.spans[idx];
      return {
        label: sc.label,
        project: sc.project,
        caption: sc.caption,
        show: on && !s.replaying,
        ariaSel: on ? 'true' : 'false',
        cls: on ? 'is-on' : '',
        pick: () => this.setState({ trace: i, span: 0, auto: true }),
        activeNum: String(idx + 1),
        total: String(sc.spans.length),
        activeTech: active[0],
        activePlain: active[1],
        activeDesc: active[5],
        spans: sc.spans.map((x, j) => ({
          num: String(j + 1).padStart(2, '0'),
          plain: x[1], kind: x[2], left: x[3] + '%', width: x[4] + '%', delay: (j * 0.16).toFixed(2) + 's',
          cls: j === idx ? 'is-on' : (j < idx ? 'is-done' : ''),
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

    // cats: ai, backend, fullstack, data
    const workData = [
      {
        title: 'Multi-agent customer support (LLM)', tag: 'Rabbit · Applied AI', color: 'var(--c-llm)', cats: ['ai', 'backend', 'data'],
        body: 'A supervisor agent routes customer chats to specialist agents for order lookup, cancellation and compensation, grounded by pgvector retrieval over a knowledge base the team manages from a web UI. Its late-order handover policy decides when a chat goes to a human: it detects escalation conditions, applies a configurable pushback level and logs every decision, measured with before-and-after analyses of contact rate, wait time and handling time. Traced in Langfuse and cached in Redis across pods.',
        flow: ['Freshchat', 'Supervisor', 'Tools + RAG', 'Handover policy', 'Reply or human'],
        stack: ['Python', 'LangGraph', 'FastAPI', 'pgvector', 'Redis', 'Langfuse']
      },
      {
        title: 'Warehouse receiving queue with vision OCR', tag: 'Rabbit · Backend + AI', color: 'var(--accent-strong)', cats: ['backend', 'ai', 'fullstack'],
        body: 'Supplier drivers check in at the warehouse over WhatsApp. The service confirms they are at the dock, reads their delivery documents with LLM vision, places them in a prioritized queue, and keeps them updated as their wait drops. Built time-zone safe, with a live queue screen for the dock team.',
        flow: ['WhatsApp', 'Location check', 'Vision LLM', 'Queue placement', 'Serve next'],
        stack: ['NestJS', 'Redis', 'BullMQ', 'Kafka', 'OpenAI', 'Gemini', 'React']
      },
      {
        title: 'Returns-to-vendor service: monolith migration', tag: 'Rabbit · Full stack', color: 'var(--c-data)', cats: ['backend', 'fullstack', 'data'],
        body: 'Moved the return-to-supplier workflow off a legacy monolith into its own service: requests, warehouse handover, proof photos with automatic checks, problem-item cases, supplier emails and printable sheets, and a nightly no-show job. Shipped with a rehearsed, reversible data cutover that keeps record numbers continuous.',
        flow: ['Request', 'Handover', 'Proof photos', 'Close + email', 'Audit trail'],
        stack: ['NestJS', 'Prisma', 'BullMQ', 'AWS S3', 'React', 'Outbox']
      },
      {
        title: 'Demand forecasting & replenishment platform', tag: 'Rabbit · Full stack', color: 'var(--c-ui)', cats: ['fullstack', 'backend'],
        body: 'Built with planners end to end: data model, REST APIs and the React UI, BigQuery forecast sync, override reasons and a pre-PO review. Supplier groups are built automatically from category, brand and storage condition and checked daily, each group gets a planner and an ordering schedule, and the purchase-order engine uses locks and a submission log so an order is never duplicated or lost.',
        flow: ['BigQuery', 'Auto supplier groups', 'Planner schedule', 'Pre-PO review', 'PO log'],
        stack: ['NestJS', 'React', 'TypeScript', 'PostgreSQL', 'BigQuery']
      },
      {
        title: 'At-risk purchase order monitor', tag: 'Rabbit · Demand planning', color: 'var(--c-ui)', cats: ['fullstack', 'backend', 'data'],
        body: 'An early-morning job finds supplier orders at risk from fill rate, lead time and what is still in transit, ranks them by value at risk, and puts follow-up orders straight into each planner’s day, with a case view, outcomes and a dashboard. Runs once across pods and reads big data in chunks.',
        flow: ['Morning job', 'Risk check', 'Rank by value', 'Planner follow-up', 'Outcome'],
        stack: ['NestJS', 'BigQuery', 'PostgreSQL', 'React', 'Scheduled jobs']
      },
      {
        title: 'Inventory rebalancing engine', tag: 'Rabbit · Backend', color: 'var(--accent-strong)', cats: ['backend', 'data'],
        body: 'Joins forecasts with live warehouse stock to recommend and draft store transfers automatically, with fair allocation when stock is short. Event-driven and idempotent, with schedules changeable without a restart and Slack alerts when a job fails or never runs.',
        flow: ['Forecasts', 'Live stock', 'Allocate', 'Draft transfers', 'Job health'],
        stack: ['NestJS', 'Kafka', 'Prisma', 'Redis', 'BullMQ']
      },
      {
        title: 'Hybrid semantic + keyword search', tag: 'Rabbit · Search', color: 'var(--c-data)', cats: ['ai', 'data'],
        body: 'Search that fuses semantic embeddings with Elasticsearch keyword matching, so results match both what the customer means and the exact words they typed.',
        flow: ['Query', 'Embed', 'Vector + keyword', 'Fuse ranks', 'Results'],
        stack: ['Elasticsearch', 'Embeddings', 'Hybrid ranking']
      },
      {
        title: 'Product recommendation engine (ML)', tag: 'Numinix · ML', color: 'var(--c-llm)', cats: ['ai', 'data'],
        body: 'A machine-learning recommendation engine in Python for high-traffic e-commerce stores, with behavioural event logging through Matomo, to improve product discovery.',
        flow: ['Store events', 'Matomo', 'Model', 'Recommendations'],
        stack: ['Python', 'Machine learning', 'Matomo']
      },
      {
        title: 'Payment gateways & gRPC migration', tag: 'Numinix · Backend', color: 'var(--accent-strong)', cats: ['backend'],
        body: 'Stripe, PayPal and EPN across multi-currency stores, ShipStation shipping, and critical service-to-service paths moved from legacy REST to gRPC to cut latency.',
        flow: ['Checkout', 'Payment gateway', 'Order', 'ShipStation'],
        stack: ['GraphQL', 'REST', 'gRPC', 'Stripe', 'PayPal']
      },
      {
        title: 'Baton: AI coding-agent chat handoff', tag: 'Open source · Python + SwiftUI', color: 'var(--c-ui)', cats: ['backend', 'fullstack', 'ai'],
        body: 'A Mac menu-bar app that hands a conversation between AI coding agents (Claude Code, Codex, OpenCode and Cursor) and keeps the same chat going on each side. Only linked chats are touched, every write is journaled first and can be undone, and conflicts are merged with a preview. A dependency-free Python engine backed by hundreds of tests. In progress.',
        flow: ['Link two chats', 'Reply ends', 'Plan the sync', 'Journal + write', 'Undo anytime'],
        stack: ['Python', 'SwiftUI', 'macOS', 'Agent hooks', 'Zero dependencies'],
        link: 'https://github.com/ibrahimahmed237/baton'
      },
      {
        title: 'Qist: buy-now-pay-later platform', tag: 'Open source · Java + Spring Boot', color: 'var(--accent-strong)', cats: ['backend', 'data'],
        body: 'A buy-now-pay-later platform for Saudi merchants: six Spring Boot services that talk over Kafka. A purchase is an orchestrated saga with timeouts and undo steps, card charges run outside database transactions with idempotency keys, and every riyal lands in a double-entry ledger. One request id follows a purchase through every service. About 300 tests on real PostgreSQL and Kafka, plus end-to-end tests in Docker Compose.',
        flow: ['Checkout', 'Credit check', 'First payment', 'Installment plan', 'Ledger'],
        stack: ['Java 21', 'Spring Boot', 'Kafka', 'PostgreSQL', 'Redis', 'Testcontainers'],
        link: 'https://github.com/ibrahimahmed237/qist'
      },
      {
        title: 'Mawrid: procure-to-pay API', tag: 'Open source · .NET', color: 'var(--c-data)', cats: ['backend'],
        body: 'An open-source procure-to-pay API for Saudi companies: approvals, sealed RFQs, purchase orders, receipts and ZATCA invoices checked with a three-way match. About 370 tests.',
        flow: ['Requisition', 'RFQ', 'PO', 'Receipt', '3-way match'],
        stack: ['.NET 10', 'ASP.NET Core', 'EF Core', 'SQL Server', 'Hangfire'],
        link: 'https://github.com/ibrahimahmed237/mawrid'
      }
    ];
    // Strongest work first
    const rankOrder = [
      'Demand forecasting & replenishment platform',
      'Multi-agent customer support (LLM)',
      'Inventory rebalancing engine',
      'At-risk purchase order monitor',
      'Returns-to-vendor service: monolith migration',
      'Warehouse receiving queue with vision OCR',
      'Qist: buy-now-pay-later platform',
      'Baton: AI coding-agent chat handoff',
      'Mawrid: procure-to-pay API',
      'Hybrid semantic + keyword search',
      'Product recommendation engine (ML)',
      'Payment gateways & gRPC migration'
    ];
    workData.sort((a, b) => rankOrder.indexOf(a.title) - rankOrder.indexOf(b.title));
    const filterDefs = [['all', 'All'], ['fullstack', 'Full stack'], ['backend', 'Backend'], ['ai', 'AI'], ['data', 'Data']];
    const wf = s.workFilter || 'all';
    const filters = filterDefs.map((f) => {
      const count = f[0] === 'all' ? workData.length : workData.filter((w) => w.cats.indexOf(f[0]) >= 0).length;
      return {
        label: f[1], count: String(count),
        cls: wf === f[0] ? 'is-on' : '',
        pressed: wf === f[0] ? 'true' : 'false',
        pick: () => this.setState({ workFilter: f[0], showAllWork: false })
      };
    });
    const matching = wf === 'all' ? workData : workData.filter((w) => w.cats.indexOf(wf) >= 0);
    const limit = 9;
    const visible = (s.showAllWork || matching.length <= limit) ? matching : matching.slice(0, limit);
    const works = visible.map((w, i) => ({
      ...w,
      num: String(i + 1).padStart(2, '0'),
      link: w.link || '',
      flow: w.flow.map((label, j) => ({ label, more: j < w.flow.length - 1 }))
    }));
    const hasMore = !s.showAllWork && matching.length > limit;
    const showAllWork = () => this.setState({ showAllWork: true });
    const moreLabel = 'Show all ' + matching.length + ' projects';

    const stackData = [
      { name: 'Languages', items: ['TypeScript', 'JavaScript', 'Python', 'C#', 'Java', 'SQL', 'C++'] },
      { name: 'Frontend', items: ['React', 'TypeScript', 'React Query', 'React Hook Form', 'MUI', 'i18n / RTL'] },
      { name: 'Backend', items: ['Node.js', 'NestJS', 'ASP.NET Core', 'Spring Boot', 'FastAPI', 'Express', 'GraphQL', 'gRPC'] },
      { name: 'Data & messaging', items: ['PostgreSQL', 'MySQL', 'SQL Server', 'Redis', 'Kafka', 'BullMQ', 'Elasticsearch', 'Prisma', 'EF Core', 'BigQuery', 'MongoDB'] },
      { name: 'AI', items: ['LangChain', 'LangGraph', 'OpenAI API', 'Gemini API', 'RAG', 'pgvector', 'Langfuse'] },
      { name: 'Cloud, DevOps & testing', items: ['AWS', 'Google Cloud', 'Docker', 'Kubernetes', 'Helm', 'GitHub Actions', 'Jest', 'xUnit', 'Testcontainers'] }
    ];
    const stack = stackData.map((g) => ({ ...g, count: String(g.items.length).padStart(2, '0') }));

    const words = ['React', 'TypeScript', 'Node.js', 'NestJS', 'ASP.NET Core', 'Spring Boot', 'FastAPI', 'Kafka', 'Redis', 'PostgreSQL', 'LangGraph', 'pgvector', 'Docker', 'AWS'];
    const marquee = words.concat(words);

    const roleData = [
      ['Full stack', 'var(--c-ui)'], ['Backend', 'var(--accent-strong)'], ['Applied AI', 'var(--c-llm)'], ['Event-driven', 'var(--c-data)']
    ];
    const roles = roleData.map((r, i) => ({ label: r[0], color: r[1], d: (1 + i * 0.08).toFixed(2) + 's' }));

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

    const theme = s.theme || this.props.theme || 'light';
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

    return {
      motionClass: motion ? '' : 'no-motion',
      themeClass: theme === 'light' ? 'theme-light' : '',
      switchClass: s.switching ? 'switching' : '',
      paletteClass: palette === 'dimmed' ? '' : 'dk-' + palette,
      darkAccent: this.props.darkAccent ?? '#E8CF8F',
      lightClass: (this.props.lightAccent || 'gold') === 'mint' ? 'lt-mint' : '',
      navItems: [['work', 'Work'], ['experience', 'Experience'], ['stack', 'Stack'], ['about', 'About'], ['contact', 'Contact']].map((n) => ({
        href: '#' + n[0], label: n[1],
        cls: s.active === n[0] ? 'is-active' : '',
        current: s.active === n[0] ? 'true' : 'false'
      })),
      menuCls: s.menuOpen ? 'is-open' : '',
      menuOpen: !!s.menuOpen,
      notMenuOpen: !s.menuOpen,
      menuExpanded: s.menuOpen ? 'true' : 'false',
      menuLabel: s.menuOpen ? 'Close menu' : 'Open menu',
      toggleMenu: () => this.setState({ menuOpen: !s.menuOpen }),
      closeMenu: () => this.setState({ menuOpen: false }),
      contactOpen: !!s.contactOpen,
      contactExpanded: s.contactOpen ? 'true' : 'false',
      toggleContact: (e) => { if (e) e.stopPropagation(); this.setState({ contactOpen: !s.contactOpen }); },
      closeContact: () => this.setState({ contactOpen: false }),
      isLight: theme === 'light',
      isDark: theme !== 'light',
      themeLabel: theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme',
      toggleTheme,
      first: split('Ibrahim', 0.15),
      last: split('Ahmed', 0.5),
      roles,
      pipeline,
      scenarios,
      replay,
      toggleAuto,
      auto: s.auto,
      notAuto: !s.auto,
      autoText: s.auto ? 'pause' : 'play',
      autoLabel: s.auto ? 'Pause the walkthrough' : 'Play the walkthrough step by step',
      works,
      filters,
      hasMore,
      showAllWork,
      moreLabel,
      stack,
      marquee,
      rabbitStack: ['NestJS', 'TypeScript', 'React', 'Python', 'FastAPI', 'LangGraph', 'Kafka', 'Redis', 'BullMQ', 'PostgreSQL', 'Prisma', 'pgvector', 'BigQuery', 'Elasticsearch', 'AWS', 'Docker', 'Helm'],
      numinixStack: ['GraphQL', 'REST', 'gRPC', 'PHP', 'Python', 'MySQL', 'Stripe', 'PayPal'],
      copyEmail,
      copied: s.copied,
      notCopied: !s.copied,
      copyLabel: s.copied ? 'Copied' : 'Copy email'
    };
  }
}
