export function loadImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Could not decode this logo.'));im.src=src;});}
export async function rasterLogo(file){if(file.size>8*1024*1024)throw new Error('Please use a logo smaller than 8 MB.');if(!/image\/(png|jpeg|svg\+xml)/.test(file.type))throw new Error('Choose a PNG, JPG, or SVG logo.');const url=URL.createObjectURL(file);try{const im=await loadImage(url);const c=document.createElement('canvas');const scale=Math.min(1,800/Math.max(im.naturalWidth,im.naturalHeight));c.width=Math.max(1,Math.round(im.naturalWidth*scale));c.height=Math.max(1,Math.round(im.naturalHeight*scale));c.getContext('2d').drawImage(im,0,0,c.width,c.height);return c.toDataURL('image/png');}finally{URL.revokeObjectURL(url);}}
export async function renderGraphic(game,{width=1080,height=1080,theme='classic'}={}){
 const c=document.createElement('canvas');c.width=width;c.height=height;const x=c.getContext('2d'),w=width,h=height,s=Math.min(w,h)/1080;
 await document.fonts.ready;const images=await Promise.all(game.teams.map(t=>t.logo?loadImage(t.logo):null));
 const grad=x.createLinearGradient(0,0,w,h);grad.addColorStop(0,theme==='minimal'?'#e8eae4':'#09131d');grad.addColorStop(1,theme==='minimal'?'#ffffff':'#04080e');x.fillStyle=grad;x.fillRect(0,0,w,h);
 if(theme!=='minimal'){
  for(let i=0;i<2;i++){const g=x.createRadialGradient(i*w,h*.48,10,i*w,h*.48,w*.8);g.addColorStop(0,game.teams[i].primary+'88');g.addColorStop(1,game.teams[i].primary+'00');x.fillStyle=g;x.fillRect(0,0,w,h);}
  // Deterministic stadium architecture, floodlights and translucent fog bands.
  x.fillStyle='#071019';x.beginPath();x.moveTo(0,h*.72);x.lineTo(w*.2,h*.61);x.lineTo(w*.8,h*.61);x.lineTo(w,h*.72);x.lineTo(w,h);x.lineTo(0,h);x.fill();
  for(let j=0;j<8;j++){x.strokeStyle='#b0b9c51a';x.lineWidth=2*s;x.beginPath();x.moveTo(0,h*(.74+j*.023));x.lineTo(w,h*(.74+j*.023));x.stroke();}
  for(let k=0;k<2;k++){const px=w*(k?.9:.1);x.strokeStyle='#9fb4c1';x.lineWidth=4*s;x.beginPath();x.moveTo(px,h*.08);x.lineTo(px,h*.31);x.stroke();for(let j=0;j<5;j++){const lx=px+(j-2)*18*s;x.shadowColor='#eafaff';x.shadowBlur=28*s;x.fillStyle='#eeffff';x.fillRect(lx,h*.08,12*s,7*s);}x.shadowBlur=0;const glow=x.createRadialGradient(px,h*.09,0,px,h*.09,h*.45);glow.addColorStop(0,'#c8e9ff30');glow.addColorStop(1,'#c8e9ff00');x.fillStyle=glow;x.fillRect(0,0,w,h);}
  for(let j=0;j<3;j++){const fog=x.createRadialGradient(w*(.2+j*.3),h*.8,10,w*(.2+j*.3),h*.8,w*.4);fog.addColorStop(0,'#d8e1e410');fog.addColorStop(1,'#ffffff00');x.fillStyle=fog;x.fillRect(0,0,w,h);}
 }
 const ink=theme==='minimal'?'#10202c':'#f4f5ef',accent=theme==='championship'?'#e8cb77':theme==='minimal'?'#40503c':'#c7f563';
 const text=(str,px,py,size,color=ink,weight=800,max=w*.9)=>{x.fillStyle=color;x.textAlign='center';x.textBaseline='middle';x.font=`${weight} ${size*s}px "Barlow Condensed", Impact, sans-serif`;x.fillText(String(str),px,py,max);};
 text('FRIDAY NIGHT  /  HIGH SCHOOL FOOTBALL',w/2,h*.065,20,theme==='minimal'?'#6e7a7b':'#b4c3cb',600);
 text('FINAL',w/2,h*.177,118,accent,900);
 text(game.ot?`${game.ot} OVERTIME${game.ot>1?'S':''}`:'UNDER THE LIGHTS',w/2,h*.259,19,theme==='minimal'?'#697373':'#c9d1d5',600);
 const winner=game.score[0]>game.score[1]?0:1;
 for(let i=0;i<2;i++){
  const cx=w*(i?.74:.26),t=game.teams[i],logoSize=Math.min(w*.19,h*.18),ly=h*.385;
  if(images[i]){const im=images[i],ratio=Math.min(logoSize/im.width,logoSize/im.height);x.drawImage(im,cx-im.width*ratio/2,ly-im.height*ratio/2,im.width*ratio,im.height*ratio);}
  else{x.fillStyle=t.primary;x.beginPath();x.moveTo(cx-logoSize*.4,ly-logoSize*.5);x.lineTo(cx+logoSize*.4,ly-logoSize*.5);x.lineTo(cx+logoSize*.4,ly+logoSize*.22);x.lineTo(cx,ly+logoSize*.5);x.lineTo(cx-logoSize*.4,ly+logoSize*.22);x.closePath();x.fill();text(t.name.split(' ').map(v=>v[0]).join('').slice(0,3),cx,ly,72,'#fff');}
  text(t.name.toUpperCase(),cx,h*.515,39,ink,800,w*.42);
  text(t.mascot.toUpperCase(),cx,h*.558,22,theme==='minimal'?'#657277':'#a6b8c3',600,w*.42);
  text(game.score[i],cx,h*.70,w/h>1.5?205:225,ink,900);
  x.fillStyle=t.primary;x.fillRect(cx-w*.16,h*.83,w*.32,5*s);x.fillStyle=t.secondary;x.fillRect(cx-w*.16,h*.83+6*s,w*.32,2*s);
  if(i===winner){text('WINNER',cx,h*.88,21,accent,700);}else{text(i===0?'AWAY':'HOME',cx,h*.88,18,theme==='minimal'?'#657277':'#a6b8c3',600);}
 }
 x.strokeStyle=theme==='minimal'?'#10202c22':'#ffffff22';x.lineWidth=2*s;x.beginPath();x.moveTo(w*.5,h*.33);x.lineTo(w*.5,h*.84);x.stroke();
 text('YOUR RIVALRIES. YOUR MOMENT.',w*.5,h*.955,18,theme==='minimal'?'#657277':'#8b9ca8',600);
 return {canvas:c,url:c.toDataURL('image/png')};
}

