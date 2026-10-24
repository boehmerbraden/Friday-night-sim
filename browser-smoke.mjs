import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const server=spawn('python3',['-m','http.server','8080'],{cwd:new URL('.',import.meta.url),stdio:'ignore'});
let browser;
try{
 for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:8080')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 await mkdir('browser-results',{recursive:true});
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8080');await page.waitForSelector('#scoreboard .score');
 await page.screenshot({path:'browser-results/desktop.png',fullPage:true});
 await page.click('#edit-matchup');await page.fill('#name-0','Hamilton Mill');await page.fill('#mascot-0','Wolves');await page.fill('#overall-0','92');await page.fill('#seed','166');
 await page.setInputFiles('#logo-0',{name:'wolf.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" rx="40" fill="#df4351"/><path d="M30 45L65 155L100 80L135 155L170 45" stroke="white" fill="none" stroke-width="18"/></svg>')});
 await page.waitForSelector('#team-forms img');assert.equal(await page.inputValue('#primary-0'),'#df4351','Logo primary color extracted');assert.equal(await page.inputValue('#secondary-0'),'#ffffff','Logo secondary color extracted');await page.click('#save-team-0');await page.getByRole('status').filter({hasText:'Team saved.'}).waitFor();
 await page.click('#setup-start');await page.waitForFunction(()=>window.FridayNight.getCursor()>0);await page.click('#start');
 const paused=await page.evaluate(()=>FridayNight.getCursor());await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>FridayNight.getCursor()),paused,'Pause holds cursor');
 await page.click('#start');await page.waitForFunction(n=>FridayNight.getCursor()>n,paused);await page.click('#finish');await page.waitForSelector('#postgame-banner:not(.hidden)');
 const game=await page.evaluate(()=>FridayNight.getGame());assert.equal(game.teams[0].name,'Hamilton Mill');assert.equal(game.teams[0].overall,92);assert.match(game.teams[0].logo,/^data:image\/png/);
 assert.deepEqual(await page.locator('#scoreboard .score').allTextContents(),game.score.map(String));
 await page.screenshot({path:'browser-results/final.png',fullPage:true});
 await page.click('#full-log');await page.selectOption('#type-filter','score');assert.ok(await page.locator('#all-drives details').count());await page.locator('#all-drives details').first().evaluate(e=>e.open=true);assert.ok(await page.locator('#all-drives .play-row.scoring').count());
 await page.locator('header [data-view="gamecast"]').click();await page.click('#box-score');await page.waitForSelector('#stats-content table');assert.ok((await page.locator('#recap').textContent()).includes('Hamilton Mill'));
 await page.locator('header [data-view="gamecast"]').click();await page.click('#open-graphic');
 const variants=[];
 for(const size of ['1080,1080','1080,1350','1920,1080'])for(const theme of ['classic','championship','minimal']){
  await page.selectOption('#graphic-size',size);await page.selectOption('#graphic-theme',theme);
  await page.waitForFunction(()=>!document.getElementById('download-graphic').disabled);
  await page.waitForFunction(expected=>{const im=document.getElementById('graphic-preview');return im.complete&&[im.naturalWidth,im.naturalHeight].join(',')===expected;},size);
  const downloadPromise=page.waitForEvent('download');await page.click('#download-graphic');const dl=await downloadPromise;assert.equal(await dl.failure(),null);
  await dl.saveAs(`browser-results/${theme}-${size.replace(',','x')}.png`);variants.push({size,theme});
 }
 await page.click('#close-graphic');await page.reload();await page.locator('[data-view="history"]').click();assert.equal(await page.locator('[data-load]').count(),0,'No unfiltered wall of games');await page.selectOption('#history-team','ashford');await page.waitForSelector('[data-load]');await page.locator('[data-load]').first().click();
 const loaded=await page.evaluate(()=>FridayNight.getGame());assert.deepEqual(loaded.events,game.events,'Saved game retains exact events');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'browser-results/mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No mobile horizontal overflow');
 await page.click('#edit-matchup');await page.screenshot({path:'browser-results/mobile-setup.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Setup fits mobile');
 await page.selectOption('#saved-0','ashford');assert.equal(await page.inputValue('#name-0'),'Hamilton Mill','Saved edited team reloads');

 // Blank forms must not block selecting, uploading, saving or deleting another team.
 const homeName=await page.inputValue('#name-1');await page.click('#clear-team-0');
 for(const id of ['name-0','mascot-0','overall-0','offense-0','defense-0'])assert.equal(await page.inputValue('#'+id),'',id+' cleared');
 assert.equal(await page.inputValue('#name-1'),homeName,'Other side preserved');assert.equal(await page.locator('#team-forms img').count(),0,'Logo cleared');
 await page.selectOption('#saved-0','ashford');assert.equal(await page.inputValue('#name-0'),'Hamilton Mill');
 await page.fill('#primary-0','#123456');await page.click('#extract-colors-0');await page.waitForFunction(()=>document.getElementById('primary-0').value==='#df4351');
 await page.click('#clear-team-1');await page.fill('#name-0','Hamilton Mill');await page.click('#save-team-0');await page.getByRole('status').filter({hasText:'Team saved.'}).waitFor();
 await page.selectOption('#saved-1','pinecrest');await page.click('#clear-team-0');
 await page.fill('#name-0','Riverdale');await page.fill('#mascot-0','Raiders');await page.fill('#overall-0','78');await page.click('#save-team-0');await page.getByRole('status').filter({hasText:'Team saved.'}).waitFor();
 const newId=await page.inputValue('#saved-0');assert.notEqual(newId,'ashford','New team has independent identity');
 await page.locator('header [data-view="gamecast"]').click();await page.click('[data-speed="instant"]');await page.click('#edit-matchup');await page.click('#setup-start');await page.waitForSelector('#postgame-banner:not(.hidden)');
 await page.locator('[data-view="history"]').click();await page.selectOption('#history-team',newId);assert.equal(await page.locator('[data-load]').count(),1,'Only selected team games shown');assert.ok((await page.locator('.record-summary').textContent()).includes('Riverdale'));
 await page.screenshot({path:'browser-results/team-records-mobile.png',fullPage:true});
 await page.selectOption('#history-team','ashford');assert.equal(await page.locator('[data-load]').count(),1,'Other team history isolated');
 await page.locator('header [data-view="setup"]').click();await page.selectOption('#saved-0','ashford');
 page.once('dialog',d=>d.dismiss());await page.click('#delete-team-0');assert.ok(await page.locator('#saved-0 option[value="ashford"]').count(),'Cancel preserves saved team');
 page.once('dialog',d=>d.accept());await page.click('#delete-team-0');await page.getByRole('status').filter({hasText:'Team deleted.'}).waitFor();
 assert.equal(await page.locator('#saved-0 option[value="ashford"]').count(),0,'Team removed');
 await page.reload();await page.locator('[data-view="history"]').click();await page.selectOption('#history-team','ashford');assert.ok((await page.locator('.record-summary').textContent()).includes('Archived team'));await page.locator('[data-load]').first().click();assert.deepEqual((await page.evaluate(()=>FridayNight.getGame())).events,game.events,'Deletion preserves historical events');
 await page.locator('header [data-view="setup"]').click();assert.equal(await page.locator('#saved-0 option[value="ashford"]').count(),0,'Deleted team stays deleted after reload');
 await page.screenshot({path:'browser-results/team-controls-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'New controls fit mobile');
 assert.deepEqual(errors,[],'No browser JS errors');
 const report={status:'passed',seed:game.seed,score:game.score,eventCount:game.events.length,uploadedSvg:true,pauseResume:true,persistentHistory:true,logoPreserved:true,graphicVariants:variants,mobileWidths:[390],teamHistoryFiltering:true,clearFields:true,deleteAndArchive:true,autoLogoColors:true,errors};await writeFile('browser-results/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(e){console.error(e);process.exitCode=1;}finally{await browser?.close();server.kill();}
