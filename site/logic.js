/* ===== pure logic: data, costs, plan finder, fit, advice ===== */
const DEDS=[300,500,1000,1500,2000,2500];
const CAP=700;
const LEVY=5.15; /* monthly CO2/VOC levy refund credited on 2026 health insurance bills (CHF 61.80 a year) */
const MODEL={
  BASE:{label:'Standard',rule:'See any doctor directly.'},
  PRAXIS:{label:'Family doctor / HMO',rule:'Always go to your chosen GP or HMO practice first. They refer you on.'},
  TEL_DIG:{label:'Telmed / app',rule:'Call the medical hotline or use the app before every visit.'},
  FLEX:{label:'Mixed',rule:'Pick a first contact each time (GP, hotline, app or pharmacy). Rules vary by insurer.'}
};
/* data is loaded per canton: tariffs (all of Switzerland) once, rows for the chosen canton */
let INSURERS={};
let tariffs=[],tariffById={},rows=[];
function setTariffs(list){tariffs=list.map(t=>({id:t[0],ins:t[1],code:t[2],type:t[3],name:t[4]}));tariffById=Object.fromEntries(tariffs.map(t=>[t.id,t]))}
function setRows(txt){rows=txt.trim().split('\n').filter(Boolean).map(l=>{const f=l.split(',');
  const p=f[4].split(' ').map(x=>x==='-'?null:(+x)/100);
  let d=null;const s=f.slice(5).join(',');
  if(s){ if(s[0]==='d'){const v=+s.slice(1)/100;d=DEDS.map(()=>v)} else d=s.split(' ').map(x=>x==='-'?null:(+x)/100)}
  return {t:+f[0],age:f[1],reg:+f[2],acc:f[3]==='M',p,d}});
  const inCanton=new Set(rows.map(r=>r.t));cantonTariffs=tariffs.filter(t=>inCanton.has(t.id));
  cantonRegions=[...new Set(rows.map(r=>r.reg))].sort();
  rowIndex=new Map(rows.map(r=>[r.t+'|'+r.age+'|'+r.reg+'|'+r.acc,r]))}
let rowIndex=new Map();
let cantonTariffs=[],cantonRegions=[];
const insName=id=>INSURERS[id]||('Insurer '+id);
const planName=t=>t.type==='BASE'?'Standard model':t.name;

function cost(prem,ded,spend){return prem*12+Math.min(spend,ded)+Math.min(0.1*Math.max(spend-ded,0),CAP)}
function worst(prem,ded){return prem*12+ded+CAP}
function rowFor(S,tid){return rowIndex.get(tid+'|'+S.age+'|'+S.reg+'|'+S.acc)}
function opt(S,r,i){const p=r.p[i];if(p==null)return null;const d=r.d?r.d[i]:null;
  return {t:r.t,tar:tariffById[r.t],ded:DEDS[i],prem:p,delta:d,prev:d==null?null:p-d,cost:cost(p,DEDS[i],S.spend),worst:worst(p,DEDS[i])}}
function bestOpt(S,r){let b=null;r.p.forEach((_,i)=>{const o=opt(S,r,i);if(!o)return;if(!b||o.cost<b.cost-0.005||(Math.abs(o.cost-b.cost)<0.005&&o.worst<b.worst))b=o});return b}
function optAt(S,r,ded){return opt(S,r,DEDS.indexOf(+ded))}
function current(S){const r=rowFor(S,+S.bt);return r?optAt(S,r,S.bded):null}

/* Find my plan: which tariffs at this insurer match what you pay */
function findPlan(ins,ded,paid,year,regHint){
  const i=DEDS.indexOf(+ded);if(i<0||!(paid>0))return [];
  const out=[];
  rows.forEach(r=>{const t=tariffById[r.t];if(t.ins!==ins)return;
    const p27=r.p[i];if(p27==null)return;
    const listed=year===2027?p27:(r.d&&r.d[i]!=null?p27-r.d[i]:null);if(listed==null)return;
    const diff=listed-paid; // positive = you pay less than list
    if(diff>=-0.1&&diff<=7.5)out.push({t:r.t,tar:t,age:r.age,reg:r.reg,acc:r.acc,listed,diff})});
  out.sort((a,b)=>{const ea=Math.abs(a.diff)<=0.1?0:1,eb=Math.abs(b.diff)<=0.1?0:1;
    if(ea!==eb)return ea-eb;
    const ha=regHint&&a.reg===regHint?0:1,hb=regHint&&b.reg===regHint?0:1;if(ha!==hb)return ha-hb;
    const sc=x=>Math.min(Math.abs(x.diff),Math.abs(x.diff-LEVY));return sc(a)-sc(b)});
  return out;
}