// Quantized colors are averaged from visible logo pixels, not guessed from team names.
export function paletteFromPixels(pixels){
 const bins=new Map();let total=0;
 for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<180)continue;const rgb=[pixels[i],pixels[i+1],pixels[i+2]],key=rgb.map(v=>Math.floor(v/24)).join(',');const b=bins.get(key)||{n:0,sum:[0,0,0]};b.n++;rgb.forEach((v,j)=>b.sum[j]+=v);bins.set(key,b);total++;}
 if(!total)return null;
 const colors=[...bins.values()].map(b=>({n:b.n,rgb:b.sum.map(v=>Math.round(v/b.n))})).sort((a,b)=>b.n-a.n);
 const chromatic=colors.filter(c=>Math.max(...c.rgb)-Math.min(...c.rgb)>45&&c.n/total>=.025);
 const primary=chromatic[0]||colors[0];const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
 const second=colors.find(c=>c.n/total>=.015&&distance(c.rgb,primary.rgb)>75);
 const hex=rgb=>'#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('');
 const luminance=primary.rgb[0]*.299+primary.rgb[1]*.587+primary.rgb[2]*.114;
 return {primary:hex(primary.rgb),secondary:second?hex(second.rgb):luminance>145?'#111111':'#ffffff'};
}
export async function extractLogoColors(src){const im=await loadImage(src),c=document.createElement('canvas');const scale=96/Math.max(im.width,im.height);c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0,c.width,c.height);return paletteFromPixels(ctx.getImageData(0,0,c.width,c.height).data);}
