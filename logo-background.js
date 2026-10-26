import {loadImage,rasterLogo} from './graphics.js';
// Test removable white pixels too: transparent padding must not hide a white box.
export function detectLogoBackground(data,width,height){
 const area=width*height;if(!area)return null;
 let white=0;for(let i=0;i<data.length;i+=4)if(data[i+3]>0&&Math.min(data[i],data[i+1],data[i+2])>=225)white++;
 if(white/area>=.03&&removeLogoBackground(data,width,height,[255,255,255],45).removed/area>=.02)return [255,255,255];
 const border=[];for(let x=0;x<width;x++){border.push(x);if(height>1)border.push((height-1)*width+x);}for(let y=1;y<height-1;y++){border.push(y*width);if(width>1)border.push(y*width+width-1);}
 const visible=border.filter(p=>data[p*4+3]>=200);if(visible.length<border.length*.95)return null;
 const bins=new Map();for(const p of visible){const i=p*4,key=[data[i],data[i+1],data[i+2]].map(v=>Math.floor(v/24)).join(',');const b=bins.get(key)||{count:0,sum:[0,0,0]};b.count++;for(let k=0;k<3;k++)b.sum[k]+=data[i+k];bins.set(key,b);}
 const best=[...bins.values()].sort((a,b)=>b.count-a.count)[0],rgb=best.sum.map(v=>Math.round(v/best.count));const near=visible.filter(p=>Math.hypot(...rgb.map((v,k)=>v-data[p*4+k]))<=45);
 return near.length/visible.length>=.45&&removeLogoBackground(data,width,height,rgb,45).removed/area>=.02?rgb:null;
}
export function removeLogoBackground(data,width,height,rgb,tolerance=30,seed=null){
 const pixels=new Uint8ClampedArray(data),seen=new Uint8Array(width*height),queue=new Int32Array(width*height);let head=0,tail=0,removed=0;
 const add=p=>{if(seen[p])return;seen[p]=1;const i=p*4;if(data[i+3]===0||Math.hypot(data[i]-rgb[0],data[i+1]-rgb[1],data[i+2]-rgb[2])<=tolerance)queue[tail++]=p;};
 for(let x=0;x<width;x++){add(x);add((height-1)*width+x);}for(let y=0;y<height;y++){add(y*width);add(y*width+width-1);}
 if(seed!==null&&seed>=0&&seed<width*height)add(seed);
 while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width);if(pixels[p*4+3])removed++;pixels[p*4+3]=0;if(x>0)add(p-1);if(x<width-1)add(p+1);if(y>0)add(p-width);if(y<height-1)add(p+width);}
 return {pixels,removed};
}
let logoPromptQueue=Promise.resolve();
export async function prepareLogo(file){const src=await rasterLogo(file);return queueLogoBackground(src,false);}
export function editLogoBackground(src){return queueLogoBackground(src,true);}
function queueLogoBackground(src,force){const task=logoPromptQueue.then(()=>askLogoBackground(src,force));logoPromptQueue=task.catch(()=>{});return task;}
async function askLogoBackground(src,force=false){
 const im=await loadImage(src),canvas=document.createElement('canvas');canvas.width=im.width;canvas.height=im.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);const original=ctx.getImageData(0,0,canvas.width,canvas.height);let rgb=detectLogoBackground(original.data,canvas.width,canvas.height),seed=null;if(!rgb&&!force)return src;rgb=rgb||[255,255,255];
 const dialog=document.createElement('dialog');dialog.className='logo-background-dialog';dialog.innerHTML=`<div class="dialog-head"><h2>REMOVE LOGO BACKGROUND?</h2></div><p>Compare the preview. Tap the background in the original image to pick the exact color and area to remove.</p><div class="logo-preview-pair"><div><h3>ORIGINAL</h3><div class="transparency-grid"><img class="original-logo" alt="Original uploaded logo"></div></div><div><h3>TRANSPARENT PREVIEW</h3><div class="transparency-grid"><img class="cutout-logo" alt="Logo with detected background removed"></div></div></div><label>Background color <input class="logo-background-color" type="color"></label><label>Color tolerance <input class="logo-tolerance" type="range" min="8" max="120" value="45"></label><p class="logo-cutout-note help">Matching color connected to the edges or your tapped area is removed. Check that the logo details stay intact.</p><div class="actions"><button class="keep-logo" autofocus>Keep original</button><button class="use-cutout primary">Use transparent logo</button></div>`;
 document.body.append(dialog);dialog.querySelector('.original-logo').src=src;const color=dialog.querySelector('.logo-background-color');const syncColor=()=>color.value='#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('');syncColor();let cutout=src;const update=()=>{const result=removeLogoBackground(original.data,canvas.width,canvas.height,rgb,+dialog.querySelector('.logo-tolerance').value,seed);ctx.putImageData(new ImageData(result.pixels,canvas.width,canvas.height),0,0);cutout=canvas.toDataURL('image/png');dialog.querySelector('.cutout-logo').src=cutout;const empty=result.removed>=canvas.width*canvas.height*.99;dialog.querySelector('.use-cutout').disabled=empty||!result.removed;dialog.querySelector('.logo-cutout-note').textContent=empty?'This would remove almost the entire image. Keep the original or lower the tolerance.':'Matching color connected to the edges or your tapped area is removed. Check that the logo details stay intact.';};color.oninput=()=>{rgb=color.value.slice(1).match(/../g).map(v=>parseInt(v,16));seed=null;update();};dialog.querySelector('.original-logo').onclick=e=>{const box=e.target.getBoundingClientRect(),x=Math.min(canvas.width-1,Math.max(0,Math.floor((e.clientX-box.left)/box.width*canvas.width))),y=Math.min(canvas.height-1,Math.max(0,Math.floor((e.clientY-box.top)/box.height*canvas.height)));seed=y*canvas.width+x;rgb=[...original.data.slice(seed*4,seed*4+3)];syncColor();update();};update();
 return new Promise(resolve=>{let settled=false;const finish=value=>{if(settled)return;settled=true;dialog.close();dialog.remove();resolve(value);};dialog.querySelector('.keep-logo').onclick=()=>finish(src);dialog.querySelector('.use-cutout').onclick=()=>finish(cutout);dialog.querySelector('.logo-tolerance').oninput=update;dialog.addEventListener('cancel',e=>{e.preventDefault();finish(src);});dialog.addEventListener('close',()=>finish(src));dialog.showModal();});
}
