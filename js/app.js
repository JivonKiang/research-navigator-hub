const DATA_URL = 'data/research-data.json';
const VERIFY_KEY = 'jivon_research_reference_status_v2';
const SELECT_KEY = 'jivon_research_selected_idea_v2';

const state = {
  data: null,
  filter: 'all',
  search: '',
  refFilter: 'all',
  selectedIdea: null
};

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

function ensureShell() {
  if ($('#metric-stack') && $('#verify-copy') && $('#network-canvas')) return;
  document.body.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#overview">
        <span class="brand-mark">JR</span>
        <span>
          <strong>Jivon Research Navigator</strong>
          <small>ORCID × 疾病方向 × 科研套路</small>
        </span>
      </a>
      <nav class="main-nav" aria-label="主导航">
        <a href="#overview">总览</a>
        <a href="#network">交互网络</a>
        <a href="#ideas">Idea 库</a>
        <a href="#references">文献核实</a>
        <a href="#quality">数据质量</a>
      </nav>
      <button class="nav-toggle" id="nav-toggle" aria-label="展开导航">导航</button>
    </header>
    <main>
      <section id="overview" class="hero section">
        <div class="hero-copy">
          <p class="eyebrow">综合科研工作台</p>
          <h1>从个人论文画像出发，找到值得推进的疾病研究交叉点</h1>
          <p class="lead">页面把 ORCID 学术画像、结核因果分析、GBD 疾病负担、医学热点和科研套路放到同一张图里。总览负责判断优先级，网络图负责探索关系，Idea 详情负责沉淀证据链。</p>
          <div class="hero-actions">
            <a class="btn primary" href="#network">查看交互网络</a>
            <a class="btn" href="#references">开始核实文献</a>
          </div>
        </div>
        <aside class="hero-panel">
          <div class="panel-title">当前状态</div>
          <div class="metric-stack" id="metric-stack"></div>
        </aside>
      </section>
      <section class="section overview-grid">
        <article class="card wide">
          <div class="section-kicker">一屏判断</div>
          <h2>优先级不是按热闹程度排，而是按“证据、可行性、个人积累”排</h2>
          <p>结核病因果与诊断应当留在主系统里，作为一个可展开的疾病节点。它和 pQTL-MR、多组学诊断、政策因果评估三条线都有连接，但优先级不同。</p>
          <div class="priority-list" id="priority-list"></div>
        </article>
        <article class="card">
          <div class="section-kicker">研究组合</div>
          <h2>方向分布</h2>
          <div id="field-summary" class="mini-list"></div>
        </article>
        <article class="card">
          <div class="section-kicker">核实进度</div>
          <h2>参考文献状态</h2>
          <div class="donut-wrap">
            <div class="donut" id="verify-donut">0%</div>
            <p id="verify-copy"></p>
          </div>
        </article>
      </section>
      <section id="network" class="section split">
        <div class="section-head">
          <div>
            <p class="eyebrow">Interaction Map</p>
            <h2>领域 × 方法套路网络图</h2>
            <p>左侧是研究方向，右侧是方法套路。每条连线都是一个 idea，线越粗、越绿，可行性越高。</p>
          </div>
          <div class="filters" id="filters">
            <button class="chip active" data-filter="all">全部</button>
            <button class="chip" data-filter="tb">结核相关</button>
            <button class="chip" data-filter="high">高可行性</button>
            <button class="chip" data-filter="unverified">待核实</button>
          </div>
        </div>
        <div class="network-layout">
          <article class="network-card">
            <div id="network-canvas" class="network-canvas"></div>
            <div class="legend">
              <span><i class="dot blue"></i>领域节点</span>
              <span><i class="dot purple"></i>方法节点</span>
              <span><i class="line green"></i>高可行性</span>
              <span><i class="line amber"></i>需补证据</span>
            </div>
          </article>
          <aside class="detail-card" id="idea-detail"></aside>
        </div>
      </section>
      <section id="ideas" class="section">
        <div class="section-head">
          <div>
            <p class="eyebrow">Idea Library</p>
            <h2>可推进 Idea 库</h2>
            <p>卡片显示摘要和评分；点击后在详情面板查看研究设计、数据源、预期产出和参考文献。</p>
          </div>
          <input id="search" class="search" type="search" placeholder="搜索 TB、MR、GBD、ORCID、CKM...">
        </div>
        <div id="idea-list" class="idea-grid"></div>
      </section>
      <section class="section brainstorm">
        <div class="section-head">
          <div>
            <p class="eyebrow">Brainstorm Board</p>
            <h2>从已有积累延伸出的研究切口</h2>
            <p>这里把可能的分支先摆出来，方便决定哪些值得继续查。</p>
          </div>
        </div>
        <div id="brainstorm-board" class="brainstorm-grid"></div>
      </section>
      <section id="references" class="section">
        <div class="section-head">
          <div>
            <p class="eyebrow">Reference Verification</p>
            <h2>参考文献核实区</h2>
            <p>默认问号代表未核实。打开 PubMed 或 DOI 后，点击状态按钮可切换为已核实或已否决。</p>
          </div>
          <div class="ref-tools">
            <button class="btn" id="show-unknown">只看未核实</button>
            <button class="btn" id="show-all-refs">全部文献</button>
          </div>
        </div>
        <div id="reference-list" class="reference-list"></div>
      </section>
      <section id="quality" class="section quality-grid">
        <article class="card">
          <p class="eyebrow">Data Quality</p>
          <h2>这版怎么避免“看起来很丰富但不可信”</h2>
          <p>正式证据区不再把 GEN... 这类生成型 PMID 当作真实文献展示。没有 PMID 的文献会走 DOI 或 PubMed 标题检索，保留人工核实入口。</p>
        </article>
        <article class="card">
          <p class="eyebrow">Migration</p>
          <h2>旧仓的角色</h2>
          <p>旧仓已经变成迁移说明入口。新的综合仓承担 ORCID、疾病方向、科研套路、交互分析和文献核实功能。</p>
          <a class="btn" href="https://github.com/JivonKiang/JivonKiang.github.io/blob/main/README.md" target="_blank" rel="noopener">查看旧仓迁移说明</a>
        </article>
      </section>
    </main>
    <footer class="footer">
      <span>Jivon Research Navigator</span>
      <a href="https://github.com/JivonKiang/research-navigator-hub" target="_blank" rel="noopener">GitHub 仓库</a>
      <a href="https://jivonkiang.github.io/research-navigator-hub/" target="_blank" rel="noopener">GitHub Pages</a>
    </footer>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[char]);
}

