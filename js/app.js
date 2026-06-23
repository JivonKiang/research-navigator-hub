const DATA_URL = 'data/research-data.json';
const CLOUD_VERIFY_URL = 'data/verification.json';
const LOCAL_KEY = 'jivon_reference_verification_local_v3';

const state = {
  data: null,
  cloud: { references: {} },
  local: {},
  refFilter: 'all',
  search: ''
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); } catch { return {}; }
}
function saveLocal() {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(state.local));
}
function cloudStatus(id) {
  return state.cloud.references?.[id]?.status || 'unknown';
}
function refStatus(id) {
  return state.local[id]?.status || cloudStatus(id) || 'unknown';
}
function cycleRef(id) {
  const order = ['unknown', 'verified', 'rejected'];
  const next = order[(order.indexOf(refStatus(id)) + 1) % order.length];
  state.local[id] = { status: next, verifiedAt: new Date().toISOString().slice(0,10), source: 'browser-local' };
  saveLocal();
  renderAll();
}
function mark(status) { return status === 'verified' ? '✓' : status === 'rejected' ? '×' : '?'; }
function refById(id) { return state.data.references.find(r => r.id === id); }
function ideaRefs(idea) { return (idea.references || []).map(refById).filter(Boolean); }
function pubmed(ref) {
  if (ref.pmid) return `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(ref.pmid)}/`;
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent((ref.title || '') + ' ' + (ref.journal || ''))}`;
}
function doi(ref) { return ref.doi ? `https://doi.org/${encodeURIComponent(ref.doi)}` : ''; }

function ideas() {
  const term = state.search.trim().toLowerCase();
  return [...state.data.ideas].sort((a,b)=>(a.priority || 99)-(b.priority || 99)).filter(i => {
    if (!term) return true;
    return [i.title, i.question, i.stage, i.rationale, ...(i.dataSources || []), ...(i.brainstorm || [])].join(' ').toLowerCase().includes(term);
  });
}

function renderMetrics() {
  const refs = state.data.references;
  const verified = refs.filter(r => refStatus(r.id) === 'verified').length;
  const review = state.data.ideas.filter(i => i.lane === 'review').length;
  $('#hero-metrics').innerHTML = [
    ['主线候选', state.data.ideas.filter(i => i.lane === 'main').length],
    ['投稿复盘', review],
    ['套路文献', state.data.references.filter(r => r.tier === 'routine').length],
    ['云端已核实', verified]
  ].map(([k,v]) => `<div class="metric"><span>${k}</span><strong>${v}</strong></div>`).join('');
}

function renderRoute() {
  const sorted = ideas();
  const main = sorted.filter(i => i.lane === 'main' || i.lane === 'foundation').slice(0,3);
  const review = sorted.find(i => i.lane === 'review');
  $('#route-board').innerHTML = `
    <article class="route-card primary">
      <p class="eyebrow">推荐主线</p>
      <h3>先做能快速形成新稿件的方向</h3>
      ${main.map(cardMini).join('')}
    </article>
    <article class="route-card review">
      <p class="eyebrow">投稿复盘</p>
      <h3>${esc(review?.title || '暂无')}</h3>
      <p>${esc(review?.rationale || '')}</p>
      ${review ? detailBlock(review) : ''}
    </article>`;
}

function cardMini(i) {
  return `<div class="map-item" onclick="document.getElementById('idea-${esc(i.id)}')?.scrollIntoView({behavior:'smooth',block:'center'})">
    <strong>${esc(i.title)}</strong>
    <small>${esc(i.stage)} · 可行性 ${i.feasibility}</small>
  </div>`;
}

function renderMap() {
  const lanes = state.data.lanes || [];
  $('#route-map').innerHTML = lanes.map(lane => {
    const items = ideas().filter(i => i.lane === lane.id);
    if (!items.length) return '';
    return `<section class="map-column">
      <h3>${esc(lane.name)}</h3>
      <p class="compact-line">${esc(lane.summary)}</p>
      ${items.map(i => `<div class="map-item" onclick="document.getElementById('idea-${esc(i.id)}')?.scrollIntoView({behavior:'smooth',block:'center'})">
        <strong>${esc(i.title)}</strong><small>${esc(i.stage)} · 证据 ${i.evidence}</small>
      </div>`).join('')}
    </section>`;
  }).join('');
}

function detailBlock(i) {
  const refs = ideaRefs(i);
  return `<details>
    <summary>展开研究设计、数据源和文献</summary>
    <div class="details-body">
      <p>${esc(i.question)}</p>
      <h4>研究设计</h4>
      <ul>${(i.design || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <h4>数据源</h4>
      <div class="pill-row">${(i.dataSources || []).map(x => `<span class="pill">${esc(x)}</span>`).join('')}</div>
      <h4>文献</h4>
      ${refs.map(refCard).join('')}
    </div>
  </details>`;
}

