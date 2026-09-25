const FIX_BP_PER_PACK = 11.33, FIX_SAFETY = 1.1;
const $ = id => document.getElementById(id);
const fmt = n => n.toLocaleString();
function qsGet(n) { const p = new URLSearchParams(window.location.search); return p.has(n) ? p.get(n) : null; }

// Per-star BP values for each car (order = star1, star2, ...). 'key' denotes a key-type star that doesn't grant BPs.
const STAR_MAP = {
  'p1_c1': ['key', 40, 45, 60, 70, 85],    // Koenigsegg Gemera
  'p1_c2': ['key', 40, 45, 60, 70, 85],    // Rimac Nevera
  'p1_c3': ['key', 40, 45, 60, 70, 85],    // Bugatti Centodieci
  'p2_c1': [35, 40, 45, 50, 60, 70],       // Koenigsegg One:1
  'p2_c2': ['key', 40, 45, 60, 70, 85],    // Bugatti Chiron Super Sport
  'p2_c3': [60, 13, 16, 25, 38, 48]        // Koenigsegg Regera
};

function getCarMaxBP(key) {
  const arr = STAR_MAP[key] || [];
  return arr.reduce((sum, v) => v === 'key' ? sum : sum + (Number(v) || 0), 0);
}

function getPackMaxBP(prefix) {
  return ['c1', 'c2', 'c3'].reduce((sum, id) => sum + getCarMaxBP(`${prefix}_${id}`), 0);
}

function computeCarBP(prefix, id) {
  const key = `${prefix}_${id}`;
  const arr = STAR_MAP[key] || [];
  const stars = Math.max(0, +($(`${prefix}_${id}_stars`).value || 0));
  const bpOn = Math.max(0, +($(`${prefix}_${id}_bp`).value || 0));
  let total = 0;
  // Sum completed stars (skip 'key' entries)
  for (let i = 0; i < stars && i < arr.length; i++) {
    const v = arr[i];
    if (v === 'key') continue;
    total += Number(v) || 0;
  }
  // Apply partial BP towards the next numeric star (skip key entries)
  let next = stars;
  while (next < arr.length && arr[next] === 'key') next++;
  if (next < arr.length) {
    total += Math.min(bpOn, Number(arr[next]) || 0);
  } else {
    // Beyond defined stars — allow bpOn but clamp final total to car max
    total += bpOn;
  }
  const carMax = getCarMaxBP(key);
  return Math.min(carMax, Math.max(0, Math.round(total)));
}

function calcPack(prefix) {
  const c1 = computeCarBP(prefix, 'c1');
  const c2 = computeCarBP(prefix, 'c2');
  const c3 = computeCarBP(prefix, 'c3');
  const packCost = +($(prefix + '_packCost').value) || 900;
  const total = c1 + c2 + c3;
  const packMax = getPackMaxBP(prefix);
  const remaining = Math.max(0, packMax - total);
  const packs50 = Math.ceil(remaining / FIX_BP_PER_PACK);
  const packs90 = Math.ceil(packs50 * FIX_SAFETY);
  const tokens50 = packs50 * packCost, tokens90 = packs90 * packCost;
  const out = $(prefix + '_out'); out.style.display = 'block';
  out.innerHTML = `
    <div class="out-stats">
      <div><span>Total BPs:</span> <strong>${fmt(total)} / ${fmt(packMax)}</strong></div>
      <div><span>Remaining BPs:</span> <strong>${fmt(remaining)}</strong></div>
    </div>
    <div class="out-estimates">
      <div class="estimate-box typical">
        <div class="est-title">Typical (50%)</div>
        <div class="est-val">${fmt(packs50)} packs</div>
        <div class="est-tokens">${fmt(tokens50)} tokens</div>
      </div>
      <div class="estimate-box safe">
        <div class="est-title">Safe (90%)</div>
        <div class="est-val">${fmt(packs90)} packs</div>
        <div class="est-tokens">${fmt(tokens90)} tokens</div>
      </div>
    </div>`;
}

function syncBPInput(prefix, id) {
  const stars = $(`${prefix}_${id}_stars`);
  const bp = $(`${prefix}_${id}_bp`);
  if (!stars || !bp) return;

  if (+stars.value === 6) {
    bp.type = 'text';
    bp.value = 'MAX';
    bp.disabled = true;
    return;
  }

  const wasMax = bp.disabled && bp.value === 'MAX';
  bp.disabled = false;
  bp.type = 'number';
  if (wasMax) bp.value = 0;
}

function resetPack(p) {
  // reset stars and bp inputs to sensible defaults and hide output
  ['c1', 'c2', 'c3'].forEach(id => {
    const sel = $(p + `_${id}_stars`);
    const bp = $(p + `_${id}_bp`);
    // if this car is a key-car (STAR_MAP has 'key' at index 0), default to 1 star, else 0
    const map = STAR_MAP[`${p}_${id}`] || [];
    const defaultStars = (map.length && map[0] === 'key') ? 1 : 0;
    if (sel) sel.value = defaultStars;
    if (bp) bp.value = 0;
    syncBPInput(p, id);
  });
  if ($(p + '_packCost')) $(p + '_packCost').value = 900;
  if ($(p + '_out')) $(p + '_out').style.display = 'none';
}

