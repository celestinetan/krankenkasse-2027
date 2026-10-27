/* ===== UI ===== */
const DEADLINE=new Date('2026-11-30T23:59:59+01:00');
const CATS={fitness:'Fitness & sport',massage:'Massage & body therapy',alt_medicine:'Complementary medicine',glasses:'Glasses & lenses',prevention:'Prevention & check-ups',other:'Other'};
let plz=[];
const NICE_NAMES={"8": "CSS", "32": "Aquilana", "134": "Einsiedler Krankenkasse", "194": "Sumiswalder", "246": "KK Steffisburg", "290": "Concordia", "312": "Atupri", "343": "Avenir (Groupe Mutuel)", "360": "Luzerner Hinterland", "376": "KPT", "455": "ÖKK", "509": "Sympany (Vivao)", "881": "EGK", "923": "SLKK", "966": "vita surselva", "1318": "KK Wädenswil", "1384": "SWICA", "1386": "Galenos", "1401": "rhenusana", "1479": "Mutuel (Groupe Mutuel)", "1509": "Sanitas", "1535": "Philos (Groupe Mutuel)", "1542": "Assura", "1555": "Visana", "1560": "Agrisano", "1562": "Helsana", "1568": "sana24"};
const CANTONS={AG:'Aargau',AI:'Appenzell Innerrhoden',AR:'Appenzell Ausserrhoden',BE:'Bern',BL:'Basel-Landschaft',BS:'Basel-Stadt',FR:'Fribourg',GE:'Geneva',GL:'Glarus',GR:'Graubünden',JU:'Jura',LU:'Lucerne',NE:'Neuchâtel',NW:'Nidwalden',OW:'Obwalden',SG:'St. Gallen',SH:'Schaffhausen',SO:'Solothurn',SZ:'Schwyz',TG:'Thurgau',TI:'Ticino',UR:'Uri',VD:'Vaud',VS:'Valais',ZG:'Zug',ZH:'Zurich'};
const PERK_NAMES=['Helsana','CSS','SWICA','Sanitas','Visana','Concordia','KPT','Atupri','Assura','ÖKK','Sympany','EGK'];
function perkGroup(id){const n=insName(id);if(/Groupe Mutuel/.test(n))return 'Groupe Mutuel';if(/^sana24/i.test(n))return 'Visana';return PERK_NAMES.find(p=>n.toLowerCase().startsWith(p.toLowerCase()))||null}
const $=id=>document.getElementById(id);
const fmt=(v,dp=2)=>v.toLocaleString('de-CH',{minimumFractionDigits:dp,maximumFractionDigits:dp});
const chf=(v,dp=0)=>v==null?'–':'CHF '+fmt(v,dp);
const dedTxt=d=>'CHF '+d.toLocaleString('de-CH');

const S={kt:'ZH',place:'',bins:'8',bded:300,paid:'597.60',pyear:2027,plz:'',bt:null,pick:null,touched:false,
  spend:1500,hasGP:'yes',phoneOK:'yes',specialists:'no',age:'E',reg:1,work:'yes',acc:false,
  dedmode:'best',insf:'',models:{BASE:1,PRAXIS:1,TEL_DIG:1,FLEX:1},pins:[],showAll:false,chartPlan:'cur',perkins:'',
  lang:'de',lname:'',lnum:'',laddr:'',steps:{},fold:{}};
try{const saved=JSON.parse(localStorage.getItem('kk27v2')||'null');if(saved)Object.assign(S,saved)}catch(e){}
function save(){try{localStorage.setItem('kk27v2',JSON.stringify(S))}catch(e){}}

function plzHits(){return S.plz.length===4?plz.filter(x=>x[0]===S.plz):[]}
function regHint(){const h=plzHits().filter(x=>x[2]===S.kt);const regs=[...new Set(h.flatMap(x=>x[3]))];return regs.length===1?regs[0]:null}
function matches(){return findPlan(S.bins,S.bded,+S.paid,+S.pyear,regHint())}
function applyMatch(m){S.bt=m.t;S.reg=m.reg;S.age=m.age;S.acc=m.acc;if(!m.acc)S.work='yes';S.pick=m.t+'|'+m.reg+'|'+m.age+'|'+m.acc}
function runFinder(){const ms=matches();if(ms.length)applyMatch(ms[0]);else{const own=cantonTariffs.filter(t=>t.ins===S.bins);if(!own.length)return;if(!own.some(t=>t.id===S.bt))S.bt=(own.find(t=>t.type!=='BASE')||own[0]).id;S.pick=null}}

function seg(id,key,num,after){$(id).querySelectorAll('button').forEach(b=>{b.setAttribute('aria-pressed',String(String(S[key])===b.dataset.v));
  b.onclick=()=>{S[key]=num?+b.dataset.v:b.dataset.v;if(after)after(b.dataset.v);save();render()}})}
