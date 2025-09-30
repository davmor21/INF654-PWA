// Domain logic: grade calc, next-due, ids

function uid(prefix='id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 10);
}

function computeNextDue(lastISO, freq) {
  if (!freq) return null;
  const d = lastISO ? new Date(lastISO) : new Date();
  const add = (unit, every) => {
    if (unit === 'days') d.setDate(d.getDate() + every);
    if (unit === 'weeks') d.setDate(d.getDate() + (7 * every));
    if (unit === 'months') d.setMonth(d.getMonth() + every);
  };
  add(freq.unit, freq.every || 1);
  return d.toISOString();
}

function computeWeightedGrade(gradeScheme, items) {
  if (!gradeScheme || !gradeScheme.categories?.length) return null;
  const cats = gradeScheme.categories;
  const byCat = {};
  items.forEach(it => {
    if (!byCat[it.category]) byCat[it.category] = {e:0,p:0};
    byCat[it.category].e += Number(it.pointsEarned || 0);
    byCat[it.category].p += Number(it.pointsPossible || 0);
  });
  let total = 0;
  let weightSum = 0;
  cats.forEach(c => {
    const w = Number(c.weight || 0) / 100;
    weightSum += w;
    const cat = byCat[c.name] || {e:0,p:0};
    const pct = cat.p > 0 ? (cat.e / cat.p) : 0;
    total += pct * w;
  });
  return { percent: total * 100, weightSum: weightSum * 100 };
}

window.Domain = { uid, computeNextDue, computeWeightedGrade };