function makeShareLink(p) {
  const s1 = encodeURIComponent($(p + '_c1_stars').value || ''), b1 = encodeURIComponent($(p + '_c1_bp').value || '');
  const s2 = encodeURIComponent($(p + '_c2_stars').value || ''), b2 = encodeURIComponent($(p + '_c2_bp').value || '');
  const s3 = encodeURIComponent($(p + '_c3_stars').value || ''), b3 = encodeURIComponent($(p + '_c3_bp').value || '');
  const pc = encodeURIComponent($(p + '_packCost').value || '');
  const url = `${location.origin}${location.pathname}?${p}_c1_stars=${s1}&${p}_c1_bp=${b1}&${p}_c2_stars=${s2}&${p}_c2_bp=${b2}&${p}_c3_stars=${s3}&${p}_c3_bp=${b3}&${p}_packCost=${pc}`;
  const btn = $(p + '_share');
  navigator.clipboard.writeText(url).then(() => {
    if (btn) {
      const origText = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = origText; }, 2000);
    } else {
      alert('Share link copied!');
    }
  }, () => prompt('Copy this link:', url));
}

document.addEventListener('DOMContentLoaded', () => {
  ['p1', 'p2'].forEach(p => {
    if ($(p + '_calc')) $(p + '_calc').onclick = () => calcPack(p);
    if ($(p + '_reset')) $(p + '_reset').onclick = () => resetPack(p);
    if ($(p + '_share')) $(p + '_share').onclick = () => makeShareLink(p);
    ['c1', 'c2', 'c3'].forEach(id => {
      const stars = $(p + `_${id}_stars`);
      if (stars) stars.onchange = () => syncBPInput(p, id);
    });

    // read new-style query params (backwards compatibility with legacy params is limited)
    const q = new URLSearchParams(window.location.search);
    const keys = ['c1', 'c2', 'c3'];
    let any = false;
    keys.forEach(id => {
      const ss = q.get(`${p}_${id}_stars`), bb = q.get(`${p}_${id}_bp`);
      if (ss !== null && $(p + `_${id}_stars`)) { $(p + `_${id}_stars`).value = Math.min(6, Math.max(0, +ss)); any = true; }
      if (bb !== null && $(p + `_${id}_bp`)) { $(p + `_${id}_bp`).value = Math.max(0, +bb); any = true; }
      // legacy support: ?p_c1=NUMBER -> treat as bp on current star
      const legacy = q.get(`${p}_${id}`);
      if (legacy !== null && $(p + `_${id}_bp`)) { $(p + `_${id}_bp`).value = Math.max(0, +legacy); any = true; }
      syncBPInput(p, id);
    });
    const qpc = q.get(`${p}_packCost`);
    if (qpc !== null && $(p + '_packCost')) $(p + '_packCost').value = +qpc || 900;
    if (any) calcPack(p);
  });
  // Reverse calculator logic
  if ($('rev_calc')) $('rev_calc').onclick = () => {
    const tokens = Math.max(0, +$('rev_tokens').value || 0);
    const packCost = Math.max(1, +$('rev_packCost').value || 900);
    const bpPerPack = Math.max(0.1, +$('rev_bpPerPack').value || 11.33);
    const packs = Math.floor(tokens / packCost);
    const safePacks = Math.floor(packs / FIX_SAFETY);
    // For each pack, show total BPs (rounded down) and safe BPs
    const packsArr = [
      { prefix: 'p1', pack: 'Pack #1' },
      { prefix: 'p2', pack: 'Pack #2' }
    ];
    let html = `
      <div class="out-stats">
        <div><span>Tokens:</span> <strong>${fmt(tokens)}</strong></div>
        <div><span>Packs:</span> <strong>${packs}</strong></div>
        <div><span>Safe Packs (90%):</span> <strong>${safePacks}</strong></div>
      </div>`;
    function roundTo4(n) { return Math.floor(n / 4) * 4; }
    packsArr.forEach(group => {
      const packMax = getPackMaxBP(group.prefix);
      let totalBP = roundTo4(packs * bpPerPack);
      let safeBP = roundTo4(safePacks * bpPerPack);
      if (totalBP > packMax) totalBP = packMax;
      if (safeBP > packMax) safeBP = packMax;
      html += `
        <div class="rev-result-group">
          <strong>${group.pack}</strong>: <strong>${fmt(totalBP)}</strong> BPs (typical), <strong>${fmt(safeBP)}</strong> BPs (safe, 90%, max ${fmt(packMax)})
        </div>`;
    });
    const out = $('rev_out');
    out.style.display = 'block';
    out.innerHTML = html;
  };
  if ($('rev_reset')) $('rev_reset').onclick = () => {
    $('rev_tokens').value = 0;
    $('rev_packCost').value = 900;
    $('rev_bpPerPack').value = 11.33;
    $('rev_out').style.display = 'none';
  };
});
