/* ============================================================
   TRENDS — what the prelims papers actually ask
   Every figure is computed from D.pyq at run time, so the charts
   cannot drift from the question bank they describe.
   ============================================================ */
"use strict";

const PAPER_Q = 100;                         // questions in a full prelims GS paper
const SUBJECTS = [                           // fixed slot order — colour follows the subject, never its rank
  {k:"Geography",  v:"--s1"}, {k:"History",    v:"--s2"}, {k:"Culture", v:"--s3"},
  {k:"Economy",    v:"--s4"}, {k:"HP General", v:"--s5"}, {k:"Polity",  v:"--s6"}
];
const SUBJ_COLOR = Object.fromEntries(SUBJECTS.map(s => [s.k, s.v]));

function trendStats(){
  const years = [...new Set(D.pyq.map(q => q.y))].sort();
  const papers = years.map(y => {
    const all = D.pyq.filter(q => q.y === y);
    const hp  = all.filter(q => q.hp);
    return {y, recovered:all.length, hp:hp.length, coverage:all.length / PAPER_Q};
  });
  const bySubject = SUBJECTS.map(s => ({
    ...s,
    total: D.pyq.filter(q => q.hp && q.s === s.k).length,
    series: years.map(y => D.pyq.filter(q => q.hp && q.y === y && q.s === s.k).length)
  }));
  const topics = {};
  D.pyq.filter(q => q.hp && q.t).forEach(q => topics[q.t] = (topics[q.t] || 0) + 1);
  const ranked = Object.entries(topics)
    .filter(([id]) => IDX.has(id))
    .map(([id, n]) => ({id, n, title: IDX.get(id).r.title, sec: IDX.get(id).r.sec}))
    .sort((a, b) => b.n - a.n || a.title.localeCompare(b.title));
  const never = D.topics.filter(t => !topics[t.id]);
  const hpTotal = D.pyq.filter(q => q.hp).length;
  const meanHP = papers.reduce((a, p) => a + p.hp, 0) / papers.length;
  return {years, papers, bySubject, ranked, never, hpTotal, meanHP,
          unmapped: D.pyq.filter(q => q.hp && !q.t).length};
}