function verifyStore() {
  try {
    return JSON.parse(localStorage.getItem(VERIFY_KEY) || '{}');
  } catch {
    return {};
  }
}

function setVerifyStore(next) {
  localStorage.setItem(VERIFY_KEY, JSON.stringify(next));
}

function refStatus(refId) {
  return verifyStore()[refId] || 'unknown';
}

function cycleRef(refId) {
  const order = ['unknown', 'verified', 'rejected'];
  const current = refStatus(refId);
  const next = order[(order.indexOf(current) + 1) % order.length];
  const all = verifyStore();
  all[refId] = next;
  setVerifyStore(all);
  renderAll();
}

function statusMark(status) {
  if (status === 'verified') return '✓';
  if (status === 'rejected') return '×';
  return '?';
}

function refById(id) {
  return state.data.references.find(ref => ref.id === id);
}

function fieldById(id) {
  return state.data.fields.find(field => field.id === id);
}

function methodById(id) {
  return state.data.methods.find(method => method.id === id);
}

function refsForIdea(idea) {
  return idea.references.map(refById).filter(Boolean);
}

function pubmedUrl(ref) {
  if (ref.pmid) return `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(ref.pmid)}/`;
  const query = `${ref.title || ''} ${ref.journal || ''}`.trim();
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`;
}

function doiUrl(ref) {
  return ref.doi ? `https://doi.org/${encodeURIComponent(ref.doi)}` : '';
}

function filteredIdeas() {
  const term = state.search.trim().toLowerCase();
  return state.data.ideas.filter(idea => {
    const refs = refsForIdea(idea);
    const unknown = refs.some(ref => refStatus(ref.id) === 'unknown');
    if (state.filter === 'tb' && idea.field !== 'tb') return false;
    if (state.filter === 'high' && idea.feasibility < 85) return false;
    if (state.filter === 'unverified' && !unknown) return false;
    if (term) {
      const field = fieldById(idea.field);
      const method = methodById(idea.method);
      const text = [
        idea.title, idea.question, idea.rationale, idea.stage,
        field?.name, method?.name, ...(idea.dataSources || []), ...(idea.brainstorm || [])
      ].join(' ').toLowerCase();
      if (!text.includes(term)) return false;
    }
    return true;
  });
}