/* Fit: does this model suit how you see doctors? */
function fit(S,type){
  if(type==='TEL_DIG'&&S.phoneOK==='no')return {level:'poor',note:"You'd have to call or use the app before every visit."};
  if(type==='PRAXIS'){const n=[];if(S.hasGP==='no')n.push('You would first need to choose a GP or HMO practice in their network.');
    if(S.specialists==='yes')n.push('Every specialist visit needs a referral from that GP.');
    if(n.length)return {level:'caution',note:n.join(' ')}}
  if(type==='TEL_DIG'&&S.specialists==='yes')return {level:'caution',note:'Every visit, including specialists, starts with a call or the app.'};
  if(type==='FLEX'&&S.specialists==='yes')return {level:'caution',note:'Specialist visits need the agreed first step. Check the terms.'};
  return {level:'ok',note:''};
}

/* Availability: a few models are only offered in listed municipalities (BFS numbers) */
let RESTRICT={};
function avail(S,tid){const list=(RESTRICT[S.kt]||{})[tid+'|'+S.reg];if(!list)return 'yes';const b=S.bfs||[];if(!b.length)return 'unknown';return b.some(x=>list.includes(x))?'yes':'no'}
/* All plans for the current profile */
function allPlans(S,filterIns){
  const out=[];
  cantonTariffs.forEach(t=>{const r=rowFor(S,t.id);if(!r)return;if(filterIns&&t.ins!==filterIns)return;
    const av=avail(S,t.id);if(av==='no')return;const o=S.dedmode==='best'?bestOpt(S,r):optAt(S,r,S.dedmode);if(o)out.push({...o,fit:fit(S,t.type),avail:av})});
  out.sort((a,b)=>a.cost-b.cost||a.worst-b.worst);return out;
}

/* Advice: the four checks */
function advise(S){
  const cur=current(S);if(!cur)return null;
  const myIns=tariffById[+S.bt].ins;
  const sp={...S,dedmode:'best'};
  // A: deductible on your current model
  const bestHere=bestOpt(S,rowFor(S,+S.bt));
  const A={from:cur,to:bestHere,saving:cur.cost-bestHere.cost};
  A.act=A.saving>=20&&bestHere.ded!==cur.ded;
  A.lower=bestHere.ded<cur.ded;
  // B: other models at your insurer
  const mine=allPlans(sp,myIns).filter(o=>o.fit.level!=='poor'&&o.avail==='yes');
  const bestMine=mine[0]&&mine[0].cost<bestHere.cost-0.005?mine[0]:bestHere;
  const B={to:bestMine,saving:bestHere.cost-bestMine.cost,fit:fit(S,bestMine.tar.type)};
  B.act=B.saving>=20&&bestMine.t!==+S.bt;
  const stayBest=B.act?bestMine:bestHere;
  // C: other insurers
  const others=allPlans(sp).filter(o=>o.tar.ins!==myIns&&o.fit.level!=='poor'&&o.avail==='yes');
  const bestOther=others[0]||null;
  const C={to:bestOther,saving:bestOther?stayBest.cost-bestOther.cost:0,fit:bestOther?fit(S,bestOther.tar.type):null};
  C.level=!bestOther||C.saving<100?'stay':C.saving<300?'optional':'worth';
  C.cheaperAll=allPlans(sp).filter(o=>o.fit.level!=='poor');
  // D: summary
  const target=C.level==='worth'?bestOther:stayBest;
  const total=cur.cost-target.cost;
  return {cur,A,B,C,target,total,myIns};
}
