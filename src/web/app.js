// ================================================================
// Valid.ai — Frontend Logic
// ================================================================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Character counter
const textarea = $('#idea-input');
const charCount = $('#char-count');

textarea.addEventListener('input', () => {
  charCount.textContent = `${textarea.value.length} / 5000`;
});

// Allow Ctrl+Enter to submit
textarea.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    submitIdea();
  }
});

// Load history on start
loadHistory();

// ----------------------------------------------------------------
// Submit
// ----------------------------------------------------------------

async function submitIdea() {
  const idea = textarea.value.trim();
  if (idea.length < 10) {
    textarea.focus();
    return;
  }

  // Show loading
  showSection('loading');
  const btn = $('#validate-btn');
  btn.disabled = true;
  btn.querySelector('.btn-text').style.display = 'none';
  btn.querySelector('.btn-loading').style.display = 'inline';

  try {
    const res = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Validation failed');
    }

    const { id } = await res.json();

    // Poll for result
    await pollResult(id);
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').style.display = 'inline';
    btn.querySelector('.btn-loading').style.display = 'none';
  }
}

async function pollResult(id, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(2000);

    try {
      const res = await fetch(`/api/validations/${id}`);
      if (!res.ok) continue;

      const data = await res.json();

      if (data.status === 'complete') {
        renderResults(data);
        loadHistory();
        return;
      }

      if (data.status === 'failed') {
        throw new Error(data.error || 'Validation failed');
      }
    } catch (err) {
      if (i === maxAttempts - 1) throw err;
    }
  }

  throw new Error('Validation timed out — please try again');
}

// ----------------------------------------------------------------
// Render Results
// ----------------------------------------------------------------

function renderResults(data) {
  const r = data.result;
  showSection('results');

  // Score banner
  const score = r.score.overall;
  $('#score-value').textContent = score;
  $('#score-value').className = `score-value ${scoreColorClass(score)}`;
  $('#verdict').textContent = r.score.verdict;
  $('#verdict').className = verdictClass(r.score.verdict);
  $('#summary').textContent = r.summary;
  $('#one-liner').textContent = `"${r.score.one_liner}"`;

  // Score breakdown
  const breakdown = r.score.breakdown;
  const labels = {
    market_size: 'Market Size',
    problem_severity: 'Problem Severity',
    competition: 'Competition',
    buildability: 'Buildability',
    revenue_potential: 'Revenue Potential',
  };

  $('#score-breakdown').innerHTML = Object.entries(breakdown)
    .map(([key, val]) => `
      <div class="breakdown-item">
        <span class="breakdown-label">${labels[key] || key}</span>
        <div class="breakdown-bar">
          <div class="breakdown-fill" style="width:${(val / 20) * 100}%;background:${barColor(val, 20)}"></div>
        </div>
        <span class="breakdown-score" style="color:${barColor(val, 20)}">${val}/20</span>
      </div>
    `).join('');

  // Market analysis
  const ma = r.market_analysis;
  $('#market-analysis').innerHTML = `
    <div class="detail-item">
      <div class="detail-label">Total Addressable Market (TAM)</div>
      <div class="detail-value">${ma.tam}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Serviceable Addressable Market (SAM)</div>
      <div class="detail-value">${ma.sam}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Serviceable Obtainable Market (SOM)</div>
      <div class="detail-value">${ma.som}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Market Trend</div>
      <div class="detail-value">${trendEmoji(ma.market_trend)} ${ma.market_trend} — ${ma.trend_reasoning}</div>
    </div>
  `;

  // Competition
  const comp = r.competition;
  let compHtml = '';

  if (comp.direct_competitors && comp.direct_competitors.length > 0) {
    compHtml += '<h4 style="color:var(--text-dim);margin-bottom:0.75rem;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.05em">Direct Competitors</h4>';
    compHtml += comp.direct_competitors.map(c => `
      <div class="competitor-card">
        <h4>${esc(c.name)}</h4>
        <p>${esc(c.description)}</p>
        <p><strong>Strengths:</strong> ${esc(c.strengths)}</p>
        <p><strong>Weaknesses:</strong> ${esc(c.weaknesses)}</p>
        ${c.pricing ? `<p><strong>Pricing:</strong> ${esc(c.pricing)}</p>` : ''}
      </div>
    `).join('');
  }

  if (comp.indirect_competitors && comp.indirect_competitors.length > 0) {
    compHtml += `<div class="detail-item"><div class="detail-label">Indirect Competitors</div><div class="detail-value">${comp.indirect_competitors.map(esc).join(', ')}</div></div>`;
  }

  compHtml += `<div class="detail-item"><div class="detail-label">Differentiation Opportunity</div><div class="detail-value">${esc(comp.differentiation_opportunity)}</div></div>`;

  const moat = (comp.moat_potential || '').split(' — ');
  const moatLevel = (moat[0] || 'none').toLowerCase();
  compHtml += `<span class="moat-badge moat-${moatLevel}">Moat: ${esc(comp.moat_potential)}</span>`;

  $('#competition').innerHTML = compHtml;

  // Target audience
  const ta = r.target_audience;
  let painDots = '';
  for (let i = 1; i <= 10; i++) {
    painDots += `<div class="pain-dot ${i <= ta.pain_severity ? 'active' : ''}"></div>`;
  }

  let channelTags = '';
  if (ta.acquisition_channels && ta.acquisition_channels.length) {
    channelTags = `<div class="channel-tags">${ta.acquisition_channels.map(c => `<span class="channel-tag">${esc(c)}</span>`).join('')}</div>`;
  }

  $('#target-audience').innerHTML = `
    <div class="detail-item">
      <div class="detail-label">Primary Audience</div>
      <div class="detail-value">${esc(ta.primary)}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Pain Severity (${ta.pain_severity}/10)</div>
      <div class="pain-bar">${painDots}</div>
      <div class="detail-value" style="margin-top:0.5rem">${esc(ta.pain_description)}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Willingness to Pay</div>
      <div class="detail-value">${esc(ta.willingness_to_pay)}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Acquisition Channels</div>
      ${channelTags}
    </div>
  `;

  // Revenue model
  const rm = r.revenue_model;
  $('#revenue-model').innerHTML = `
    <div class="detail-item">
      <div class="detail-label">Recommended Model</div>
      <div class="detail-value">${esc(rm.recommended_model)}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Pricing Suggestion</div>
      <div class="detail-value">${esc(rm.pricing_suggestion)}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">LTV Estimate</div>
      <div class="detail-value">${esc(rm.ltv_estimate)}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">CAC Considerations</div>
      <div class="detail-value">${esc(rm.cac_considerations)}</div>
    </div>
  `;

  // Risks
  $('#risks').innerHTML = (r.risks || []).map(risk => `
    <div class="risk-card risk-${risk.severity}">
      <div>
        <div class="risk-type">${esc(risk.type)} · ${esc(risk.severity)} severity</div>
        <div class="risk-desc">${esc(risk.description)}</div>
        <div class="risk-mitigation">💡 ${esc(risk.mitigation)}</div>
      </div>
    </div>
  `).join('');

  // Next steps
  $('#next-steps').innerHTML = (r.next_steps || []).map((step, i) => `
    <div class="step-card">
      <div class="step-number">${i + 1}</div>
      <div>
        <div class="step-action">${esc(step.action)}</div>
        <div class="step-meta">
          <span class="step-effort">${esc(step.effort)}</span>
          ${step.purpose ? ` — ${esc(step.purpose)}` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// ----------------------------------------------------------------
// History
// ----------------------------------------------------------------

async function loadHistory() {
  try {
    const res = await fetch('/api/validations?limit=10');
    if (!res.ok) return;

    const data = await res.json();
    const list = data.validations || [];

    if (list.length === 0) {
      $('#history-list').innerHTML = '<div class="history-empty">No validations yet. Enter your first idea above!</div>';
      return;
    }

    $('#history-list').innerHTML = list.map(v => `
      <div class="history-item" onclick="loadValidation('${v.id}')">
        <span class="history-idea">${esc(v.idea)}</span>
        ${v.status === 'complete'
          ? `<span class="history-score ${scoreColorClass(v.score)}">${v.score}</span>`
          : `<span class="history-score" style="color:var(--text-dim)">${v.status}</span>`
        }
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load history:', err);
  }
}

