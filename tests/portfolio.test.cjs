const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { JSDOM } = require('jsdom');
const html = readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');

function page(t, hash = '') {
  const dom = new JSDOM(html, {
    url: `https://portfolio.test/${hash}`,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      window.scrollTo = () => {};
      window.HTMLElement.prototype.scrollIntoView = () => {};
    },
  });
  t.after(() => dom.window.close());
  return dom.window;
}
const selected = w => w.document.querySelector('[role="tab"][aria-selected="true"]').dataset.tab;
const clickTab = (w, tab) => w.document.querySelector(`[data-tab="${tab}"]`).click();
function traverse(w, direction) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('History traversal did not change the hash')), 1000);
    w.addEventListener('hashchange', () => { clearTimeout(timeout); resolve(); }, { once: true });
    w.history[direction]();
  });
}

test('leaving contact updates the hash to the selected tab', t => {
  const w = page(t, '#contact');
  clickTab(w, 'projects');
  assert.equal(w.location.hash, '#projects');
  assert.equal(selected(w), 'projects');
  assert.equal(w.document.querySelector('#panel-overview').hidden, true);
});

test('tab navigation retains back and forward history without duplicate repeated clicks', async t => {
  const w = page(t, '#overview');
  clickTab(w, 'projects');
  const length = w.history.length;
  clickTab(w, 'projects');
  assert.equal(w.history.length, length);
  clickTab(w, 'studies');
  await traverse(w, 'back');
  assert.equal(selected(w), 'projects');
  await traverse(w, 'back');
  assert.equal(selected(w), 'overview');
  await traverse(w, 'forward');
  assert.equal(selected(w), 'projects');
});

test('contact hash navigation reveals the overview panel', async t => {
  const w = page(t, '#projects');
  const changed = new Promise(resolve => w.addEventListener('hashchange', resolve, { once: true }));
  w.location.hash = '#contact';
  await changed;
  assert.equal(selected(w), 'overview');
  assert.equal(w.document.querySelector('#contact').closest('[role="tabpanel"]').hidden, false);
});

test('back to a hashless initial URL restores overview', async t => {
  const w = page(t);
  clickTab(w, 'projects');
  await traverse(w, 'back');
  assert.equal(selected(w), 'overview');
  assert.equal(w.location.hash, '');
});

for (const route of ['overview', 'projects', 'studies']) {
  test(`direct #${route} loads exactly one matching panel`, t => {
    const w = page(t, '#' + route);
    assert.equal(selected(w), route);
    assert.equal(w.document.querySelectorAll('[role="tabpanel"]:not([hidden])').length, 1);
  });
}

test('profile positioning is consistent across metadata and both hero languages', t => {
  const w = page(t);
  assert.match(w.document.title, /Full-Stack & Applied AI Engineering/);
  const hero = w.document.querySelector('.hero-tagline');
  assert.match(hero.textContent, /full-stack applications/i);
  assert.match(hero.dataset.en, /applied AI/i);
  assert.match(hero.dataset.ko, /풀스택/);
  assert.match(hero.dataset.en, /security/);
});

test('featured project ordering and evidence links match the current profile', t => {
  const w = page(t);
  const cards = [...w.document.querySelector('#panel-projects .side-list').children];
  assert.match(cards[0].textContent, /Audit Evidence \/ Operations/);
  assert.match(cards[1].textContent, /FinScope/);
  assert.match(cards[2].textContent, /Crypto Transaction Tracer/);
  assert.match(cards[3].textContent, /High-Throughput Event Platform/);
  const fin = cards[1];
  for (const href of [
    'https://seoyoung-finscope.onrender.com/',
    'https://github.com/seoyeonglee/fintech-usage-recommender',
    'https://github.com/seoyeonglee/fintech-usage-recommender/blob/main/docs/model-card.md',
  ]) assert.ok([...fin.querySelectorAll('a')].some(a => a.href === href), href);
  assert.match(fin.textContent, /synthetic/i);
  assert.match(fin.textContent, /not real-market performance/);
  assert.match(cards[0].textContent, /RAG Lab/);
  assert.match(cards[0].textContent, /SQLite/);
  assert.match(cards[0].textContent, /leased SQL jobs/);
  assert.doesNotMatch(cards[0].textContent, /Control\/\/Room|LangGraph|Electron/);
});

test('command palette exposes the FinScope demo and current Audit workspace', t => {
  const w = page(t);
  w.document.querySelector('#cmdkTrigger').click();
  const input = w.document.querySelector('#cmdkInput');
  input.value = 'finscope';
  input.dispatchEvent(new w.Event('input'));
  assert.match(w.document.querySelector('#cmdkList').textContent, /FinScope/);
  input.value = 'evidence operations';
  input.dispatchEvent(new w.Event('input'));
  assert.match(w.document.querySelector('#cmdkList').textContent, /Evidence Operations/);
});

test('existing skills anchor reveals overview and scrolls to the section', async t => {
  const w = page(t, '#projects');
  const scrolled = [];
  w.HTMLElement.prototype.scrollIntoView = function () { scrolled.push(this.id); };
  const changed = new Promise(resolve => w.addEventListener('hashchange', resolve, { once: true }));
  w.location.hash = '#stack';
  await changed;
  assert.equal(selected(w), 'overview');
  assert.ok(scrolled.includes('stack'));
});
