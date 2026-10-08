/**
 * nav-inject.js — Shared floating navigation for Data Vault Foundations
 * Injected into each chapter via build-site.py
 * Reads data-chapter="N" from <body> to determine current position
 */
(function () {
  'use strict';

  var chapters = [
    { file: '01-ontology.html', title: 'Ontology' },
    { file: '02-data-vault-deep-cuts.html', title: 'Data Vault Deep Cuts' },
    { file: '03-sql-select.html', title: 'SQL SELECT' },
    { file: '04-sql-joins.html', title: 'SQL JOINs' },
    { file: '05-compliance-gdpr.html', title: 'Compliance and GDPR' },
    { file: '06-dbt-tools.html', title: 'dbt Tools' },
    { file: '07-eu-regulations.html', title: 'EU Regulations' },
    { file: '08-compliance-mechanisms.html', title: 'Compliance Mechanisms' },
    { file: '09-ai-act-data-vault.html', title: 'AI Act and Data Vault' },
    { file: '10-sql-create-table.html', title: 'SQL CREATE TABLE' },
    { file: '11-sql-practice-dbt.html', title: 'SQL Practice and dbt' },
    { file: '12-integration-day.html', title: 'Integration Day' },
    { file: '13-compliance-self-test.html', title: 'Compliance Self-Test' },
    { file: '14-python-vault-runner.html', title: 'Python Vault Runner' }
  ];

  var current = parseInt(document.body.getAttribute('data-chapter'), 10);
  if (!current || current < 1 || current > chapters.length) return;

  var idx = current - 1;
  var prev = idx > 0 ? chapters[idx - 1] : null;
  var next = idx < chapters.length - 1 ? chapters[idx + 1] : null;

  function makeEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }

  function makeLink(href, text, className, title) {
    var a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    if (className) a.className = className;
    if (title) a.title = title;
    return a;
  }

  // Inject styles
  var style = document.createElement('style');
  style.textContent = [
    '.tutorial-footer { display: none !important; }',
    '.holo-nav { top: 48px !important; pointer-events: none; background: rgb(3, 8, 16) !important; }',
    '.holo-nav .nav-node, .holo-nav .lcars-seg { pointer-events: auto; }',
    '.dvf-nav-top { position: fixed; top: 0; left: 0; right: 0; z-index: 9999;',
    '  height: 48px; display: flex; align-items: center; justify-content: space-between;',
    '  padding: 0 20px; font-family: "Orbitron", monospace;',
    '  background: rgb(3, 8, 16);',
    '  border-bottom: 1px solid rgba(0, 180, 255, 0.15);',
    '  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.4); }',
    '.dvf-nav-top a { color: #00b4ff; text-decoration: none; font-size: 11px;',
    '  letter-spacing: 0.08em; transition: color 0.2s; }',
    '.dvf-nav-top a:hover { color: #4dd4ff; }',
    '.dvf-nav-top .dvf-nav-center { color: rgba(255,255,255,0.5);',
    '  font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; }',
    '.dvf-nav-top .dvf-nav-arrows { display: flex; gap: 12px; align-items: center; }',
    '.dvf-nav-top .dvf-nav-arrows a { font-size: 16px; padding: 4px 8px;',
    '  border: 1px solid rgba(0, 180, 255, 0.2); border-radius: 6px;',
    '  transition: all 0.2s; }',
    '.dvf-nav-top .dvf-nav-arrows a:hover { border-color: rgba(0, 180, 255, 0.5);',
    '  background: rgba(0, 180, 255, 0.08); }',
    '.dvf-nav-top .dvf-nav-arrows a.disabled { opacity: 0.25; pointer-events: none; }',
    '',
    '.dvf-nav-bottom { margin-top: 60px; padding: 32px 24px;',
    '  border-top: 1px solid rgba(0, 180, 255, 0.1);',
    '  display: flex; justify-content: space-between; align-items: center;',
    '  font-family: "Orbitron", monospace; gap: 20px; flex-wrap: wrap; }',
    '.dvf-nav-bottom a { color: #00b4ff; text-decoration: none;',
    '  font-size: 11px; letter-spacing: 0.06em; transition: color 0.2s; }',
    '.dvf-nav-bottom a:hover { color: #4dd4ff; }',
    '.dvf-nav-bottom .dvf-nb-prev,',
    '.dvf-nav-bottom .dvf-nb-next { max-width: 40%; }',
    '.dvf-nav-bottom .dvf-nb-label { font-size: 9px; color: rgba(255,255,255,0.35);',
    '  text-transform: uppercase; letter-spacing: 0.14em; margin-bottom: 4px; }',
    '.dvf-nav-bottom .dvf-nb-title { font-size: 12px; }',
    '.dvf-nav-bottom .dvf-nb-index { text-align: center; flex: 1; }',
    '',
    '.dvf-credit { text-align: center; padding: 24px 0 12px;',
    '  font-family: "Exo 2", sans-serif; font-size: 11px;',
    '  color: rgba(255,255,255,0.25); letter-spacing: 0.04em; }',
    '',
    '@media (max-width: 600px) {',
    '  .dvf-nav-top { padding: 0 12px; }',
    '  .dvf-nav-top a { font-size: 10px; }',
    '  .dvf-nav-bottom { flex-direction: column; text-align: center; }',
    '  .dvf-nav-bottom .dvf-nb-prev,',
    '  .dvf-nav-bottom .dvf-nb-next { max-width: 100%; }',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  // Top navigation bar
  var topNav = makeEl('div', 'dvf-nav-top');
  topNav.appendChild(makeLink('../index.html', 'Data Vault Foundations'));
  topNav.appendChild(makeEl('span', 'dvf-nav-center',
    'Chapter ' + current + ' of ' + chapters.length));

  var arrows = makeEl('div', 'dvf-nav-arrows');
  if (prev) {
    arrows.appendChild(makeLink(prev.file, '\u2190', null, prev.title));
  } else {
    var disabledPrev = makeEl('a', 'disabled', '\u2190');
    arrows.appendChild(disabledPrev);
  }
  arrows.appendChild(makeLink('../index.html', '\u2302', null, 'Back to Index'));
  if (next) {
    arrows.appendChild(makeLink(next.file, '\u2192', null, next.title));
  } else {
    var disabledNext = makeEl('a', 'disabled', '\u2192');
    arrows.appendChild(disabledNext);
  }
  topNav.appendChild(arrows);
  document.body.insertBefore(topNav, document.body.firstChild);

  // Convert sticky holo-nav to fixed (prevents text scrolling behind top bar)
  var holoNav = document.querySelector('.holo-nav');
  if (holoNav) {
    var hnPos = getComputedStyle(holoNav).position;
    if (hnPos === 'sticky') {
      var navHeight = holoNav.offsetHeight;
      holoNav.style.position = 'fixed';
      holoNav.style.left = '0';
      holoNav.style.right = '0';
      var spacer = document.createElement('div');
      spacer.style.height = navHeight + 'px';
      holoNav.parentNode.insertBefore(spacer, holoNav.nextSibling);
    }
  }

  // Bottom navigation
  var container = document.querySelector('.page-content')
    || document.querySelector('.container')
    || document.body;

  var bottomNav = makeEl('div', 'dvf-nav-bottom');

  var prevDiv = makeEl('div', 'dvf-nb-prev');
  if (prev) {
    prevDiv.style.cursor = 'pointer';
    prevDiv.addEventListener('click', function() { window.location.href = prev.file; });
    prevDiv.appendChild(makeEl('div', 'dvf-nb-label', '\u2190 Previous'));
    prevDiv.appendChild(
      makeLink(prev.file, 'Chapter ' + (current - 1) + ': ' + prev.title, 'dvf-nb-title')
    );
  }
  bottomNav.appendChild(prevDiv);

  var indexDiv = makeEl('div', 'dvf-nb-index');
  indexDiv.appendChild(makeLink('../index.html', 'Back to Index'));
  bottomNav.appendChild(indexDiv);

  var nextDiv = makeEl('div', 'dvf-nb-next');
  if (next) {
    nextDiv.style.cursor = 'pointer';
    nextDiv.addEventListener('click', function() { window.location.href = next.file; });
    nextDiv.style.textAlign = 'right';
    nextDiv.appendChild(makeEl('div', 'dvf-nb-label', 'Next \u2192'));
    nextDiv.appendChild(
      makeLink(next.file, 'Chapter ' + (current + 1) + ': ' + next.title, 'dvf-nb-title')
    );
  }
  bottomNav.appendChild(nextDiv);

  container.appendChild(bottomNav);

  // Footer credit
  var credit = makeEl('div', 'dvf-credit');
  credit.textContent = 'Created by \u00A9 Lorenzo Colombani 2026';
  // Keyboard navigation (left/right arrows)
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key === 'ArrowLeft' && prev) {
      window.location.href = prev.file;
    } else if (e.key === 'ArrowRight' && next) {
      window.location.href = next.file;
    }
  });

  container.appendChild(credit);
})();