const pinIcon='<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M10.5 1.5l4 4-1.4 1.4-.9-.4-2.7 2.7.3 3.2-1.4 1.4L6 11.4l-3.6 3.6-.9-.9L5.1 10.5 2.7 8.1l1.4-1.4 3.2.3L10 4.3l-.4-.9z"/></svg>';
function deltaHtml(o){if(o.delta==null)return '<span class="delta flat">new</span>';
  const pct=o.prev>0?o.delta/o.prev*100:0;const cls=o.delta>0.004?'up':o.delta<-0.004?'down':'flat';
  return `<span class="delta ${cls} num">${o.delta>0?'+':''}${fmt(o.delta)}</span> <span class="cell-sub">${pct>0?'+':''}${fmt(pct,1)}%</span>`}
const accTxt=a=>a?'with accident cover':'without accident cover';
const regTxt=r=>(cantonRegions.length<=1?'canton '+S.kt:(S.kt==='ZH'&&r===1?'region 1 (City of Zurich)':S.kt+' region '+r));

function render(){
  S.bfs=[...new Set(plzHits().filter(x=>x[2]===S.kt).flatMap(x=>x[4]||[]))];
  const days=Math.max(0,Math.ceil((DEADLINE-new Date())/86400000));
  $('deadline').innerHTML=`<div class="days">${days}</div><div class="lbl"><strong>days left to switch</strong><br><span class="muted">Your insurer must receive changes by 30 Nov 2026</span></div>`;

  /* step 1 */
  const insIds=[...new Set(cantonTariffs.map(t=>t.ins))].sort((a,b)=>insName(a).localeCompare(insName(b)));
  $('bins').innerHTML=insIds.map(i=>`<option value="${i}" ${i===S.bins?'selected':''}>${insName(i)}</option>`).join('');
  $('bded').innerHTML=DEDS.map(d=>`<option value="${d}" ${d==S.bded?'selected':''}>${dedTxt(d)}</option>`).join('');
  if(document.activeElement!==$('paid'))$('paid').value=S.paid;
  if(document.activeElement!==$('plz'))$('plz').value=S.plz;
  seg('pyear','pyear',true,()=>{S.touched=true;runFinder()});
  const ms=matches();
  let fh='';
  if(S.paid===''||!(+S.paid>0))fh='<div class="note info">Type what you pay a month for basic insurance and the page finds your exact plan.</div>';
  else if(!ms.length)fh=`<div class="note warn">No ${insName(S.bins)} plan in ${CANTONS[S.kt]} costs ${chf(+S.paid,2)} at a ${dedTxt(+S.bded)} deductible${+S.pyear===2026?' in 2026':' in 2027'}. Check the deductible and that you entered basic insurance only, or set your plan by hand below.</div>`;
  else{
    const list=ms.slice(0,4);
    fh=`<div class="field"><span class="flabel">${list.length>1?'Which of these is yours?':'Your plan'}</span><div class="choices" id="matchlist">${list.map((m,i)=>{const key=m.t+'|'+m.reg+'|'+m.age+'|'+m.acc;
      const levy=Math.abs(m.diff-LEVY)<0.6&&+S.pyear===2026;
      const why=Math.abs(m.diff)<=0.1?'exact match':levy?`listed ${chf(m.listed,2)}; you pay ${chf(m.diff,2)} less because of the CO2 levy refund`:`listed ${chf(m.listed,2)}`;
      return `<button type="button" data-i="${i}" aria-pressed="${S.pick===key}">${planName(m.tar)}<span>${regTxt(m.reg)} · ${m.age==='E'?'26+':'19 to 25'} · ${accTxt(m.acc)} · ${why}</span></button>`}).join('')}</div></div>`;
    if(list.length>1)fh+='<div class="hint">Plans can share a price. Pick the model name your insurer shows.</div>';
  }
  $('finder').innerHTML=fh;
  if($('matchlist'))$('matchlist').querySelectorAll('button').forEach(b=>b.onclick=()=>{applyMatch(ms.slice(0,4)[+b.dataset.i]);S.touched=true;S.fold[1]=true;save();render()});
  const own=cantonTariffs.filter(t=>t.ins===S.bins&&rowFor(S,t.id));
  $('bmodel').innerHTML=own.map(t=>`<option value="${t.id}" ${t.id==S.bt?'selected':''}>${planName(t)}</option>`).join('');

  /* step 2 */
  $('preset').querySelectorAll('button').forEach(b=>{b.setAttribute('aria-pressed',String(+b.dataset.v===S.spend));b.onclick=()=>{S.spend=+b.dataset.v;save();render()}});
  $('spend').value=S.spend;$('spendval').textContent=chf(S.spend)+' a year';
  /* step 3 */
  seg('hasGP','hasGP');seg('phoneOK','phoneOK');seg('specialists','specialists');
  /* step 4 */
  seg('age','age');
  $('region').innerHTML=cantonRegions.map(r=>`<button type="button" data-v="${r}">${S.kt==='ZH'&&r===1?'1 · City of Zurich':r}</button>`).join('');seg('region','reg',true);
  $('kt').innerHTML=Object.entries(CANTONS).sort((a,b)=>a[1].localeCompare(b[1])).map(([k,n])=>`<option value="${k}" ${k===S.kt?'selected':''}>${n}</option>`).join('');
  seg('work','work',false,v=>{S.acc=(v==='no')});
  $('acc').checked=S.acc;
  const hit=plzHits().filter(x=>x[2]===S.kt);
  $('regwrap').hidden=cantonRegions.length<=1;
  if(S.plz.length===4&&!plzHits().length)$('reghint').textContent='That postcode is not in the FOPH list.';
  else if(hit.length){const regs=[...new Set(hit.flatMap(h=>h[3]))].sort();const pl=[...new Set(hit.map(h=>h[1]))].join(', ');
    $('reghint').textContent=regs.length>1?`${pl} spans regions ${regs.join(' and ')}; your municipality decides.`:`${pl} is in region ${regs[0]}.`}
  else $('reghint').textContent='Set automatically from your postcode or when the page finds your plan.';
  $('acchint').innerHTML=S.work==='yes'
    ?(S.acc?'Your employer already insures you for accidents, so you could leave this out and save.':'Left out: your employer insures you for accidents. If your job ends, that stops 31 days after your last salary, and you then need to add it here.')
    :(S.acc?'Included: without an employer, your health insurance has to cover accidents.':'<span style="color:var(--bad)">Without an employer you need accident cover here.</span>');

  $('contact').textContent=CONTACT||'[contact email to be added]';
  renderFolds();
  renderVerdict();
  renderPlans();
  renderCompare();
  renderChart();
  renderPerks();
  renderSwitch();
}

