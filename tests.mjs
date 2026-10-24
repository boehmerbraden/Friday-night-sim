import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {simulate,deriveStats} from './engine.js';
const groups=[{ratings:[75,75],neutral:true},{ratings:[60,95]},{ratings:[95,60]},{ratings:[70,85]},{ratings:[1,99]},{ratings:[99,1]}];
const report={games:0,assertions:0,groups:[],events:{},overtimeGames:0,maximumScore:0};
const check=(condition,message)=>{report.assertions++;assert.ok(condition,message);};
const equal=(a,b,msg)=>{report.assertions++;assert.deepEqual(a,b,msg);};
function verify(g){
 const runningScore=[0,0],yards=[0,0],passes=[0,0],rushes=[0,0],turnovers=[0,0],plays=[0,0],penalties=[0,0],penYards=[0,0];
 check(g.status==='final','Game finishes');check(g.events.length<2200,'Bounded simulation');check(g.score[0]!==g.score[1],'No unresolved ties');
 for(const [i,e] of g.events.entries()){
  report.events[e.type]=(report.events[e.type]||0)+1;
  equal(e.before.score,runningScore,'Pre-play score matches ledger');if(i)equal(e.before,g.events[i-1].after,'Snapshots form an unbroken replay chain');
  check(e.before.time>=0&&e.after.time>=0,'Nonnegative clock');check(e.before.down>=1&&e.before.down<=4,'Legal pre-play down');check(e.after.y>=0&&e.after.y<=100,'Field bounds');
  check(e.elapsed>=0,'Elapsed time nonnegative');check([0,1,2,3,6].includes(e.points),'Valid scoring denomination');
  if(e.points){check(e.points===6?e.touchdown:e.points===3?e.type==='fieldGoal':e.points===1?e.type==='extraPoint':e.type==='twoPoint'||e.before.y+e.yards===0,'Points originate in legal event');runningScore[e.scoringTeam??e.team]+=e.points;}
  equal(e.after.score,runningScore,'Post-play score matches ledger');
  if(e.scrimmage){plays[e.team]++;yards[e.team]+=e.yards;if(e.isPass&&!e.sack){if(e.complete)passes[e.team]+=e.yards;}else rushes[e.team]+=e.yards;check(e.before.y+e.yards>=0&&e.before.y+e.yards<=100,'Offensive gain fits field');}
  if(e.turnover)turnovers[e.team]++;
  if(e.type==='penalty'){penalties[e.penaltyTeam]++;penYards[e.penaltyTeam]+=e.penaltyYards;}
  if(e.before.ot){check(e.elapsed===0&&e.before.time===0,'Untimed overtime');if(e.turnover)check(e.returnYards===0,'OT turnover is dead immediately');}
  if(e.turnoverOnDowns){check(e.before.down===4&&!e.firstDown&&!e.touchdown,'Fourth-down failure');}
  if(e.firstDown&&e.type!=='penalty'){check(e.before.y+e.yards>=e.before.target,'First down reaches target');}
  if(e.type==='extraPoint'||e.type==='twoPoint'){check(g.events[i-1].touchdown,'Try follows a touchdown');}
 }
 equal(runningScore,g.score,'Final score ledger');equal(g.stats,deriveStats(g),'Stored box score replays exactly');
 g.stats.forEach((s,i)=>{equal(s.score,g.score[i],'Stats agree with score');equal(s.totalYards,yards[i],'Yards sum from plays');equal(s.passYards,passes[i],'Passing yard ledger');equal(s.rushYards,rushes[i],'Rushing yard ledger');equal(s.plays,plays[i],'Play count');equal(s.turnovers,turnovers[i],'Turnovers');equal(s.penalties,penalties[i],'Penalty count');equal(s.penaltyYards,penYards[i],'Penalty yards');const players=Object.values(s.players);equal(players.reduce((a,p)=>a+p.passYards,0),s.passYards,'QB yards reconcile');equal(players.reduce((a,p)=>a+p.recYards,0),s.passYards,'Receiving yards reconcile');equal(players.reduce((a,p)=>a+p.rushYards,0),s.rushYards,'Player rushing reconciles');equal(players.reduce((a,p)=>a+p.rec,0),players.reduce((a,p)=>a+p.passComp,0),'Catches equal completions');check(s.redScores<=s.redTrips,'Red zone numerator bounded');check(s.thirdMade<=s.thirdAttempts&&s.fourthMade<=s.fourthAttempts,'Conversion denominators');});
 // Every completed OT round gives each side exactly one offensive series.
 if(g.ot){report.overtimeGames++;for(let q=5;q<5+g.ot;q++){const offensive=g.events.filter(e=>e.before.q===q&&(e.scrimmage||e.type==='fieldGoal'));const teams=new Set(offensive.map(e=>e.team));check(teams.size===2,'Both teams receive OT series');for(let t=0;t<2;t++){const first=offensive.find(e=>e.team===t);check(first.before.y===100-g.config.otStart||g.events.some(e=>e.type==='penalty'&&e.before.q===q&&e.before.off===t),'OT starts at selected yard line');}}}
 report.maximumScore=Math.max(report.maximumScore,...g.score);report.games++;
}
for(const [gi,group] of groups.entries()){
 let wins=0,total=[0,0],yards=[0,0],shutouts=0;const count=gi<4?1000:200;
 for(let seed=1;seed<=count;seed++){
  const teams=group.ratings.map((overall,i)=>({id:`t${i}`,name:i?'Home':'Away',overall,strategy:seed%3===0?'run':seed%3===1?'pass':'balanced',defStrategy:['balanced','run','pass','blitz'][seed%4]}));
  const config={neutral:!!group.neutral,weather:['clear','clear','rain','wind','snow'][seed%5],otStart:[10,20,25][seed%3],forceTwoFrom:seed%2?0:3};
  const g=simulate(teams,config,seed);verify(g);wins+=g.score[1]>g.score[0];total=total.map((v,i)=>v+g.score[i]);yards=yards.map((v,i)=>v+g.stats[i].totalYards);shutouts+=g.score.includes(0);
  if(seed<=10)equal(simulate(teams,config,seed),g,'Seeded replay bit-for-bit deterministic');
 }
 const homeWinRate=wins/count;report.groups.push({ratings:group.ratings,neutral:!!group.neutral,games:count,homeWinRate,averageScore:total.map(v=>+(v/count).toFixed(2)),averageYards:yards.map(v=>+(v/count).toFixed(2)),shutouts});
 if(gi===0)check(homeWinRate>.42&&homeWinRate<.58,'Even neutral matchup approximately symmetric');
 if(gi===1)check(homeWinRate>.85&&homeWinRate<1,'95-rated home favorite usually wins, with upsets');
 if(gi===2)check(homeWinRate>0&&homeWinRate<.15,'95-rated away favorite usually wins, with upsets');
}
for(const kind of ['rush','pass','sack','interception','fumble','penalty','fieldGoal','extraPoint','twoPoint','punt','timeout','kneel'])check(report.events[kind]>0,`${kind} exercised`);
await writeFile(new URL('test-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
