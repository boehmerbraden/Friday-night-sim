/* Local save cartridge: no account, network, or cloud dependency. */
const FridaySave=(()=>{
 const schema='friday-night-cartridge',version=1;
 const tables={main:['teams','games','graphics'],seasons:['seasons','results','templates','prefs']};
 let memory=null;
 const clone=x=>structuredClone(x);
 function action(database,store,verb,value){
  if(!memory)return null;
  const map=memory[database]?.[store];
  if(!map)throw Error('Unknown saved store');
  if(verb==='getAll')return Promise.resolve([...map.values()].map(clone));
  if(verb==='get')return Promise.resolve(clone(map.get(value)));
  if(verb==='put'){map.set(value.id,clone(value));return Promise.resolve(value.id);}
  if(verb==='delete'){map.delete(value);return Promise.resolve();}
  throw Error('Unsupported storage operation');
 }
 const status=()=>memory?'FILE SESSION — download a save after playing':'BROWSER STORAGE — download regular backups';
 function setStatus(){const el=document.getElementById('save-status');if(el)el.textContent=status();}
 async function snapshot(){
  const data={};
  for(const [name,stores] of Object.entries(tables)){
   data[name]={};
   for(const store of stores){
    try{data[name][store]=await (name==='main'?db(store,'getAll'):seasonDB(store,'getAll'));}
    catch(err){throw Error('Could not read '+name+'/'+store+'. Your existing records may still be in Safari. No incomplete backup was created. '+(err?.message||''));}
   }
  }
  return data;
 }
 function check(file){
  if(!file||file.kind!==schema||file.version!==version||!file.data||typeof file.data!=='object')throw Error('Not a compatible Friday Night full-save file.');
  let count=0;
  for(const [name,stores] of Object.entries(tables))for(const store of stores){
   const list=file.data[name]?.[store];
   if(!Array.isArray(list)||list.length>100000)throw Error('Missing or invalid '+name+'/'+store+' section.');
   const ids=new Set();
   for(const entry of list){
    if(!entry||typeof entry!=='object'||typeof entry.id!=='string'||!entry.id||ids.has(entry.id))throw Error('Invalid or duplicate saved ID in '+store+'.');
    ids.add(entry.id);
   }
   count+=list.length;
  }
  for(const s of file.data.seasons.seasons)if(!Array.isArray(s.teams)||!Array.isArray(s.games))throw Error('Invalid season found in save.');
  for(const t of file.data.main.teams)if(typeof t.name!=='string')throw Error('Invalid team found in save.');
  return count;
 }
 function virtual(data){return Object.fromEntries(Object.entries(tables).map(([name,stores])=>[name,Object.fromEntries(stores.map(store=>[store,new Map(data[name][store].map(row=>[row.id,clone(row)]))]))]));}
 async function writeDB(name,data){
  const dbName=name==='main'?'friday-night-v1':'friday-night-seasons';
  const database=await new Promise((resolve,reject)=>{const r=indexedDB.open(dbName,name==='main'?undefined:1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Database blocked by another tab'));});
  try{
   await new Promise((resolve,reject)=>{
    const stores=tables[name],tx=database.transaction(stores,'readwrite');
    for(const store of stores){
     const target=tx.objectStore(store);target.clear();
     for(const entry of data[name][store])target.put(entry);
    }
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Save import aborted'));
   });
  }finally{database.close();}
 }
 async function downloadSave(){
  const button=document.getElementById('save-download');
  button.disabled=true;
  try{
   const data=await snapshot();
   const payload={kind:schema,version,createdAt:new Date().toISOString(),state:typeof selectedState==='string'?selectedState:'AL',data};
   const raw=JSON.stringify(payload);
   const blob=new Blob([raw],{type:'application/json'}),url=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=url;a.download='Friday-Night-Save-'+new Date().toISOString().slice(0,10)+'.json';
   document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
   announce('Save file created. In Safari choose Save to Files and keep it somewhere safe.');
  }catch(err){announce('SAVE FAILED: '+err.message);}
  finally{button.disabled=false;setStatus();}
 }
 function announce(message){const e=document.getElementById('save-message');if(e)e.textContent=message;if(typeof toast==='function')toast(message);}
 async function loadFile(file){
  if(!file)return;
  if(file.size>120*1024*1024){announce('Save file too large.');return;}
  let parsed;
  try{parsed=JSON.parse(await file.text());const total=check(parsed);
   if(!confirm('Load this saved football universe ('+total+' records)? Existing browser data will be replaced only if storage works. Save a backup first if possible.'))return;
  }catch(err){announce('LOAD FAILED: '+err.message);return;}
  const backup=parsed.data;
  let persisted=false;
  let browserHealthy=false;
  try{await snapshot();browserHealthy=true;}catch{}
  try{
   // Never overwrite an inaccessible Safari database: it may contain recoverable history.
   if(!browserHealthy)throw Error('Existing Safari database is inaccessible; preserved without changes.');
   await writeDB('main',backup);
   await writeDB('seasons',backup);
   memory=null;
   persisted=true;
  }catch(err){
   memory=virtual(backup);
   announce('Safari storage is unavailable. Loaded into this tab only. Download Save before closing! ('+(err?.message||'Storage error')+')');
  }
  setStatus();
  if(persisted){try{localStorage.setItem('friday-night-state',parsed.state||'AL');}catch{}location.reload();}
  else if(typeof window.FridayNightReloadFile==='function')await window.FridayNightReloadFile(parsed.state||'AL');
 }
 async function newSession(){
  if(!confirm('Start a NEW blank file-only universe? Your old Safari data will NOT be deleted, but it will not appear in this new session. Download a save file before leaving this page.'))return;
  const empty=Object.fromEntries(Object.entries(tables).map(([name,stores])=>[name,Object.fromEntries(stores.map(store=>[store,[]]))]));
  memory=virtual(empty);setStatus();
  if(typeof window.FridayNightReloadFile==='function')await window.FridayNightReloadFile('AL');
  announce('Blank file-only game ready. Safari data untouched. Save to Files when you finish playing.');
 }
 function init(){
  const input=document.getElementById('save-file');
  document.getElementById('save-download')?.addEventListener('click',downloadSave);
  document.getElementById('save-new')?.addEventListener('click',newSession);
  document.getElementById('save-load')?.addEventListener('click',()=>input?.click());
  input?.addEventListener('change',async()=>{const file=input.files?.[0];input.value='';await loadFile(file);});
  setStatus();
 }
 return {action,status,init,downloadSave};
})();
window.FridayNightSave=FridaySave;