const PRESET_LBL={300:'Only check-ups',1500:'A few visits',4000:'Regular treatment',8500:'I always hit the CHF 700 cap'};
function renderFolds(){
  const t=tariffById[+S.bt];
  const sums={
    1:t?`${insName(t.ins)} · ${planName(t)} · ${dedTxt(+S.bded)} deductible${+S.paid>0?' · '+chf(+S.paid,2)+'/mo':''}`:'Not set yet',
    2:(PRESET_LBL[S.spend]?PRESET_LBL[S.spend]+' · ':'')+'about '+chf(S.spend)+' a year',
    3:[S.hasGP==='yes'?'Has a GP':'No GP yet',S.phoneOK==='yes'?'phoning first is fine':'no phoning first',S.specialists==='yes'?'sees specialists often':'rarely sees specialists'].join(' · '),
    4:`${S.age==='E'?'26 or older':'19 to 25'} · ${regTxt(S.reg)} · ${accTxt(S.acc)}`};
  [1,2,3,4].forEach(n=>{const f=!!S.fold[n];$('b'+n).hidden=f;$('sum'+n).hidden=!f;$('sum'+n).textContent=sums[n];
    const b=$('t'+n);b.textContent=f?'Edit':'Done';b.setAttribute('aria-expanded',String(!f));
    b.onclick=()=>{S.fold[n]=!f;save();render();if(f)$('b'+n).querySelector('button,select,input')?.focus()}});
}
const TABS=['answer','compare','perks','switch','about'];
const CONTACT='hello@celestinetan.com'; /* add a contact email before sharing publicly */
function showTab(name){if(!TABS.includes(name))name='answer';
  document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==name);
  document.querySelectorAll('#tabs a').forEach(a=>{if(a.dataset.tab===name)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  const tb=$('tabs');if(tb.getBoundingClientRect().top<0)tb.scrollIntoView({block:'start'})}
function goTab(name){if(location.hash==='#'+name)showTab(name);else location.hash=name}

function renderVerdict(){
  const a=advise(S);const v=$('verdict');
  if(!a){v.innerHTML='<h2 id="h-verdict">What the numbers suggest</h2><div class="empty">Tell the page your plan in step 1 to get an answer.</div>';return}
  const my=insName(a.myIns);
  const acts=[];let head='';
  const curName=planName(a.cur.tar);
  if(a.C.level==='worth'){const t=a.C.to;head=`Moving your basic insurance to ${insName(t.tar.ins)} could save the most.`;
    acts.push(`Option: move basic insurance to <strong>${insName(t.tar.ins)} · ${planName(t.tar)}</strong> with a ${dedTxt(t.ded)} deductible.`);
    acts.push(`If you do, keep your extras with ${my} until ${insName(t.tar.ins)} has accepted you.`)}
  else if(a.B.act){const t=a.B.to;head=`Changing to ${planName(t.tar)} at ${my}${t.ded!==a.cur.ded?` with a ${dedTxt(t.ded)} deductible`:''} could save the most.`;
    acts.push(`Option: ask ${my} to change your model to <strong>${planName(t.tar)}</strong>${t.ded!==a.cur.ded?` and your deductible to <strong>${dedTxt(t.ded)}</strong>`:''}.`)}
  else if(a.A.act){head=`Your plan looks right. ${a.A.lower?'A lower':'A higher'} deductible of ${dedTxt(a.A.to.ded)} could save you money.`;
    acts.push(`Option: ask ${my} to change your deductible from ${dedTxt(a.cur.ded)} to <strong>${dedTxt(a.A.to.ded)}</strong>.`)}
  else head=`Your current plan already looks like the cheapest choice that suits you.`;
  if(a.C.level==='optional')acts.push(`Also possible: ${insName(a.C.to.tar.ins)} ${planName(a.C.to.tar)} could save another ${chf(a.C.saving)} a year (see below).`);
  const changesLater=a.C.level==='worth'||a.B.act||(a.A.act&&a.A.lower);
  const when=a.C.level==='worth'?'The cancellation must reach '+my+' by 30 November 2026.'
    :changesLater?`${my} must receive your request by 30 November 2026.`
    :a.A.act?`Raising a deductible is usually possible until 31 December; confirm the date with ${my}.`:'';
  const acc=S.work==='no'&&!S.acc?'<div class="note bad">You said you don\'t work 8+ hours a week for one employer, but accident cover is left out. Add it, or you are not insured for accidents.</div>':'';
  const example=!S.touched?'<div class="note info">Showing an example. Enter your own plan in step 1 for your answer.</div>':'';

  // card 1
  const A=a.A;
  const c1=A.act
    ?`<div class="chk"><div class="top"><h3>Your deductible</h3><span class="pill do">Could save</span></div><div class="fig">${dedTxt(a.cur.ded)} → ${dedTxt(A.to.ded)}</div>
      <p>Could save <strong>${chf(A.saving)}</strong> a year: ${chf(A.to.cost)} instead of ${chf(a.cur.cost)}.</p>
      <p class="muted small">${A.lower?'With bills this high you pay the whole deductible anyway, so the cheaper premium of a high deductible doesn\'t make up for it.':'With bills this low you rarely use the deductible, so a higher one mostly just lowers your premium.'} In a bad year the most you could pay is ${chf(A.to.worst)}.</p></div>`
    :`<div class="chk"><div class="top"><h3>Your deductible</h3><span class="pill ok">Looks right</span></div><div class="fig">${dedTxt(a.cur.ded)}</div><p>Looks like the cheapest deductible for your bills on this plan.</p></div>`;
  // card 2
  const B=a.B;let c2;
  const anyCheaperMine=allPlans({...S,dedmode:'best'},a.myIns).find(o=>o.cost<(B.act?B.to.cost:A.to.cost)-20&&o.fit.level==='poor');
  if(B.act)c2=`<div class="chk"><div class="top"><h3>Other models at ${my}</h3><span class="pill do">Could save</span></div><div class="fig">${planName(B.to.tar)}</div>
      <p>Could save <strong>${chf(B.saving)}</strong> a year more than changing the deductible alone.</p><p class="muted small">${MODEL[B.to.tar.type].rule}${B.fit.note?' '+B.fit.note:''}</p></div>`;
  else c2=`<div class="chk"><div class="top"><h3>Other models at ${my}</h3><span class="pill ok">Looks right</span></div><div class="fig">${curName}</div>
      <p>Your model looks like the cheapest one at ${my} that suits you.</p>${anyCheaperMine?`<p class="muted small">${planName(anyCheaperMine.tar)} is cheaper, but ${anyCheaperMine.fit.note.charAt(0).toLowerCase()+anyCheaperMine.fit.note.slice(1)}</p>`:''}</div>`;
  // card 3
  const C=a.C;let c3='';
  if(!C.to)c3=`<div class="chk"><div class="top"><h3>Other insurers</h3><span class="pill ok">No saving</span></div><p>No cheaper plan elsewhere that suits you.</p></div>`;
  else{const t=C.to;const pill=C.level==='worth'?'<span class="pill do">Bigger saving</span>':C.level==='optional'?'<span class="pill opt">Small saving</span>':'<span class="pill ok">Tiny saving</span>';
    const body=C.saving<=0?`<p>Nothing elsewhere beats your best option at ${my}.</p>`
      :C.level==='stay'?`<p>The best plan elsewhere could save only <strong>${chf(C.saving)}</strong> a year. That's small for the effort of switching insurer.</p>`
      :C.level==='optional'?`<p>Could save <strong>${chf(C.saving)}</strong> a year. A small amount, so it mainly makes sense if its rules suit you.</p>`
      :`<p>Could save <strong>${chf(C.saving)}</strong> a year compared with your best option at ${my}.</p>`;
    const supp=C.level!=='stay'&&C.saving>0?`<div class="note warn small">Keep your extras with ${my} until the new insurer has accepted you. New extras can be refused because of your health, and basic and extras can stay with different insurers. <a href="#perks" class="toperks">See what ${my}'s extras pay</a></div>`:'';
    c3=`<div class="chk"><div class="top"><h3>Other insurers</h3>${pill}</div><div class="fig">${insName(t.tar.ins)} · ${planName(t.tar)}</div>${body}
      <p class="muted small">${MODEL[t.tar.type].label}: ${MODEL[t.tar.type].rule}${C.fit&&C.fit.note?' '+C.fit.note:''} Deductible ${dedTxt(t.ded)}.</p>${supp}</div>`}

  v.innerHTML=`${example}<div class="vhead"><div><div class="eyebrow" id="h-verdict">What the numbers suggest</div><p class="say">${head}</p></div>
    <div class="vsave">${a.total>=1?`<div class="v">${chf(a.total)}</div><div class="s">possible saving a year</div>`:`<div class="v" style="color:var(--ink)">${chf(a.cur.cost)}</div><div class="s">your yearly cost</div>`}</div></div>
    ${acts.length?`<ol class="actions">${acts.map(x=>`<li>${x}</li>`).join('')}</ol>`:''}
    ${when?`<p class="small"><strong>If you go ahead:</strong> ${when}</p>`:''}${acc}
    <div class="checks">${c1}${c2}${c3}</div>
    <div class="links">${C.level!=='stay'&&C.saving>0?'<a href="#switch" class="primary">Start switching</a>':''}<a href="#compare">See all plans</a><a href="#perks" class="toperks">What do extras pay?</a></div>
    <p class="hint">Based on ${my} ${curName} at ${dedTxt(a.cur.ded)}, ${chf(S.spend)} of bills a year, ${S.age==='E'?'age 26+':'age 19 to 25'}, ${regTxt(S.reg)}, ${accTxt(S.acc)}. Your yearly cost now: ${chf(a.cur.cost)}.</p>`;
  v.querySelectorAll('.toperks').forEach(l=>l.onclick=()=>{const g=perkGroup(a.myIns);if(g)S.perkins=g;save();renderPerks()});
}

function renderPlans(){
  $('insf').innerHTML='<option value="">All insurers</option>'+[...new Set(cantonTariffs.map(t=>t.ins))].sort((a,b)=>insName(a).localeCompare(insName(b))).map(i=>`<option value="${i}" ${i===S.insf?'selected':''}>${insName(i)}</option>`).join('');
  $('dedmode').innerHTML='<option value="best">Best for your bills</option>'+DEDS.map(d=>`<option value="${d}">${dedTxt(d)}</option>`).join('');
  $('dedmode').value=String(S.dedmode);
  $('models').innerHTML=Object.entries(MODEL).map(([k,m])=>`<button type="button" class="chipbtn" data-k="${k}" aria-pressed="${!!S.models[k]}">${m.label}</button>`).join('');
  $('models').querySelectorAll('button').forEach(x=>x.onclick=()=>{S.models[x.dataset.k]=S.models[x.dataset.k]?0:1;save();render()});
  const all=allPlans(S,S.insf).filter(o=>S.models[o.tar.type]);
  const cur=current(S);
  $('plansub').textContent=`${all.length} plans · ${S.age==='E'?'age 26+':'age 19 to 25'} · ${regTxt(S.reg)} · ${accTxt(S.acc)} · ${chf(S.spend)} of bills a year. Faded plans don't suit your answers in step 3.`;
  const limit=S.showAll?all.length:20;const shown=all.slice(0,limit);
  const mine=all.find(o=>o.t==S.bt);if(mine&&!shown.includes(mine))shown.push(mine);
  $('plans').innerHTML=`<div class="plan head"><div>#</div><div>Insurer · model</div><div>Deductible</div><div>Premium /mo</div><div>vs 2026 /mo</div><div>Cost / year</div><div></div></div>`+
    shown.map(o=>{const isB=o.t==S.bt;const pinned=S.pins.includes(o.t);const diff=cur&&!isB?o.cost-cur.cost:null;
    return `<div class="plan ${isB?'base':''} ${o.fit.level==='poor'?'poor':''}">
      <div class="rank">${all.indexOf(o)+1}</div>
      <div class="pname"><span class="ins">${isB?'<span class="tag you">You</span>':''}${insName(o.tar.ins)}</span><span class="mdl"><span class="tag">${MODEL[o.tar.type].label}</span>${planName(o.tar)}</span><span class="rule">${MODEL[o.tar.type].rule}</span>${o.fit.note?`<span class="fitn">${o.fit.level==='poor'?'Doesn\'t suit you: ':'Check: '}${o.fit.note}</span>`:''}${o.avail==='unknown'?'<span class="fitn">Only offered in some municipalities. Enter your postcode in step 1 to check.</span>':''}</div>
      <div class="r c-ded"><span class="lbl-m">Deductible</span><span class="num">${o.ded.toLocaleString('de-CH')}</span></div>
      <div class="r c-prem"><span class="lbl-m">Premium /mo</span><span class="cell-big">${fmt(o.prem)}</span></div>
      <div class="r c-yoy"><span class="lbl-m">vs 2026 /mo</span>${deltaHtml(o)}</div>
      <div class="r c-tco"><span class="lbl-m">Cost / year</span><span class="cell-big">${chf(o.cost)}</span>${diff!=null&&Math.abs(diff)>=1?`<span class="vsb ${diff<0?'save':'more'}" style="display:block">${diff<0?'save '+chf(-diff):'+'+chf(diff)}</span>`:''}</div>
      <div class="pinc">${isB?'':`<button type="button" class="pin" data-t="${o.t}" aria-pressed="${pinned}" aria-label="${pinned?'Unpin':'Pin'} ${insName(o.tar.ins)} ${planName(o.tar)}" title="${pinned?'Unpin':'Pin to compare'}">${pinIcon}</button>`}</div></div>`}).join('');
  $('plans').querySelectorAll('.pin').forEach(p=>p.onclick=()=>{const t=+p.dataset.t;if(S.pins.includes(t))S.pins=S.pins.filter(x=>x!==t);else{if(S.pins.length>=4)S.pins.shift();S.pins.push(t)}save();render()});
  $('more').textContent=S.showAll?'Show top 20 only':`Show all ${all.length} plans`;$('more').hidden=all.length<=20;
}

function renderCompare(){
  const cur=current(S);
  const ids=[+S.bt,...S.pins.filter(t=>t!=S.bt)];
  $('cmp').innerHTML=ids.map(tid=>{const t=tariffById[tid];const r=rowFor(S,tid);if(!r)return '';const isB=tid==S.bt;
    const o=isB?cur:bestOpt(S,r);if(!o)return '';const diff=cur&&!isB?o.cost-cur.cost:null;
    return `<div class="ccard ${isB?'base':''}"><div><div class="eyebrow">${isB?'Your plan now':MODEL[t.type].label}</div><h3>${insName(t.ins)}</h3><div class="small">${planName(t)}</div></div>
      <dl><dt>Deductible</dt><dd>${o.ded.toLocaleString('de-CH')}</dd><dt>Premium /mo</dt><dd>${fmt(o.prem)}</dd><dt>vs 2026</dt><dd>${o.delta==null?'new':(o.delta>=0?'+':'')+fmt(o.delta)}</dd><dt>Cost /yr</dt><dd><strong>${fmt(o.cost,0)}</strong></dd><dt>Worst year</dt><dd>${fmt(o.worst,0)}</dd>${diff!=null?`<dt>vs yours</dt><dd style="color:${diff<0?'var(--good)':'var(--bad)'}">${diff<0?'−':'+'}${fmt(Math.abs(diff),0)}</dd>`:''}</dl>
      <div class="hint">${MODEL[t.type].rule}</div></div>`}).join('')+(S.pins.length?'':'<div class="empty">Nothing pinned yet. Use the pin on any plan in the list.</div>');
}

function renderChart(){
  const a=advise(S);
  const opts=[{v:'cur',label:'Your plan now'}].concat(a&&a.target&&a.target.t!=S.bt?[{v:'rec',label:'The recommended plan'}]:[]).concat(S.pins.map(t=>({v:String(t),label:insName(tariffById[t].ins)+' · '+planName(tariffById[t])})));
  if(!opts.some(o=>o.v===S.chartPlan))S.chartPlan='cur';
  $('chartplan').innerHTML=opts.map(o=>`<option value="${o.v}" ${o.v===S.chartPlan?'selected':''}>${o.label}</option>`).join('');
  const tid=S.chartPlan==='cur'?+S.bt:S.chartPlan==='rec'?a.target.t:+S.chartPlan;
  const r=rowFor(S,tid);const svg=$('chart');if(!r){svg.innerHTML='';return}
  const W=760,H=340,L=64,R=20,T=16,B=40,xmax=12000;const cols=['--c1','--c2','--c3','--c4','--c5','--c6'];
  const ser=DEDS.map((d,i)=>r.p[i]==null?null:{d,prem:r.p[i],col:cols[i]}).filter(Boolean);
  const step=1000;const ymin=Math.floor(Math.min(...ser.map(s=>cost(s.prem,s.d,0)))/step)*step;const ymax=Math.ceil(Math.max(...ser.map(s=>cost(s.prem,s.d,xmax)))/step)*step;
  const x=v=>L+(W-L-R)*v/xmax,y=v=>T+(H-T-B)*(1-(v-ymin)/(ymax-ymin));
  let g='<g class="grid">';for(let v=ymin;v<=ymax;v+=step)g+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end">${(v/1000).toLocaleString('de-CH')}k</text>`;
  for(let v=0;v<=xmax;v+=2000)g+=`<text x="${x(v)}" y="${H-B+18}" text-anchor="middle">${v/1000}k</text>`;
  g+=`<text x="${(L+W-R)/2}" y="${H-4}" text-anchor="middle">doctor bills per year (CHF)</text></g>`;
  let paths='';ser.forEach(s=>{const pts=[...new Set([0,s.d,s.d+7000,xmax])].filter(v=>v<=xmax).sort((a,b)=>a-b);
    paths+=`<path d="${pts.map((v,i)=>(i?'L':'M')+x(v).toFixed(1)+' '+y(cost(s.prem,s.d,v)).toFixed(1)).join(' ')}" fill="none" stroke="var(${s.col})" stroke-width="2.2"/>`});
  const sx=x(Math.min(S.spend,xmax));let mk=`<line x1="${sx}" x2="${sx}" y1="${T}" y2="${H-B}" stroke="var(--ink)" stroke-dasharray="4 4"/>`;
  ser.forEach(s=>{mk+=`<circle cx="${sx}" cy="${y(cost(s.prem,s.d,S.spend))}" r="4" fill="var(${s.col})" stroke="var(--surface)" stroke-width="1.5"/>`});
  svg.innerHTML=g+paths+mk;
  $('legend').innerHTML=ser.map(s=>`<span><i style="background:var(${s.col})"></i>${dedTxt(s.d)} · ${fmt(s.prem)}/mo</span>`).join('');
  const rk=ser.map(s=>({...s,c:cost(s.prem,s.d,S.spend)})).sort((a,b)=>a.c-b.c);
  const lo=ser[0],hi=ser[ser.length-1];let be=null;for(let v=0;v<=20000;v+=10){if(cost(lo.prem,lo.d,v)<=cost(hi.prem,hi.d,v)){be=v;break}}
  $('chartnote').innerHTML=`At ${chf(S.spend)} of bills the cheapest deductible on ${planName(tariffById[tid])} is <strong>${dedTxt(rk[0].d)}</strong> (${chf(rk[0].c)} a year). `+(be!=null?`The ${dedTxt(lo.d)} deductible beats ${dedTxt(hi.d)} once your bills pass about <strong>${chf(Math.round(be/50)*50)}</strong> a year.`:'');
}

function renderPerks(){
  const ins=[...new Set(PERKS.map(p=>p.insurer))];
  if(!S.perkins||!ins.includes(S.perkins)){const g=perkGroup(S.bins);S.perkins=g&&ins.includes(g)?g:ins[0]}
  $('perkins').innerHTML=ins.map(n=>`<option ${n===S.perkins?'selected':''}>${n}</option>`).join('');
  const ps=PERKS.filter(p=>p.insurer===S.perkins);
  const groups=Object.keys(CATS).map(c=>[c,ps.filter(p=>p.category===c)]).filter(g=>g[1].length);
  $('perks').innerHTML=`<p class="small muted" style="margin-bottom:12px">From ${S.perkins}'s own product pages. Each product costs extra on top of basic insurance; conditions apply.</p><div class="perkgrid">${groups.map(([c,list])=>`<div class="perkcat"><h3>${CATS[c]}</h3>${list.map(p=>`<div class="perk"><span class="prod">${p.product}</span><span>${p.benefit}</span>${p.conditions?`<span class="cond">${p.conditions}</span>`:''}${p.source?`<a class="cond" href="${p.source}" target="_blank" rel="noopener">Source</a>`:''}</div>`).join('')}</div>`).join('')}</div>`;
}

function renderSwitch(){
  const list=[['pick','Choose your plan, using the comparison as a guide'],['offer','Get a written offer from the new insurer for basic insurance'],['apply','Apply to the new insurer. They cannot refuse you for basic insurance'],['cancel','Send the cancellation to your current insurer by registered post, ideally by 15 November'],['confirm','Check both insurers confirm: old cover ends 31 December, new cover starts 1 January 2027']];
  $('steps').innerHTML=list.map(([k,t])=>`<li><input type="checkbox" id="st-${k}" ${S.steps[k]?'checked':''}><label for="st-${k}">${t}</label></li>`).join('');
  list.forEach(([k])=>$('st-'+k).onchange=e=>{S.steps[k]=e.target.checked;save()});
  ['lname','lnum','laddr'].forEach(k=>{if(document.activeElement!==$(k))$(k).value=S[k]});
  seg('lang','lang');$('letter').textContent=letterText();
}
function letterText(){
  const name=S.lname||'[Your name]',addr=S.laddr||'[Street, postcode, town]',num=S.lnum||'[policy number]';
  const ins=S.bins==='1562'?'Helsana Versicherungen AG\nPostfach\n8081 Zürich':insName(S.bins)+'\n[Address from your policy]';
  const today=new Date().toLocaleDateString(S.lang==='de'?'de-CH':'en-GB',{day:'numeric',month:'long',year:'numeric'});
  if(S.lang==='de')return `${name}\n${addr}\n\n${ins}\n\n${S.place||'[Ort]'}, ${today}\n\nEINSCHREIBEN\n\nKündigung der obligatorischen Krankenpflegeversicherung (Grundversicherung KVG)\nVersichertennummer: ${num}\n\nSehr geehrte Damen und Herren\n\nHiermit kündige ich meine obligatorische Krankenpflegeversicherung nach KVG fristgerecht per 31. Dezember 2026.\n\nAllfällige Zusatzversicherungen nach VVG sind von dieser Kündigung nicht betroffen und sollen unverändert weiterlaufen.\n\nMein neuer Versicherer wird Ihnen die lückenlose Weiterversicherung ab 1. Januar 2027 bestätigen.\n\nBitte bestätigen Sie mir den Erhalt dieser Kündigung schriftlich.\n\nFreundliche Grüsse\n\n${name}`;
  return `${name}\n${addr}\n\n${ins.replace('Postfach','PO Box').replace('Zürich','Zurich')}\n\n${S.place||'[Place]'}, ${today}\n\nREGISTERED MAIL\n\nCancellation of compulsory health insurance (basic insurance under the KVG)\nPolicy number: ${num}\n\nDear Sir or Madam\n\nI hereby cancel my compulsory health insurance under the KVG with effect from 31 December 2026, within the notice period.\n\nAny supplementary insurance under the VVG is not affected by this cancellation and should continue unchanged.\n\nMy new insurer will confirm to you that I am covered without interruption from 1 January 2027.\n\nPlease confirm receipt of this cancellation in writing.\n\nKind regards\n\n${name}\n\n(Send the German version. This translation is for your reference.)`;
}

/* inputs */
$('bins').addEventListener('change',e=>{S.bins=e.target.value;S.touched=true;runFinder();save();render()});
$('bded').addEventListener('change',e=>{S.bded=+e.target.value;S.touched=true;runFinder();save();render()});
$('paid').addEventListener('input',e=>{S.paid=e.target.value;S.touched=true;runFinder();save();render()});
$('plz').addEventListener('input',async e=>{S.plz=e.target.value.replace(/\D/g,'').slice(0,4);e.target.value=S.plz;
  const h=plzHits();const kts=[...new Set(h.map(x=>x[2]))];if(h.length)S.place=h[0][1];
  if(kts.length===1&&kts[0]!==S.kt){await loadCanton(kts[0]);}
  const rh=regHint();if(rh!=null){S.reg=rh;}runFinder();save();render()});
$('kt').addEventListener('change',async e=>{await loadCanton(e.target.value);S.touched=true;runFinder();save();render()});
$('bmodel').addEventListener('change',e=>{S.bt=+e.target.value;S.pick=null;S.touched=true;save();render()});
$('spend').addEventListener('input',e=>{S.spend=+e.target.value;save();render()});
$('acc').addEventListener('change',e=>{S.acc=e.target.checked;save();render()});
$('dedmode').addEventListener('change',e=>{S.dedmode=e.target.value;save();render()});
$('insf').addEventListener('change',e=>{S.insf=e.target.value;save();render()});
$('more').addEventListener('click',()=>{S.showAll=!S.showAll;save();render()});
$('chartplan').addEventListener('change',e=>{S.chartPlan=e.target.value;save();render()});
$('perkins').addEventListener('change',e=>{S.perkins=e.target.value;save();renderPerks()});
['lname','lnum','laddr'].forEach(k=>$(k).addEventListener('input',e=>{S[k]=e.target.value;save();$('letter').textContent=letterText()}));
$('copy').addEventListener('click',()=>{const txt=letterText();const done=()=>{$('copied').textContent='Copied'};
  function sel(){const r=document.createRange();r.selectNodeContents($('letter'));const s=getSelection();s.removeAllRanges();s.addRange(r);$('copied').textContent='Selected. Press Ctrl+C or Cmd+C to copy.'}
  try{navigator.clipboard.writeText(txt).then(done).catch(sel)}catch(e){sel()}});
window.addEventListener('hashchange',()=>showTab(location.hash.slice(1)));
const cache={};
async function loadCanton(kt){if(!cache[kt]){const r=await fetch('data/cantons/'+kt+'.txt');if(!r.ok)throw new Error('canton '+kt);cache[kt]=await r.text()}
  S.kt=kt;setRows(cache[kt]);if(!cantonRegions.includes(S.reg))S.reg=cantonRegions[0];
  if(!cantonTariffs.some(t=>t.ins===S.bins)){const ids=[...new Set(cantonTariffs.map(t=>t.ins))];S.bins=ids.includes('1562')?'1562':ids[0]}}
async function boot(){
  showTab(location.hash.slice(1));
  try{
    const [tj,ij,pj]=await Promise.all(['data/tariffs.json','data/insurers.json','data/plz.json'].map(f=>fetch(f).then(r=>{if(!r.ok)throw new Error(f);return r.json()})));
    setTariffs(tj);INSURERS=Object.assign(ij,NICE_NAMES);plz=pj;
    try{RESTRICT=await fetch('data/restricted.json').then(r=>r.ok?r.json():{})}catch(e){RESTRICT={}}
    fetch('data/meta.json').then(r=>r.json()).then(m=>{$('databuilt').textContent='Data files built '+m.built+'.'}).catch(()=>{});
    await loadCanton(S.kt||'ZH');
    if(S.bt==null||!tariffById[S.bt]||!rowFor(S,+S.bt))runFinder();
    render();
  }catch(err){$('verdict').innerHTML='<div class="note bad">The premium data could not be loaded. Check your connection and reload the page.</div>';console.error(err)}
}
boot();
