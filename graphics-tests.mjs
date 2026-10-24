/* Canvas command contract tests. These do not replace browser visual QA. */
import assert from 'node:assert/strict';
import {renderGraphic} from './graphics.js';
let calls=[];
globalThis.Image=class {constructor(){this.width=320;this.height=200;}set src(value){this.source=value;queueMicrotask(()=>this.onload());}};
globalThis.document={fonts:{ready:Promise.resolve()},createElement(name){assert.equal(name,'canvas');const context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get(target,key){if(key in target)return target[key];return (...args)=>calls.push([key,...args]);},set(target,key,value){target[key]=value;return true;}});return {width:0,height:0,getContext:()=>context,toDataURL:()=>'test-only-canvas-stub'};}};
const g={teams:[{name:'Ashford',mascot:'Ironwolves',primary:'#db4653',secondary:'#ffffff',logo:'original-away-logo'},{name:'Pinecrest',mascot:'Falcons',primary:'#4e95ff',secondary:'#eeeeee',logo:'original-home-logo'}],score:[28,17],ot:0};
for(const [width,height] of [[1080,1080],[1080,1350],[1920,1080]])for(const theme of ['classic','championship','minimal']){
 calls=[];const result=await renderGraphic(g,{width,height,theme});assert.equal(result.canvas.width,width);assert.equal(result.canvas.height,height);
 const text=calls.filter(v=>v[0]==='fillText').map(v=>v[1]);for(const value of ['FINAL','ASHFORD','PINECREST','28','17'])assert.ok(text.includes(value),`Missing ${value}`);
 const images=calls.filter(v=>v[0]==='drawImage');assert.equal(images.length,2);assert.equal(images[0][1].source,g.teams[0].logo);assert.equal(images[1][1].source,g.teams[1].logo);
 assert.equal(text.filter(v=>v==='WINNER').length,1);
}
console.log('PASS: all 9 graphic size/theme contracts preserve scores, names, winner and logo sources. Browser pixels/downloads remain unverified.');
