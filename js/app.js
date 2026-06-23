const DATA_URL = 'data/research-data.json';
const VERIFY_KEY = 'jivon_research_reference_status_v1';
const IDEA_KEY = 'jivon_research_selected_idea_v1';

let state = {
  data: null,
  filter: 'all',
  selectedIdea: null,
  search: ''
};

function loadVerifyState() {
  try {
    return JSON.parse(localStorage.getItem(VERIFY_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveVerifyState(next) {
  localStorage.setItem(VERIFY_KEY, JSON.stringify(next));
}

function refStatus(refId) {
  return loadVerifyState()[refId] || 'unknown';
}

function cycleRefStatus(refId) {
  const statuses = ['unknown', 'verified', 'rejected'];
  const current = refStatus(refId);
  const next = statuses[(statuses.indexOf(current) + 1) % statuses.length];
  const all = loadVerifyState();
  all[refId] = next;
  saveVerifyState(all);
  renderAll();
}

function statusMark(status) {
  if (status === 'verified') return '✓';
  if (status === 'rejected') return '×';
  return '?';
}

function safeText(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[char]);
}

function pubmedUrl(ref) {
  if (ref.pmid) return `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(ref.pmid)}/`;
  const query = `${ref.title || ''} ${ref.journal || ''}`.trim();
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`;
}

function doiUrl(ref) {
  return ref.doi ? `https://doi.org/${encodeURIComponent(ref.doi)}` : '';
}

function referenceById(id) {
  return state.data.references.find(ref => ref.id === id);
}

function fieldById(id) {
  return state.data.fields.find(field => field.id === id);
}

function methodById(id) {
  return state.data.methods.find(method => method.id === id);
}

function filteredIdeas() {
  const term = state.search.trim().toLowerCase();
  return state.data.ideas.filter(idea => {
    const refs = idea.references.map(referenceById).filter(Boolean);
    const hasUnverified = refs.some(ref => refStatus(ref.id) === 'unknown');
    if (state.filter === 'tb' && idea.field !== 'tb') return false;
    if (state.filter === 'high' && idea.feasibility < 85) return false;
    if (state.filter === 'unverified' && !hasUnverified) return false;
    if (term) {
      const field = fieldById(idea.field);
      const method = methodById(idea.method);
      const haystack = [idea.title, idea.question, field?.name, method?.name]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });
}

function renderMetrics() {
  const refs = state.data.references;
  const verified = refs.filter(ref => refStatus(ref.id) === 'verified').length;
  document.getElementById('metric-ideas').textContent = state.data.ideas.length;
  document.getElementById('metric-refs').textContent = refs.length;
  document.getElementById('metric-verified').textContent = verified;
}

function renderScoreBars(idea) {
  const rows = [
    ['可行性', idea.feasibility],
    ['创新性', idea.novelty],
    ['证据', idea.evidence],
    ['难度', idea.difficulty * 20]
  ];
  return `<div class="score-bars">${rows.map(([label, value]) => `
    <div class="score-row">
      <span>${label}</span>
      <div class="bar"><span style="width:${value}%;background:${label === '难度' ? 'var(--amber)' : 'var(--green)'}"></span></div>
      <strong>${label === '难度' ? idea.difficulty + '/5' : value}</strong>
    </div>
  `).join('')}</div>`;
}

function renderReference(ref) {
  const status = refStatus(ref.id);
  const doi = doiUrl(ref);
  return `
    <article class="ref-card" id="ref-${safeText(ref.id)}">
      <div class="ref-title">${safeText(ref.title)}</div>
      <div class="ref-meta">${safeText(ref.journal)} · ${safeText(ref.year)}${ref.pmid ? ` · PMID: ${safeText(ref.pmid)}` : ''}${ref.doi ? ` · DOI: ${safeText(ref.doi)}` : ''}</div>
      <p class="ref-meta">${safeText(ref.note || '')}</p>
      <div class="ref-actions">
        <button class="verify-btn ${status}" onclick="cycleRefStatus('${safeText(ref.id)}')" title="点击切换：? 未核实 → ✓ 已核实 → × 已否决">${statusMark(status)}</button>
        <a href="${pubmedUrl(ref)}" target="_blank" rel="noopener">PubMed 核实</a>
        ${doi ? `<a href="${doi}" target="_blank" rel="noopener">DOI</a>` : ''}
        ${ref.url ? `<a href="${safeText(ref.url)}" target="_blank" rel="noopener">来源</a>` : ''}
      </div>
    </article>
  `;
}

function renderIdeaCard(idea) {
  const field = fieldById(idea.field);
  const method = methodById(idea.method);
  const refs = idea.references.map(referenceById).filter(Boolean);
  const unknownCount = refs.filter(ref => refStatus(ref.id) === 'unknown').length;
  return `
    <article class="idea-card" onclick="selectIdea('${safeText(idea.id)}')">
      <div class="badges">
        <span class="badge">${safeText(field?.name)}</span>
        <span class="badge">${safeText(method?.name)}</span>
        <span class="badge">${unknownCount} 条待核实</span>
      </div>
      <h3>${safeText(idea.title)}</h3>
      <p>${safeText(idea.question)}</p>
      ${renderScoreBars(idea)}
    </article>
  `;
}

function renderIdeas() {
  const list = document.getElementById('idea-list');
  const ideas = filteredIdeas();
  list.innerHTML = ideas.map(renderIdeaCard).join('') || '<p class="empty">没有符合筛选条件的 idea。</p>';
}

function renderDetail() {
  const target = document.getElementById('idea-detail');
  const idea = state.selectedIdea || filteredIdeas()[0] || state.data.ideas[0];
  if (!idea) return;
  const field = fieldById(idea.field);
  const method = methodById(idea.method);
  const refs = idea.references.map(referenceById).filter(Boolean);
  target.innerHTML = `
    <div class="badges">
      <span class="badge">${safeText(field?.name)}</span>
      <span class="badge">${safeText(method?.name)}</span>
      <span class="badge">可行性 ${idea.feasibility}</span>
    </div>
    <h3>${safeText(idea.title)}</h3>
    <p>${safeText(idea.question)}</p>
    ${renderScoreBars(idea)}
    <h3 style="margin-top:18px;">参考文献核实</h3>
    <p class="empty">点击 PubMed 核实打开检索页；确认无误后点击问号切换为对号。核实状态只保存在当前浏览器。</p>
    ${refs.map(renderReference).join('')}
  `;
}

function renderReferences() {
  document.getElementById('reference-list').innerHTML = state.data.references.map(renderReference).join('');
}

function selectIdea(id) {
  state.selectedIdea = state.data.ideas.find(idea => idea.id === id) || null;
  localStorage.setItem(IDEA_KEY, id);
  renderDetail();
  renderNetwork();
}

function renderNetwork() {
  const wrap = document.getElementById('network');
  wrap.innerHTML = '';
  const width = Math.max(wrap.clientWidth, 720);
  const height = Math.max(wrap.clientHeight, 560);
  const ideas = filteredIdeas();
  const activeIds = new Set(ideas.map(idea => idea.id));

  const nodes = [
    ...state.data.fields.map(item => ({ id: item.id, label: item.name, type: 'field', group: item.group })),
    ...state.data.methods.map(item => ({ id: item.id, label: item.name, type: 'method', group: item.group }))
  ];

  const links = ideas.map(idea => ({
    source: idea.field,
    target: idea.method,
    ideaId: idea.id,
    title: idea.title,
    feasibility: idea.feasibility,
    selected: state.selectedIdea?.id === idea.id
  }));

  const svg = d3.select(wrap)
    .append('svg')
    .attr('viewBox', [0, 0, width, height])
    .attr('width', '100%')
    .attr('height', height);

  const color = d => d.type === 'field' ? '#2563eb' : '#7c3aed';
  const linkColor = d => d.feasibility >= 85 ? '#059669' : d.feasibility >= 78 ? '#d97706' : '#64748b';

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(160).strength(0.75))
    .force('charge', d3.forceManyBody().strength(-520))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(58));

  const link = svg.append('g')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('class', 'link-line')
    .attr('stroke', linkColor)
    .attr('stroke-width', d => d.selected ? 7 : Math.max(2, d.feasibility / 18))
    .attr('stroke-opacity', d => d.selected ? 0.95 : 0.62)
    .on('click', (event, d) => selectIdea(d.ideaId));

  link.append('title').text(d => `${d.title}｜可行性 ${d.feasibility}`);

  const node = svg.append('g')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .call(d3.drag()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }));

  node.append('circle')
    .attr('r', d => d.type === 'field' ? 34 : 28)
    .attr('fill', color)
    .attr('stroke', '#fff')
    .attr('stroke-width', 3);

  node.append('text')
    .text(d => d.label.length > 10 ? d.label.slice(0, 10) + '…' : d.label)
    .attr('text-anchor', 'middle')
    .attr('dy', 4)
    .attr('fill', '#fff')
    .attr('font-size', 11)
    .attr('font-weight', 700);

  node.append('title').text(d => `${d.label}｜${d.group}`);

  const label = svg.append('g')
    .selectAll('text')
    .data(links)
    .join('text')
    .text(d => d.feasibility)
    .attr('fill', '#0f172a')
    .attr('font-size', 11)
    .attr('font-weight', 800)
    .attr('pointer-events', 'none');

  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
    node.attr('transform', d => `translate(${d.x},${d.y})`);
    label
      .attr('x', d => (d.source.x + d.target.x) / 2)
      .attr('y', d => (d.source.y + d.target.y) / 2);
  });
}

function renderAll() {
  renderMetrics();
  renderIdeas();
  renderDetail();
  renderReferences();
  renderNetwork();
}

async function init() {
  const res = await fetch(DATA_URL);
  state.data = await res.json();
  const savedIdea = localStorage.getItem(IDEA_KEY);
  state.selectedIdea = state.data.ideas.find(idea => idea.id === savedIdea) || state.data.ideas[0];

  document.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(item => item.classList.remove('active'));
      btn.classList.add('active');
      state.filter = btn.dataset.filter;
      renderAll();
    });
  });

  document.getElementById('search').addEventListener('input', event => {
    state.search = event.target.value;
    renderAll();
  });

  renderAll();
}

window.selectIdea = selectIdea;
window.cycleRefStatus = cycleRefStatus;

init().catch(error => {
  document.body.innerHTML = `<main class="panel" style="margin:40px;"><h1>加载失败</h1><pre>${safeText(error.message)}</pre></main>`;
});
