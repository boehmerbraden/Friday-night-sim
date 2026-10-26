import assert from 'node:assert/strict';
import {detectLogoBackground,removeLogoBackground} from './logo-background.js';
const w=9,h=9,pixels=new Uint8ClampedArray(w*h*4);for(let p=0;p<w*h;p++)pixels.set([255,255,255,255],p*4);
for(let y=2;y<7;y++)for(let x=2;x<7;x++)pixels.set([200,30,40,255],(y*w+x)*4);pixels.set([255,255,255,255],(4*w+4)*4);
assert.deepEqual(detectLogoBackground(pixels,w,h),[255,255,255]);const cut=removeLogoBackground(pixels,w,h,[255,255,255]);assert.equal(cut.removed,56);assert.equal(cut.pixels[3],0);assert.equal(cut.pixels[(4*w+4)*4+3],255,'Enclosed white detail survives');assert.equal(pixels[3],255,'Original unchanged');
const transparent=new Uint8ClampedArray(pixels);for(let x=0;x<w;x++)transparent[x*4+3]=0;assert.deepEqual(detectLogoBackground(transparent,w,h),[255,255,255],'White background with transparent edge is detected');assert.equal(detectLogoBackground(cut.pixels,w,h),null,'White enclosed logo detail is not a background');
const colored=new Uint8ClampedArray(pixels);for(let p=0;p<w*h;p++)if(pixels[p*4]===255)colored.set([20,160,90,255],p*4);assert.deepEqual(detectLogoBackground(colored,w,h),[20,160,90]);assert.equal(removeLogoBackground(colored,w,h,[20,160,90]).removed,56);
console.log('PASS: solid backgrounds, transparency detection, flood fill, interior details, original preservation');