function renderIdeas() {
  $('#idea-list').innerHTML = ideas().map(i => `
    <article class="idea-card ${i.lane === 'archive' ? 'archived' : ''}" id="idea-${esc(i.id)}">
      <div class="idea-head">
        <div>
          <div class="pill-row"><span class="pill ${i.lane === 'review' ? 'amber' : 'green'}">${esc(i.stage)}</span><span class="pill">${esc(i.lane || '')}</span></div>
          <h3>${esc(i.title)}</h3>
        </div>
        <div class="score">${i.feasibility}</div>
      </div>
      <p>${esc(i.question)}</p>
      <p class="status">证据 ${i.evidence} · 创新性 ${i.novelty} · 难度 ${i.difficulty}/5</p>
      ${detailBlock(i)}
    </article>`).join('');
}

function renderRoutineGroups() {
  const groups = {};
  state.data.references.filter(r => (r.tags || []).length || r.tier === 'routine').forEach(r => {
    const key = (r.tags && r.tags[0]) || '方法文献';
    (groups[key] ||= []).push(r);
  });
  $('#routine-groups').innerHTML = Object.entries(groups).map(([name, refs]) => `
    <section class="routine-group">
      <h3>${esc(name)}</h3>
      <p>${refs.length} 条重点文献。默认收起，按需展开核实。</p>
      <details><summary>展开 ${esc(name)} 文献</summary><div class="details-body">${refs.map(refCard).join('')}</div></details>
    </section>`).join('');
}

function refCard(r) {
  const st = refStatus(r.id);
  const d = doi(r);
  return `<article class="ref-card">
    <div class="ref-top">
      <div>
        <div class="ref-title">${esc(r.title)}</div>
        <div class="ref-meta">${esc(r.journal)} · ${esc(r.year)}${r.pmid ? ` · PMID: ${esc(r.pmid)}` : ''}${r.doi ? ` · DOI: ${esc(r.doi)}` : ''}</div>
      </div>
      <button class="verify-btn ${st}" onclick="cycleRef('${esc(r.id)}')" title="点击切换核实状态">${mark(st)}</button>
    </div>
    <div class="ref-note">${esc(r.note || '')}</div>
    <div class="ref-actions">
      <a href="${pubmed(r)}" target="_blank" rel="noopener">PubMed 核实</a>
      ${d ? `<a href="${d}" target="_blank" rel="noopener">DOI</a>` : ''}
      ${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">来源</a>` : ''}
      <span class="status">云端：${mark(cloudStatus(r.id))} · 当前：${mark(st)}</span>
    </div>
  </article>`;
}

function renderReferences() {
  let refs = state.data.references;
  if (state.refFilter === 'unverified') refs = refs.filter(r => refStatus(r.id) === 'unknown');
  $('#verification-note').innerHTML = `云端记录：${Object.keys(state.cloud.references || {}).length} 条；本地临时记录：${Object.keys(state.local).length} 条。导出的本地记录可以合并进 <code>data/verification.json</code>。`;
  $('#reference-list').innerHTML = refs.map(refCard).join('') || '<p class="empty">没有符合条件的文献。</p>';
}

function renderAll() {
  renderMetrics();
  renderRoute();
  renderMap();
  renderIdeas();
  renderRoutineGroups();
  renderReferences();
}

function bind() {
  $('#mobile-menu').addEventListener('click', () => $('.rail').classList.toggle('open'));
  $$('#rail-nav a').forEach(a => a.addEventListener('click', () => $('.rail').classList.remove('open')));
  $('#search').addEventListener('input', e => { state.search = e.target.value; renderIdeas(); });
  $('#filter-unverified').addEventListener('click', () => { state.refFilter = 'unverified'; renderReferences(); });
  $('#filter-all').addEventListener('click', () => { state.refFilter = 'all'; renderReferences(); });
  $('#export-verification').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({updated:new Date().toISOString(), references: state.local}, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'verification-local.json'; a.click(); URL.revokeObjectURL(a.href);
  });
  const sections = ['overview','route','map','ideas','routines','references','quality'];
  window.addEventListener('scroll', () => {
    const current = sections.findLast(id => document.getElementById(id)?.getBoundingClientRect().top < 160) || 'overview';
    $$('#rail-nav a').forEach(a => a.classList.toggle('active', a.dataset.section === current));
  }, {passive:true});
}

async function init() {
  const [dataRes, cloudRes] = await Promise.all([
    fetch(DATA_URL),
    fetch(CLOUD_VERIFY_URL).catch(() => null)
  ]);
  state.data = await dataRes.json();
  if (cloudRes && cloudRes.ok) state.cloud = await cloudRes.json();
  state.local = loadLocal();
  bind();
  renderAll();
}

window.cycleRef = cycleRef;
init().catch(err => {
  document.body.innerHTML = `<main style="padding:2rem"><h1>加载失败</h1><pre>${esc(err.message)}</pre></main>`;
});
