/* Friday Night — deterministic, event-sourced football simulation. */
export const ENGINE_VERSION = '1.0.0';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function random(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export const clock=n=>`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
const surnames=['Johnson','Miller','Carter','Williams','Brooks','Reed','Walker','Hayes','Davis','Mitchell','Coleman','Bennett','Foster','Turner','Parker','Jackson','Wright','Ellis','Morgan','Grant'];
export function normalizeTeam(t,i=0){const o=clamp(Number(t.overall)||75,1,99);return {...t,id:t.id||`team-${i}`,name:String(t.name||'High School').slice(0,55),mascot:String(t.mascot||'Wildcats').slice(0,35),overall:o,offense:clamp(Number(t.offense)||o,1,99),defense:clamp(Number(t.defense)||o,1,99),primary:/^#[0-9a-f]{6}$/i.test(t.primary)?t.primary:'#f04452',secondary:/^#[0-9a-f]{6}$/i.test(t.secondary)?t.secondary:'#ffffff',strategy:t.strategy||'balanced',defStrategy:t.defStrategy||'balanced'};}
export function roster(r){const used=new Set();const name=()=>{let n;do{n=surnames[Math.floor(r()*surnames.length)];}while(used.has(n));used.add(n);return n;};return {qb:name(),rb:name(),wr:name(),wr2:name(),def:name(),k:name()};}
export function simulate(input,options={},seed=Date.now()>>>0){
 const teams=input.map(normalizeTeam),r=random(seed),pick=a=>a[Math.floor(r()*a.length)],ri=(a,b)=>Math.floor(a+r()*(b-a+1));
 const config={quarterMinutes:12,homeAdvantage:true,neutral:false,weather:'clear',otStart:10,forceTwoFrom:0,...options};
 config.quarterMinutes=clamp(Number(config.quarterMinutes)||12,1,15);config.otStart=[10,20,25].includes(+config.otStart)?+config.otStart:10;config.forceTwoFrom=Number(config.forceTwoFrom)||0;
 const qsecs=Math.round(config.quarterMinutes*60),players=[roster(r),roster(r)],events=[],score=[0,0];
 const form=[(r()+r()+r()-1.5)*12,(r()+r()+r()-1.5)*12];
 const opening=ri(0,1);let q=1,time=qsecs,off=opening,y=20,down=1,target=30,drive=0,pending='kickoff',kickTo=opening,ot=0,otFirst=0,otSeries=0,done=false,timeouts=[3,3],running=false;
 const fatigue=[0,0];let status='final';
 const snap=()=>({q,time,off,y,down,toGo:target-y,target,score:[...score],drive,ot,timeouts:[...timeouts]});
 const begin=(team,pos)=>{off=team;y=clamp(Math.round(pos),1,99);down=1;target=Math.min(100,y+10);drive++;running=false;};
 const nextOT=()=>{if(otSeries===0){otSeries=1;begin(1-otFirst,100-config.otStart);}else if(score[0]!==score[1])done=true;else {ot++;q=4+ot;otSeries=0;otFirst=1-otFirst;begin(otFirst,100-config.otStart);} };
 const endPossession=(team,pos)=>{if(ot)nextOT();else begin(team,pos);};
 const emit=(before,type,text,data={})=>{const e={id:events.length,before,type,text,team:before.off,yards:0,elapsed:0,points:0,...data};if(e.points)score[e.scoringTeam??e.team]+=e.points;e.after=snap();events.push(e);return e;};
 const tick=(n)=>{const elapsed=ot?0:Math.min(time,n);time-=elapsed;return elapsed;};
 const touchdown=(e,team,defensive=false)=>{e.points=6;e.scoringTeam=team;e.touchdown=true;e.defensive=defensive;score[team]+=6;e.text+=' TOUCHDOWN!';off=team;y=97;down=1;target=100;pending='try';running=false;};
 const finishEvent=e=>{e.after=snap();};
 while(!done && events.length<2200){
  // Tries are untimed, including after a touchdown at 0:00.
  if(pending==='try'){
   pending=null;
   if(ot&&otSeries===1&&score[off]>score[1-off]){done=true;continue;}
   const b=snap(),diff=score[off]-score[1-off];const two=(ot&&config.forceTwoFrom>0&&ot>=config.forceTwoFrom)||(q>=4&&[-2,-5,1,5].includes(diff));
   const good=r()<(two?clamp(.43+(teams[off].offense-teams[1-off].defense)/240,.15,.72):clamp(.76+(teams[off].overall-70)*.004,.4,.94));
   const e=emit(b,two?'twoPoint':'extraPoint',two?`${players[off].qb} attempts two — ${good?'conversion good!':'stopped short.'}`:`${players[off].k}'s extra point is ${good?'GOOD.':'no good.'}`,{points:good?(two?2:1):0,good,player:two?players[off].qb:players[off].k});
   if(ot)nextOT();else{pending='kickoff';kickTo=1-off;}finishEvent(e);continue;
  }
  if(!ot&&time===0){
   const b=snap();running=false;
   if(q===4){if(score[0]!==score[1]){done=true;break;}ot=1;q=5;otFirst=ri(0,1);otSeries=0;pending=null;begin(otFirst,100-config.otStart);emit(b,'period','Regulation ends tied. Overtime: each team receives a possession.',{});continue;}
   q++;time=qsecs;if(q===3){timeouts=[3,3];pending='kickoff';kickTo=1-opening;}emit(b,'period',q===3?'HALFTIME — teams return for the second half.':`Start of quarter ${q}.`);continue;
  }
  if(pending==='kickoff'){
   pending=null;const b=snap(),receiver=kickTo,kicking=1-receiver;const onside=q===4&&time<100&&score[kicking]<score[receiver];
   let text,pos,team=receiver;
   if(onside){const recovered=r()<.13;team=recovered?kicking:receiver;pos=recovered?51:45;text=`Onside kick — recovered by ${teams[team].mascot}.`;}
   else if(r()<.35){pos=20;text='Kickoff reaches the end zone. Touchback; ball at the 20.';}
   else {pos=ri(17,36);text=`Kickoff returned to the ${pos}-yard line.`;}
   const elapsed=tick(onside?2:pos===20?0:ri(5,9));begin(team,pos);emit(b,'kickoff',text,{team:kicking,elapsed});continue;
  }
  const b=snap(),def=1-off,t=teams[off],d=teams[def],p=players[off];
  const advantage=(off===1?1:-1)*(config.homeAdvantage&&!config.neutral?2:0);
  const edge=(t.offense-d.defense+advantage+form[off]-form[def])/140 + (fatigue[def]-fatigue[off])*.00012;
  const wet=config.weather==='rain',wind=config.weather==='wind',snow=config.weather==='snow';
  const diff=score[off]-score[def],urgent=q===4&&time<180&&diff<0;
  // Clock runoff is a separate stored event: no phantom play when time expires.
  if(running&&!ot){
   let runoff=urgent?ri(8,16):ri(22,34);
   if(q===4&&time<110&&diff>0&&timeouts[def]>0){timeouts[def]--;running=false;emit(b,'timeout',`${teams[def].mascot} take a timeout.`,{team:def});continue;}
   if((q===2||q===4)&&time<35&&diff<=0&&timeouts[off]>0){timeouts[off]--;running=false;emit(b,'timeout',`${teams[off].mascot} stop the clock with a timeout.`);continue;}
   const elapsed=tick(runoff);running=false;emit(b,'clock',`${clock(time)} remaining.`,{elapsed});if(time===0)continue;
  }
  const pre=snap();
  // Dead-ball fouls / accepted holding: replay down; penalties do not count as offense.
  if(r()<.065){const defensive=r()<.42,holding=!defensive&&r()<.45;const amount=defensive?Math.min(5,(100-y)/2):Math.min(holding?10:5,y/2);
   y+=defensive?amount:-amount;const first=defensive&&y>=target;if(first){down=1;target=Math.min(100,y+10);}
   emit(pre,'penalty',`${defensive?'Offside, defense':holding?'Holding, offense':'False start, offense'} — ${amount} yards.${first?' First down.':' Replay the down.'}`,{penaltyTeam:defensive?def:off,penaltyYards:amount,firstDown:first});continue;
  }
  const distance=100-y+17,kickChance=clamp(.93-(distance-20)*.023+(t.overall-75)*.002-(wind?.15:0)-(wet||snow?.06:0),.03,.97);
  const lateKick=(q===2||q===4)&&time<=12&&distance<=49&&(q===2||diff>=-3&&diff<=0);
  const mustGo=urgent&&diff<0&&(time<90||diff<-8);
  const go=down===4&&(mustGo||(target-y<=2&&y>44&&r()<.62)||y>68&&distance>45);
  if(lateKick||down===4&&!go&&distance<=48){
   const good=r()<kickChance,elapsed=tick(5);const e=emit(pre,'fieldGoal',`${p.k} from ${distance} yards — ${good?'FIELD GOAL GOOD!':'wide. No good.'}`,{elapsed,good,distance,points:good?3:0,player:p.k});
   if(ot)nextOT();else if(good){pending='kickoff';kickTo=def;}else begin(def,20);running=false;finishEvent(e);continue;
  }
  if(down===4&&!go){const gross=ri(26,46),land=y+gross,pos=land>=100?20:clamp(100-land+ri(0,10),1,99),elapsed=tick(ri(6,10));const e=emit(pre,'punt',`${p.k} punts ${gross} yards. ${land>=100?'Touchback.':`Return leaves ${teams[def].mascot} at their ${pos}.`}`,{elapsed});endPossession(def,pos);finishEvent(e);continue;}
  if(q===4&&diff>0&&time<=Math.max(1,4-down)*35&&timeouts[def]===0&&y>2){const elapsed=tick(2);y--;down++;const e=emit(pre,'kneel',`${p.qb} takes a knee.`,{yards:-1,elapsed,player:p.qb,scrimmage:true});if(down>4)endPossession(def,100-y);else running=true;finishEvent(e);continue;}
  let passChance=t.strategy==='run'?.27:t.strategy==='pass'?.67:.44;
  passChance+=down>=3&&target-y>5?.22:0;passChance+=urgent?.23:0;passChance-=wet||snow?.07:0;passChance-=diff>14&&q===4?.15:0;
  const isPass=r()<clamp(passChance,.12,.9);let type=isPass?'pass':'rush',yards=0,complete=false,turnover=false,sack=false,receiver=pick([p.wr,p.wr,p.wr2,p.rb]);
  const scheme=d.defStrategy==='blitz'?'blitz':d.defStrategy==='run'?'run':d.defStrategy==='pass'?'pass':'balanced';
  const pressure=q===4&&Math.abs(diff)<=8?.015:0;
  if(isPass){
   if(r()<clamp(.065-edge*.035+(scheme==='blitz'?.035:0),.025,.16)){sack=true;type='sack';yards=-ri(2,9);}
   else if(r()<clamp(.032-edge*.025+(wet||snow?.012:0)+pressure/3,.009,.085)){type='interception';turnover=true;yards=0;}
   else if(r()<clamp(.555+edge*.25-(wet?.07:snow?.1:wind?.04:0)-(scheme==='pass'?.04:scheme==='blitz'?-.035:0)-pressure,.25,.83)){complete=true;yards=ri(2,14);if(r()<.14+Math.max(0,edge)*.12)yards+=ri(8,30);}
  }else{const z=r();yards=z<.15?-ri(1,4):z<.32?ri(0,2):ri(3,8);yards+=Math.round(edge*5)+(scheme==='run'?-1:0);if(r()<.055+Math.max(0,edge)*.06)yards+=ri(10,35);}
  yards=clamp(yards,-y,100-y);const oldY=y;y+=yards;
  if(!turnover&&y>0&&y<100&&(type==='rush'||complete||sack)&&r()<(.012+(wet||snow?.012:0))){turnover=true;type='fumble';}
  const elapsed=tick(ri(4,9)),first=!turnover&&y>=target&&y<100;fatigue[def]++;
  const player=isPass?p.qb:p.rb;
  let text=type==='interception'?`${p.qb}'s pass is intercepted by ${players[def].def}!`:sack?`${p.qb} is sacked by ${players[def].def} for ${-yards} yards.`:isPass?(complete?`${p.qb} finds ${receiver} ${pick(['across the middle','on the sideline','on a crossing route'])} for ${yards} yards.`:`${p.qb}'s pass ${pick(['falls incomplete','is broken up','sails out of reach'])}.`):`${p.rb} ${pick(['takes the handoff','cuts through the line','runs off tackle'])} for ${yards} yards.`;
  if(type==='fumble')text+=' FUMBLE! Defense recovers.';if(first)text+=' First down!';
  const e=emit(pre,type,text,{yards,elapsed,scrimmage:true,isPass,complete,sack,turnover,player,receiver,defender:players[def].def,firstDown:first});
  if(turnover){
   // NFHS-style OT ends on defensive possession; regulation supports returns.
   const at=type==='interception'?clamp(oldY+ri(3,24),1,100):y;
   const returned=ot?0:ri(0,18);const pos=at===100?20:clamp(100-at+returned,1,100);e.returnYards=at===100?0:Math.min(returned,at);e.text+=ot?' Possession ends.':at===100?' Touchback.':` Return of ${e.returnYards} yards.`;
   if(!ot&&pos>=100){touchdown(e,def,true);}else endPossession(def,pos);
  }else if(y>=100){touchdown(e,off);}
  else if(y<=0){e.points=2;e.scoringTeam=def;score[def]+=2;e.text+=' SAFETY!';if(ot)nextOT();else {pending='kickoff';kickTo=def;e.text+=' Free kick follows.';}running=false;}
  else if(first){down=1;target=Math.min(100,y+10);running=false;}
  else{down++;if(down>4){e.turnoverOnDowns=true;e.text+=' Turnover on downs!';endPossession(def,100-y);}else running=!(isPass&&!complete)||sack;}
  finishEvent(e);
 }
 if(!done){status='incomplete';throw new Error(`Simulation safety limit reached for seed ${seed}; no result fabricated.`);}
 const game={version:ENGINE_VERSION,seed,teams,players,config,events,score:[...score],status,ot};game.stats=deriveStats(game);return game;
}
export function deriveStats(game,limit=game.events.length){
 const blank=()=>({score:0,passYards:0,rushYards:0,plays:0,firstDowns:0,thirdAttempts:0,thirdMade:0,fourthAttempts:0,fourthMade:0,turnovers:0,penalties:0,penaltyYards:0,possession:0,redTrips:0,redScores:0,players:{}});
 const stats=[blank(),blank()],red=new Set(),scored=new Set();
 const player=(s,n)=>s.players[n]||(s.players[n]={name:n,passAtt:0,passComp:0,passYards:0,passTD:0,ints:0,rushAtt:0,rushYards:0,rushTD:0,rec:0,recYards:0,recTD:0,sacks:0,defInts:0,fgAtt:0,fgMade:0,xpAtt:0,xpMade:0});
 for(const e of game.events.slice(0,limit)){
  const s=stats[e.team],ds=stats[1-e.team],b=e.before,key=`${e.team}-${b.drive}`;
  stats[e.scoringTeam??e.team].score+=e.points;
  if(e.type!=='kickoff')stats[b.off].possession+=e.elapsed;
  if((e.scrimmage||e.type==='fieldGoal'||e.type==='penalty')&&(b.y>=80||e.scrimmage&&b.y+e.yards>=80)&&!red.has(key)){red.add(key);s.redTrips++;}
  if(e.points&&(e.type==='fieldGoal'||e.touchdown&&!e.defensive)&&red.has(key)&&!scored.has(key)){scored.add(key);s.redScores++;}
  if(e.type==='penalty'){stats[e.penaltyTeam].penalties++;stats[e.penaltyTeam].penaltyYards+=e.penaltyYards;}
  if(e.firstDown)s.firstDowns++;
  if(e.scrimmage){s.plays++;const p=player(s,e.player);
   if(e.isPass&&!e.sack){p.passAtt++;if(e.complete){p.passComp++;p.passYards+=e.yards;s.passYards+=e.yards;const rec=player(s,e.receiver);rec.rec++;rec.recYards+=e.yards;if(e.touchdown&&!e.defensive){p.passTD++;rec.recTD++;}}if(e.type==='interception'){p.ints++;player(ds,e.defender).defInts++;}}
   else{p.rushAtt++;p.rushYards+=e.yards;s.rushYards+=e.yards;if(e.touchdown&&!e.defensive)p.rushTD++;}
   if(e.sack)player(ds,e.defender).sacks++;
   if(e.turnover)s.turnovers++;
   if(b.down===3||b.down===4){const k=b.down===3?'third':'fourth';s[k+'Attempts']++;if(e.firstDown||e.touchdown&&!e.defensive)s[k+'Made']++;}
  }
  if(e.type==='fieldGoal'){const p=player(s,e.player);p.fgAtt++;if(e.good)p.fgMade++;}
  if(e.type==='extraPoint'){const p=player(s,e.player);p.xpAtt++;if(e.good)p.xpMade++;}
 }
 for(const s of stats){s.totalYards=s.passYards+s.rushYards;s.ypp=s.plays?s.totalYards/s.plays:0;}
 return stats;
}
export function winProbability(e,teams){const remaining=e.after.q>4?60:(4-e.after.q)*720+e.after.time;const lead=e.after.score[1]-e.after.score[0];return clamp(1/(1+Math.exp(-(lead+(teams[1].overall-teams[0].overall)*.12*Math.min(1,remaining/1440))/(2.5+remaining/270))),.005,.995);}
export function summarize(g){const w=g.score[0]>g.score[1]?0:1,l=1-w;const candidates=g.stats.flatMap((s,i)=>Object.values(s.players).map(p=>({...p,team:i,value:p.passYards*.04+p.rushYards*.1+p.recYards*.1+(p.passTD+p.rushTD+p.recTD)*6+p.defInts*5+p.sacks*2-p.ints*3}))).sort((a,b)=>b.value-a.value);const biggest=g.events.filter(e=>e.scrimmage).sort((a,b)=>((b.touchdown?40:0)+Math.abs(b.yards)+(b.turnover?25:0))-((a.touchdown?40:0)+Math.abs(a.yards)+(a.turnover?25:0)))[0];return {potg:candidates[0],biggest,text:`${g.teams[w].name} defeated ${g.teams[l].name} ${g.score[w]}–${g.score[l]}${g.ot?` in ${g.ot} overtime period${g.ot>1?'s':''}`:''}. ${g.teams[w].mascot} finished with ${g.stats[w].totalYards} offensive yards and ${g.stats[w].firstDowns} first downs. ${g.teams[l].mascot} gained ${g.stats[l].totalYards} yards. The teams combined for ${g.stats[0].turnovers+g.stats[1].turnovers} turnovers.`};}