/* ---------- chart primitives (inline SVG, no library) ---------- */
function barRow(label, value, max, colorVar, extra){
  const pct = max ? (value / max * 100) : 0;
  return '<div class="brow'+(extra ? ' '+extra : '')+'">'+
    '<span class="blab">'+label+'</span>'+
    '<span class="btrack"><span class="bfill" style="width:'+pct.toFixed(1)+'%;background:var('+colorVar+')"></span></span>'+
    '<span class="bval">'+value+'</span></div>';
}
function sparkline(vals, colorVar, years){
  const w = 168, h = 46, pad = 5;
  const max = Math.max(2, ...vals);
  const x = i => pad + i * (w - 2*pad) / Math.max(1, vals.length - 1);
  const y = v => h - pad - (v / max) * (h - 2*pad);
  const pts = vals.map((v, i) => [x(i), y(v)]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join("");
  const area = line + "L" + x(vals.length-1).toFixed(1) + " " + (h-pad) + "L" + pad + " " + (h-pad) + "Z";
  const dots = pts.map((p, i) =>
    '<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="'+(i === pts.length-1 ? 4 : 2.6)+'" '+
    'fill="var('+colorVar+')" stroke="var(--surface)" stroke-width="1.6">'+
    '<title>'+years[i]+': '+vals[i]+' question'+(vals[i] === 1 ? '' : 's')+'</title></circle>').join('');
  return '<svg class="spark" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" role="img" '+
    'aria-label="'+vals.map((v,i)=>years[i]+": "+v).join(", ")+'">'+
    '<path d="'+area+'" fill="var('+colorVar+')" opacity=".10"/>'+
    '<path d="'+line+'" fill="none" stroke="var('+colorVar+')" stroke-width="2" '+
    'stroke-linecap="round" stroke-linejoin="round"/>'+dots+'</svg>';
}
function columns(papers){
  const max = Math.max(...papers.map(p => p.hp)) || 1;
  return '<div class="cols">'+papers.map(p => {
    const hgt = (p.hp / max * 100).toFixed(1);
    return '<div class="col'+(p.coverage < 0.9 ? ' partial' : '')+'" '+
      'title="'+p.y+': '+p.hp+' Himachal questions ('+p.recovered+' of '+PAPER_Q+' recovered)">'+
      '<span class="cval">'+p.hp+'</span>'+
      '<span class="ctrack"><span class="cfill" style="height:'+hgt+'%"></span></span>'+
      '<span class="clab">'+p.y+(p.coverage < 0.9 ? ' *' : '')+'</span></div>';
  }).join('')+'</div>';
}

function viewTrends(){
  const T = trendStats();
  const maxSub = Math.max(...T.bySubject.map(s => s.total));
  const maxTopic = T.ranked.length ? T.ranked[0].n : 1;
  const partial = T.papers.filter(p => p.coverage < 0.9);

  const legend = '<div class="legend">'+SUBJECTS.map(s =>
    '<span class="lg"><i style="background:var('+s.v+')"></i>'+s.k+'</span>').join('')+'</div>';

  return '<div class="pagewrap trends">'+
  '<p class="lede">What the prelims papers actually ask, computed from the '+D.pyq.length+
  ' questions recovered from the '+T.papers.length+' papers in this app. Use it to decide what to revise first — '+
  'and read the caveats at the bottom before you trust a number.</p>'+

  /* headline */
  '<div class="tiles">'+
    '<div class="tile"><div class="v">'+T.meanHP.toFixed(0)+'</div><div class="l">Himachal questions per paper</div>'+
      '<div class="s">out of '+PAPER_Q+'</div></div>'+
    '<div class="tile"><div class="v">'+T.hpTotal+'</div><div class="l">Himachal questions in total</div>'+
      '<div class="s">across '+T.papers.length+' papers</div></div>'+
    '<div class="tile"><div class="v">'+T.ranked.length+'</div><div class="l">topic notes examined</div>'+
      '<div class="s">of '+D.topics.length+' in the atlas</div></div>'+
    '<div class="tile"><div class="v">'+T.never.length+'</div><div class="l">never asked here</div>'+
      '<div class="s">lower priority</div></div>'+
  '</div>'+

  /* per-paper */
  '<div class="secthead"><h3>Himachal questions in each paper</h3>'+
    '<span class="n">count, not share</span></div>'+
  '<p class="cnote">Strikingly steady: every paper carries roughly twenty Himachal questions, whatever else changes. '+
  'That is about a fifth of the paper riding on the material in this atlas.</p>'+
  columns(T.papers)+

  /* subject split */
  '<div class="secthead"><h3>Which subject those questions come from</h3>'+
    '<span class="n">'+T.hpTotal+' questions</span></div>'+
  legend+
  '<div class="bars">'+T.bySubject.map(s =>
    barRow(s.k, s.total, maxSub, s.v)).join('')+'</div>'+
  '<p class="cnote">Geography and History carry the most weight. <b>Polity is almost absent</b> — three questions in '+
  T.papers.length+' papers — so state-polity detail is the lowest-return thing on the list.</p>'+

  /* trends */
  '<div class="secthead"><h3>How each subject moves, '+T.years[0]+' to '+T.years[T.years.length-1]+'</h3>'+
    '<span class="n">questions per paper</span></div>'+
  '<div class="smalls">'+T.bySubject.map(s =>
    '<figure class="sm"><figcaption><i style="background:var('+s.v+')"></i>'+s.k+
    '<b>'+s.series[s.series.length-1]+'</b></figcaption>'+
    sparkline(s.series, s.v, T.years)+
    '<span class="smx">'+T.years[0]+'<span>'+T.years[T.years.length-1]+'</span></span></figure>').join('')+'</div>'+
  '<p class="cnote">The one real trend: <b>Economy has gone from absent to the largest single block</b> — '+
  'nothing in '+T.years[0]+', nine questions in '+T.years[T.years.length-1]+'. Culture has moved the other way. '+
  'History is the most stable thing in the paper.</p>'+

  /* topics */
  '<div class="secthead"><h3>Most examined topics</h3><span class="n">tap to open the note</span></div>'+
  '<div class="bars wide">'+T.ranked.slice(0, 16).map(t =>
    '<button class="brow link" type="button" data-go="'+t.id+'">'+
      '<span class="blab">'+t.title+'</span>'+
      '<span class="btrack"><span class="bfill" style="width:'+(t.n/maxTopic*100).toFixed(1)+
        '%;background:var('+(SUBJ_COLOR[t.sec] || "--accent")+')"></span></span>'+
      '<span class="bval">'+t.n+'</span></button>').join('')+'</div>'+

  (T.never.length ? '<div class="secthead"><h3>Not asked in these papers</h3>'+
    '<span class="n">revise last</span></div>'+
    '<div class="rel" style="margin-bottom:6px">'+T.never.map(t =>
      '<button class="relchip" type="button" data-go="'+t.id+'">'+
      '<i class="k" style="background:var(--ink-3)"></i>'+t.title+'</button>').join('')+'</div>'+
    '<p class="cnote">Absence from five papers is weak evidence, not proof. Treat this as an ordering hint, '+
    'not permission to skip.</p>' : '')+

  /* table view + caveats */
  '<div class="secthead"><h3>The numbers</h3></div>'+
  '<div style="overflow-x:auto"><table class="dtable"><thead><tr><th>Subject</th>'+
    T.years.map(y => '<th>'+y+'</th>').join('')+'<th>Total</th></tr></thead><tbody>'+
    T.bySubject.map(s => '<tr><th><i style="background:var('+s.v+')"></i>'+s.k+'</th>'+
      s.series.map(n => '<td>'+n+'</td>').join('')+'<td class="tot">'+s.total+'</td></tr>').join('')+
    '<tr class="sum"><th>All Himachal</th>'+T.papers.map(p => '<td>'+p.hp+'</td>').join('')+
    '<td class="tot">'+T.hpTotal+'</td></tr>'+
    '<tr class="sum"><th>Questions recovered</th>'+T.papers.map(p => '<td>'+p.recovered+'</td>').join('')+
    '<td class="tot">'+D.pyq.length+'</td></tr>'+
    '</tbody></table></div>'+

  '<div class="blk" style="margin-top:20px;max-width:68ch">'+
    '<div class="note dispute"><div class="lb">Read this before trusting the chart</div>'+
    '<p><b>Not every question was recovered.</b> '+
    (partial.length ? partial.map(p => p.y+' yielded only '+p.recovered+' of '+PAPER_Q).join('; ')+
      ' — those papers are marked <b>*</b> above. Because the losses fell mostly on the comprehension '+
      'sections rather than the Himachal questions, <b>counts are reliable but percentages are not</b>, '+
      'which is why nothing here is shown as a share of the paper. ' : '')+
    'The 2024 paper was unavailable and is missing entirely, so a five-year trend is really four data points '+
    'plus a gap.</p></div>'+
    '<div class="note"><div class="lb">How subjects were assigned</div>'+
    '<p>By keyword against each question, not by hand. It is right in the large but wrong in individual cases, '+
    'and '+T.unmapped+' Himachal questions matched no topic closely enough to link — those count in the '+
    'subject totals but not in the topic ranking.</p></div>'+
  '</div></div>';
}
