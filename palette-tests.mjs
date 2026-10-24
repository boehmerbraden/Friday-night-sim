import assert from 'node:assert/strict';
import {paletteFromPixels} from './graphics.js';
const pixels=(rgb,n)=>Array.from({length:n},()=>rgb).flat();
assert.equal(paletteFromPixels(pixels([200,0,0,0],100)),null,'Transparent pixels ignored');
assert.deepEqual(paletteFromPixels([...pixels([255,255,255,255],80),...pixels([220,30,60,255],20)]),{primary:'#dc1e3c',secondary:'#ffffff'},'White background does not overwhelm team color');
assert.deepEqual(paletteFromPixels(pixels([15,30,100,255],100)),{primary:'#0f1e64',secondary:'#ffffff'},'Solid-color fallback has contrast');
assert.deepEqual(paletteFromPixels([...pixels([0,0,0,255],60),...pixels([255,255,255,255],40)]),{primary:'#000000',secondary:'#ffffff'},'Monochrome logos supported');
assert.deepEqual(paletteFromPixels([...pixels([30,80,200,255],60),...pixels([240,170,20,255],35),...pixels([255,0,255,0],300)]),{primary:'#1e50c8',secondary:'#f0aa14'},'Two team colors extracted without transparent pixels');
console.log('PASS: logo palette tests');