function scoreClass(value) {
  if (value >= 85) return 'green';
  if (value >= 75) return 'amber';
  return '';
}

function renderMetrics() {
  const ideas = state.data.ideas;
  const refs = state.data.references;
  const store = verifyStore();
  const verified = refs.filter(ref => store[ref.id] === 'verified').length;
  const unknown = refs.length - refs.filter(ref => store[ref.id] === 'verified' || store[ref.id] === 'rejected').length;
  const high = ideas.filter(idea => idea.feasibility >= 85).length;
  $('#metric-stack').innerHTML = [
    ['Idea 总数', ideas.length],
    ['参考文献', refs.length],
    ['高可行性', high],
    ['待核实', unknown]
  ].map(([label, value]) => `<div class="metric-row"><span>${label}</span><strong>${value}</strong></div>`).join('');

  const pct = refs.length ? Math.round((verified / refs.length) * 100) : 0;
  const donut = $('#verify-donut');
  donut.style.setProperty('--p', `${pct}%`);
  donut.dataset.label = `${pct}%`;
  $('#verify-copy').textContent = `${verified}/${refs.length} 条参考文献已人工核实。未核实不会被页面默认当作可靠证据。`;
}

function renderOverview() {
  const top = [...state.data.ideas].sort((a, b) => b.feasibility - a.feasibility).slice(0, 4);
  $('#priority-list').innerHTML = top.map((idea, index) => {
    const field = fieldById(idea.field);
    return `<div class="priority-item" onclick="selectIdea('${escapeHtml(idea.id)}', true)">
      <span class="rank">${index + 1}</span>
      <div>
        <strong>${escapeHtml(idea.title)}</strong>
        <p style="margin:0;color:var(--muted);font-size:.88rem">${escapeHtml(field?.name)} · ${escapeHtml(idea.stage || '待判断')}</p>
      </div>
      <span class="badge ${scoreClass(idea.feasibility)}">可行性 ${idea.feasibility}</span>
    </div>`;
  }).join('');

  const counts = {};
  state.data.ideas.forEach(idea => {
    const field = fieldById(idea.field)?.name || idea.field;
    counts[field] = (counts[field] || 0) + 1;
  });
  const max = Math.max(...Object.values(counts), 1);
  $('#field-summary').innerHTML = Object.entries(counts).map(([name, count]) => `
    <div class="mini-row">
      <span>${escapeHtml(name)}</span><strong>${count}</strong>
      <div class="mini-bar"><span style="width:${count / max * 100}%"></span></div>
    </div>
  `).join('');
}

function scoreBars(idea) {
  const rows = [
    ['可行性', idea.feasibility, 'var(--green)'],
    ['创新性', idea.novelty, 'var(--accent-2)'],
    ['证据', idea.evidence, 'var(--accent)'],
    ['难度', idea.difficulty * 20, 'var(--amber)', `${idea.difficulty}/5`]
  ];
  return `<div class="score-grid">${rows.map(([label, value, color, text]) => `
    <div class="score-row">
      <span>${label}</span>
      <div class="bar"><span style="width:${value}%;background:${color}"></span></div>
      <strong>${text || value}</strong>
    </div>
  `).join('')}</div>`;
}