async function loadValidation(id) {
  try {
    showSection('loading');
    const res = await fetch(`/api/validations/${id}`);
    if (!res.ok) throw new Error('Failed to load validation');

    const data = await res.json();
    if (data.status === 'complete') {
      renderResults(data);
    } else {
      showError(`Validation status: ${data.status}`);
    }
  } catch (err) {
    showError(err.message);
  }
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function showSection(which) {
  $('#input-section').style.display = which === 'input' ? 'block' : (which === 'results' ? 'block' : 'block');
  $('#loading-section').style.display = which === 'loading' ? 'block' : 'none';
  $('#error-section').style.display = which === 'error' ? 'block' : 'none';
  $('#results-section').style.display = which === 'results' ? 'block' : 'none';

  if (which === 'results') {
    $('#results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function showError(message) {
  showSection('error');
  $('#error-message').textContent = message;
}

function resetForm() {
  showSection('input');
  textarea.value = '';
  charCount.textContent = '0 / 5000';
  textarea.focus();
  loadHistory();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

function scoreColorClass(score) {
  if (score >= 80) return 'score-excellent';
  if (score >= 60) return 'score-good';
  if (score >= 40) return 'score-okay';
  if (score >= 20) return 'score-weak';
  return 'score-poor';
}

function barColor(val, max) {
  const pct = val / max;
  if (pct >= 0.8) return '#10b981';
  if (pct >= 0.6) return '#34d399';
  if (pct >= 0.4) return '#f59e0b';
  if (pct >= 0.2) return '#fb923c';
  return '#ef4444';
}

function verdictClass(verdict) {
  const v = (verdict || '').toLowerCase().replace(/\s+/g, '-');
  return `verdict-${v}`;
}

function trendEmoji(trend) {
  if (trend === 'growing') return '📈';
  if (trend === 'shrinking') return '📉';
  return '📊';
}
