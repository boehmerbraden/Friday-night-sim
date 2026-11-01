// Score-only projections. No play logs, player statistics or current roster lookups.
export function historySeasons(input){return [...new Map(input.filter(s=>s?.id).map(s=>[s.id,s])).values()].sort((a,b)=>(a.created||'').localeCompare(b.created||'')||a.id.localeCompare(b.id));}
export function historyGames(s,scope='both'){
 const teams=new Set(s.teams.map(t=>t.id));
 return [...new Map(s.games.filter(g=>g.id&&g.status==='final'&&['regular','playoff'].includes(g.phase)&&teams.has(g.away)&&teams.has(g.home)&&g.away!==g.home&&Array.isArray(g.score)&&g.score.length===2&&g.score.every(n=>Number.isInteger(n)&&n>=0)&&(scope==='both'||g.phase===scope)).map(g=>[g.id,g])).values()].sort((a,b)=>(a.phase==='regular'?0:1)-(b.phase==='regular'?0:1)||(a.week||a.round||0)-(b.week||b.round||0)||a.id.localeCompare(b.id));
}
export function historyNeutral(s,g){return typeof g.neutral==='boolean'?g.neutral:!!s.settings?.gameOptions?.neutral||(g.phase==='playoff'&&g.round===Math.ceil(Math.log2(s.seeds?.length||0)));}
export function historyChampion(s){if(s.status!=='complete'||!s.champion)return null;const ids=s.rounds?.at(-1);if(ids?.length!==1)return null;const g=historyGames(s,'playoff').find(g=>g.id===ids[0]);if(!g||g.score[0]===g.score[1])return null;const winner=g.score[0]>g.score[1]?g.away:g.home;if(winner!==s.champion)return null;return {season:s,game:g,champion:winner,runnerUp:winner===g.away?g.home:g.away};}
export function historyRecord(){return {w:0,l:0,t:0,gp:0,pct:0,pf:0,pa:0,diff:0,ppg:0,papg:0,margin:0,shutouts:0,streak:0,streakKind:'',longest:0,run:0,last:[],home:{w:0,l:0,t:0},away:{w:0,l:0,t:0},division:{w:0,l:0,t:0},games:[]};}
export function historyAccumulate(r,s,g,id){const i=g.away===id?0:1,pf=g.score[i],pa=g.score[1-i],kind=pf>pa?'w':pf<pa?'l':'t';r[kind]++;r.gp++;r.pf+=pf;r.pa+=pa;r.diff=r.pf-r.pa;r.pct=(r.w+.5*r.t)/r.gp;r.ppg=r.pf/r.gp;r.papg=r.pa/r.gp;r.margin=r.diff/r.gp;r.shutouts+=pa===0?1:0;r.streak=r.streakKind===kind?r.streak+1:1;r.streakKind=kind;r.run=kind==='w'?r.run+1:0;r.longest=Math.max(r.longest,r.run);r.last.push(kind.toUpperCase());r.last=r.last.slice(-5);if(!historyNeutral(s,g))r[i?'home':'away'][kind]++;const team=s.teams.find(t=>t.id===id),opp=s.teams.find(t=>t.id===(i?g.away:g.home));if(g.phase==='regular'&&team.division&&team.division===opp.division)r.division[kind]++;r.games.push({season:s,game:g,team,opponent:opp,points:pf,against:pa,kind});return r;}
export function historyRows(s,scope='regular'){const rows=new Map(s.teams.map(team=>[team.id,{...historyRecord(),team}]));for(const g of historyGames(s,scope))for(const id of [g.away,g.home])historyAccumulate(rows.get(id),s,g,id);return [...rows.values()];}
export function historyIndex(input,scope='both'){
 const seasons=historySeasons(input),teams=new Map(),champions=[];
 for(const s of seasons){const seasonRows=new Map(historyRows(s,scope).map(r=>[r.team.id,r]));const crown=historyChampion(s);if(crown)champions.push(crown);for(const t of s.teams){let c=teams.get(t.id);if(!c){c={...historyRecord(),team:t,seasons:[],titles:0,finals:0,appearances:0,consecutive:0,titleRun:0,titleSeasons:[]};teams.set(t.id,c);}c.team=t;const row=seasonRows.get(t.id);c.seasons.push({...row,season:s});for(const x of row.games)historyAccumulate(c,s,x.game,t.id);if(scope!=='regular'){if((s.seeds||[]).includes(t.id))c.appearances++;const finalIds=s.rounds?.at(-1);if(finalIds?.length===1){const f=s.games.find(g=>g.id===finalIds[0]);if(f&&[f.away,f.home].includes(t.id))c.finals++;}if(crown?.champion===t.id){c.titles++;c.titleSeasons.push(s);}}}
 }
 // A title streak is consecutive decided championships in this state's archive.
 if(scope!=='regular')for(const c of teams.values()){for(const win of champions){c.titleRun=win.champion===c.team.id?c.titleRun+1:0;c.consecutive=Math.max(c.consecutive,c.titleRun);}}
 for(const c of teams.values())c.best=c.seasons.filter(r=>r.season.status==='complete'&&r.gp).sort((a,b)=>b.pct-a.pct||b.w-a.w||b.diff-a.diff||a.season.id.localeCompare(b.season.id))[0]||null;
 return {seasons,teams,champions};
}
function historyRowsForTeam(s,id,scope){const r={...historyRecord(),team:s.teams.find(t=>t.id===id)};for(const g of historyGames(s,scope))if(g.away===id||g.home===id)historyAccumulate(r,s,g,id);return r;}
export function historySeries(input,a,b){const r=historyRecord(),regular=historyRecord(),playoff=historyRecord();for(const s of historySeasons(input))for(const g of historyGames(s))if([g.away,g.home].includes(a)&&[g.away,g.home].includes(b)&&a!==b){historyAccumulate(r,s,g,a);historyAccumulate(g.phase==='regular'?regular:playoff,s,g,a);}const wins=id=>r.games.filter(x=>(id===a?x.points>x.against:x.against>x.points)).sort((x,y)=>Math.abs(y.points-y.against)-Math.abs(x.points-x.against));return {...r,regular,playoff,biggestA:wins(a)[0]||null,biggestB:wins(b)[0]||null};}
export function historyRecords(input,scope='both'){
 const index=historyIndex(input,scope),out=[];
 const add=(key,label,holders,value,low=false)=>{const eligible=holders.filter(x=>Number.isFinite(value(x)));if(!eligible.length){out.push({key,label,value:null,holders:[]});return;}const best=eligible.reduce((n,x)=>low?Math.min(n,value(x)):Math.max(n,value(x)),low?Infinity:-Infinity);out.push({key,label,value:best,holders:eligible.filter(x=>Math.abs(value(x)-best)<1e-9)});};
 const all=[...index.teams.values()],games=all.flatMap(c=>c.games),seasons=all.flatMap(c=>c.seasons.filter(r=>r.season.status==='complete'&&r.gp));
 add('points','Most points by one team',games,x=>x.points);
 add('combined','Highest combined score',games.filter(x=>x.team.id===x.game.away),x=>x.points+x.against);
 add('margin','Largest victory',games.filter(x=>x.kind==='w'),x=>x.points-x.against);
 // Keep each tied maximal run, with its exact start/end and clickable games.
 const runs=[];for(const c of all){let run=[];for(const x of c.games){if(x.kind==='w')run.push(x);else{if(run.length)runs.push({team:run.at(-1).team,season:run.at(-1).season,games:run,value:run.length});run=[];}}if(run.length)runs.push({team:run.at(-1).team,season:run.at(-1).season,games:run,value:run.length});}
 add('streak','Longest winning streak',runs,x=>x.value);
 add('wins','Most wins in a completed season',seasons,x=>x.w);
 add('shutouts','Most shutouts in a completed season',seasons,x=>x.shutouts);
 add('offense','Highest scoring average · completed season',seasons,x=>x.ppg);
 add('defense','Lowest points allowed average · completed season',seasons,x=>x.papg,true);
 if(scope!=='regular'){add('titles','Most championships',all.filter(c=>c.titles),x=>x.titles);add('dynasty','Most consecutive championships',all.filter(c=>c.titles),x=>x.consecutive);}
 return out;
}