function renderNetwork() {
  const ideas = filteredIdeas();
  const fields = state.data.fields.filter(field => ideas.some(idea => idea.field === field.id));
  const methods = state.data.methods.filter(method => ideas.some(idea => idea.method === method.id));
  const width = 1000;
  const height = 640;
  const leftX = 170;
  const rightX = 830;
  const fieldPositions = new Map();
  const methodPositions = new Map();
  fields.forEach((field, index) => {
    fieldPositions.set(field.id, { x: leftX, y: 90 + index * ((height - 180) / Math.max(fields.length - 1, 1)) });
  });
  methods.forEach((method, index) => {
    methodPositions.set(method.id, { x: rightX, y: 90 + index * ((height - 180) / Math.max(methods.length - 1, 1)) });
  });

  const links = ideas.map(idea => {
    const source = fieldPositions.get(idea.field);
    const target = methodPositions.get(idea.method);
    if (!source || !target) return '';
    const color = idea.feasibility >= 85 ? 'var(--green)' : idea.feasibility >= 78 ? 'var(--amber)' : 'var(--muted)';
    const selected = state.selectedIdea?.id === idea.id;
    const width = selected ? 8 : Math.max(2.5, idea.feasibility / 18);
    const opacity = selected ? 0.95 : 0.62;
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;
    return `<g>
      <path class="link" d="M ${source.x + 44} ${source.y} C ${source.x + 230} ${source.y}, ${target.x - 230} ${target.y}, ${target.x - 44} ${target.y}"
        fill="none" stroke="${color}" stroke-width="${width}" stroke-opacity="${opacity}" onclick="selectIdea('${escapeHtml(idea.id)}')">
        <title>${escapeHtml(idea.title)}｜可行性 ${idea.feasibility}</title>
      </path>
      <text class="link-label" x="${midX}" y="${midY - 6}" text-anchor="middle">${idea.feasibility}</text>
    </g>`;
  }).join('');

  const fieldNodes = fields.map(field => {
    const pos = fieldPositions.get(field.id);
    return `<g class="node" transform="translate(${pos.x},${pos.y})">
      <circle r="46" fill="var(--accent)"></circle>
      <text text-anchor="middle" y="-4">${escapeHtml(field.name.slice(0, 7))}</text>
      <text text-anchor="middle" y="14">${field.name.length > 7 ? '…' : ''}</text>
      <title>${escapeHtml(field.name)}｜${escapeHtml(field.summary)}</title>
    </g>`;
  }).join('');

  const methodNodes = methods.map(method => {
    const pos = methodPositions.get(method.id);
    return `<g class="node" transform="translate(${pos.x},${pos.y})">
      <circle r="42" fill="var(--accent-2)"></circle>
      <text text-anchor="middle" y="-4">${escapeHtml(method.name.slice(0, 7))}</text>
      <text text-anchor="middle" y="14">${method.name.length > 7 ? '…' : ''}</text>
      <title>${escapeHtml(method.name)}</title>
    </g>`;
  }).join('');

  $('#network-canvas').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="领域与方法交互网络图">
    <text x="${leftX}" y="38" text-anchor="middle" fill="var(--muted)" font-weight="800">研究方向</text>
    <text x="${rightX}" y="38" text-anchor="middle" fill="var(--muted)" font-weight="800">方法套路</text>
    ${links}
    ${fieldNodes}
    ${methodNodes}
  </svg>`;
}

function renderIdeaDetail() {
  const idea = state.selectedIdea || filteredIdeas()[0] || state.data.ideas[0];
  if (!idea) {
    $('#idea-detail').innerHTML = '<p>没有匹配的 idea。</p>';
    return;
  }
  const field = fieldById(idea.field);
  const method = methodById(idea.method);
  const refs = refsForIdea(idea);
  $('#idea-detail').innerHTML = `
    <div class="badge-row">
      <span class="badge">${escapeHtml(field?.name)}</span>
      <span class="badge">${escapeHtml(method?.name)}</span>
      <span class="badge ${scoreClass(idea.feasibility)}">${escapeHtml(idea.stage || '待判断')}</span>
    </div>
    <h2>${escapeHtml(idea.title)}</h2>
    <p>${escapeHtml(idea.question)}</p>
    ${scoreBars(idea)}
    <div class="detail-block">
      <h3>为什么值得看</h3>
      <p>${escapeHtml(idea.rationale || '待补充。')}</p>
    </div>
    <div class="detail-block">
      <h3>研究设计</h3>
      <ul>${(idea.design || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>
    <div class="detail-block">
      <h3>数据源与产出</h3>
      <div class="badge-row">${(idea.dataSources || []).map(item => `<span class="badge">${escapeHtml(item)}</span>`).join('')}</div>
      <ul>${(idea.outputs || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>
    <div class="detail-block">
      <h3>参考文献</h3>
      ${refs.map(renderRefCard).join('')}
    </div>
  `;
}

function renderIdeaCards() {
  const ideas = filteredIdeas();
  $('#idea-list').innerHTML = ideas.map(idea => {
    const field = fieldById(idea.field);
    const method = methodById(idea.method);
    const refs = refsForIdea(idea);
    const unknown = refs.filter(ref => refStatus(ref.id) === 'unknown').length;
    const active = state.selectedIdea?.id === idea.id ? 'active' : '';
    return `<article class="idea-card ${active}" onclick="selectIdea('${escapeHtml(idea.id)}', true)">
      <div class="badge-row">
        <span class="badge">${escapeHtml(field?.name)}</span>
        <span class="badge">${escapeHtml(method?.name)}</span>
      </div>
      <h3>${escapeHtml(idea.title)}</h3>
      <p>${escapeHtml(idea.question)}</p>
      ${scoreBars(idea)}
      <div class="card-footer">
        <span>${refs.length} 条文献 · ${unknown} 条未核实</span>
        <span>${escapeHtml(idea.stage || '')}</span>
      </div>
    </article>`;
  }).join('') || '<p>没有符合条件的 idea。</p>';
}

function renderBrainstorm() {
  const items = state.data.ideas.slice(0, 8);
  $('#brainstorm-board').innerHTML = items.map(idea => `
    <article class="brainstorm-card">
      <h3>${escapeHtml(idea.title)}</h3>
      <ul>${(idea.brainstorm || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </article>
  `).join('');
}

function renderRefCard(ref) {
  const status = refStatus(ref.id);
  const doi = doiUrl(ref);
  return `<article class="ref-card">
    <div class="ref-title">${escapeHtml(ref.title)}</div>
    <div class="ref-meta">${escapeHtml(ref.journal)} · ${escapeHtml(ref.year)}${ref.pmid ? ` · PMID: ${escapeHtml(ref.pmid)}` : ''}${ref.doi ? ` · DOI: ${escapeHtml(ref.doi)}` : ''}</div>
    <div class="ref-note">${escapeHtml(ref.note || '')}</div>
    <div class="ref-actions">
      <button class="verify-btn ${status}" onclick="cycleRef('${escapeHtml(ref.id)}')" title="? 未核实，✓ 已核实，× 已否决">${statusMark(status)}</button>
      <a href="${pubmedUrl(ref)}" target="_blank" rel="noopener">PubMed 核实</a>
      ${doi ? `<a href="${doi}" target="_blank" rel="noopener">DOI</a>` : ''}
      ${ref.url ? `<a href="${escapeHtml(ref.url)}" target="_blank" rel="noopener">来源</a>` : ''}
    </div>
  </article>`;
}

function renderReferences() {
  let refs = state.data.references;
  if (state.refFilter === 'unknown') refs = refs.filter(ref => refStatus(ref.id) === 'unknown');
  $('#reference-list').innerHTML = refs.map(renderRefCard).join('') || '<p>当前没有符合条件的参考文献。</p>';
}

function selectIdea(id, scrollDetail = false) {
  state.selectedIdea = state.data.ideas.find(idea => idea.id === id) || state.selectedIdea;
  if (state.selectedIdea) localStorage.setItem(SELECT_KEY, state.selectedIdea.id);
  renderNetwork();
  renderIdeaDetail();
  renderIdeaCards();
  if (scrollDetail && window.innerWidth < 1180) $('#network').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderAll() {
  renderMetrics();
  renderOverview();
  renderNetwork();
  renderIdeaDetail();
  renderIdeaCards();
  renderBrainstorm();
  renderReferences();
}

function bindEvents() {
  $('#nav-toggle').addEventListener('click', () => $('.main-nav').classList.toggle('open'));
  $$('.main-nav a').forEach(link => {
    link.addEventListener('click', () => $('.main-nav').classList.remove('open'));
  });
  $$('#filters .chip').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#filters .chip').forEach(item => item.classList.remove('active'));
      btn.classList.add('active');
      state.filter = btn.dataset.filter;
      renderAll();
    });
  });
  $('#search').addEventListener('input', event => {
    state.search = event.target.value;
    renderAll();
  });
  $('#show-unknown').addEventListener('click', () => {
    state.refFilter = 'unknown';
    renderReferences();
  });
  $('#show-all-refs').addEventListener('click', () => {
    state.refFilter = 'all';
    renderReferences();
  });

  const sections = ['overview', 'network', 'ideas', 'references', 'quality'];
  window.addEventListener('scroll', () => {
    const current = sections.findLast(id => {
      const el = document.getElementById(id);
      return el && el.getBoundingClientRect().top < 160;
    }) || 'overview';
    $$('.main-nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${current}`));
  }, { passive: true });
}

async function init() {
  const res = await fetch(DATA_URL);
  state.data = await res.json();
  ensureShell();
  const saved = localStorage.getItem(SELECT_KEY);
  state.selectedIdea = state.data.ideas.find(idea => idea.id === saved) || state.data.ideas[0];
  bindEvents();
  renderAll();
}

window.selectIdea = selectIdea;
window.cycleRef = cycleRef;

init().catch(error => {
  document.body.innerHTML = `<main style="padding:2rem"><h1>页面加载失败</h1><pre>${escapeHtml(error.message)}</pre></main>`;
});
