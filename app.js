// libs
function loadFromMirrors(urls){return new Promise((res,rej)=>{(function n(i){if(i>=urls.length)return rej();const s=document.createElement('script');s.src=urls[i];s.defer=true;s.onload=()=>res();s.onerror=()=>{s.remove();n(i+1)};document.head.appendChild(s)})(0);});}
(async()=>{try{await loadFromMirrors(['https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js','https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js']);init();}catch(e){alert('تعذّر تحميل مكتبة QR');}})();

const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));

function normalizeURL(s){s=(s||'').trim();if(!s)return'';if(!/^https?:\/\//i.test(s))s='https://'+s;return s;}
function slugFromURL(s){try{const u=new URL(normalizeURL(s));let slug=u.hostname.replace(/^www\./,'').replace(/\./g,'-');const path=u.pathname.replace(/\/+/g,'/').replace(/^\/|\/$/g,'').split('/').filter(Boolean);if(path.length)slug+='-'+path.map(p=>p.replace(/[^a-zA-Z0-9\-_.]/g,'-')).join('-');return (slug||'qr').toLowerCase();}catch{return (s||'qr').replace(/[^a-zA-Z0-9\-_.]/g,'-');}}

function buildMatrix(text,ecc){const qr=qrcode(0,ecc||'M');qr.addData(text);qr.make();const n=qr.getModuleCount();const m=new Array(n);for(let y=0;y<n;y++){m[y]=new Array(n);for(let x=0;x<n;x++)m[y][x]=qr.isDark(y,x);}return m;}
function neighbors(m,x,y){let c=0,n=m.length;[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{const xx=x+dx,yy=y+dy;if(yy>=0&&yy<n&&xx>=0&&xx<n&&m[yy][xx])c++;});return c;}

function drawEyes(n,unit,margin,color,bg,svg){
  const eyes=[[0,0],[n-7,0],[0,n-7]];
  if(svg){let s='';for(const [ex,ey] of eyes){const ox=(ex+margin)*unit,oy=(ey+margin)*unit;const a=7*unit,b=5*unit,c=3*unit;s+=`<rect x="${ox}" y="${oy}" width="${a}" height="${a}" fill="${color}"/>`;s+=`<rect x="${ox+unit}" y="${oy+unit}" width="${b}" height="${b}" fill="${bg}"/>`;s+=`<rect x="${ox+2*unit}" y="${oy+2*unit}" width="${c}" height="${c}" fill="${color}"/>`;}return s;}
  else{ return ctx=>{for(const [ex,ey] of eyes){const ox=(ex+margin)*unit,oy=(ey+margin)*unit;const a=7*unit,b=5*unit,c=3*unit;ctx.fillStyle=color;ctx.fillRect(ox,oy,a,a);ctx.fillStyle=bg;ctx.fillRect(ox+unit,oy+unit,b,b);ctx.fillStyle=color;ctx.fillRect(ox+2*unit,oy+2*unit,c,c);}}}
}

function renderSVG(m,opt){
  const n=m.length, margin=2, px=Math.max(180,Math.min(2000,parseInt(opt.size||520,10)));
  const unit=Math.max(1,Math.floor(px/(n+margin*2))); const dim=unit*(n+margin*2);
  const {fg,bg,eyeColor,style,scale,opacity,withLogo}=opt;
  let content=`<rect width="${dim}" height="${dim}" fill="${bg}"/>`;
  let logoRect=null;
  if(withLogo){const inner=dim-2*margin*unit;const L=inner*0.22;logoRect={x:dim/2-L/2,y:dim/2-L/2,w:L,h:L};}
  for(let y=0;y<n;y++){for(let x=0;x<n;x++){if(!m[y][x])continue;const X=(x+margin)*unit,Y=(y+margin)*unit;
    if(logoRect){const cx=X+unit/2,cy=Y+unit/2;if(cx>logoRect.x&&cx<logoRect.x+logoRect.w&&cy>logoRect.y&&cy<logoRect.y+logoRect.h)continue;}
    if(style==='classic'){content+=`<rect x="${X}" y="${Y}" width="${unit*scale}" height="${unit*scale}" fill="${fg}" opacity="${opacity}"/>`;}
    else if(style==='half'){const r=unit*0.35*scale;content+=`<rect x="${X}" y="${Y}" width="${unit*scale}" height="${unit*scale}" rx="${r}" ry="${r}" fill="${fg}" opacity="${opacity}"/>`;}
    else if(style==='circle'){const r=unit*0.45*scale;content+=`<circle cx="${X+unit/2}" cy="${Y+unit/2}" r="${r}" fill="${fg}" opacity="${opacity}"/>`;}
    else if(style==='circleVar'){const base=0.3, add=0.2*(neighbors(m,x,y)/4);const r=unit*(base+add)*scale;content+=`<circle cx="${X+unit/2}" cy="${Y+unit/2}" r="${r}" fill="${fg}" opacity="${opacity}"/>`;}
  }}
  content+=drawEyes(n,unit,margin,eyeColor,bg,true);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" shape-rendering="geometricPrecision">${content}</svg>`;
}

function renderPNG(m,opt){
  const n=m.length, margin=2, px=Math.max(180,Math.min(2000,parseInt(opt.size||520,10)));
  const unit=Math.max(1,Math.floor(px/(n+margin*2))); const dim=unit*(n+margin*2);
  const {fg,bg,eyeColor,style,scale,opacity,withLogo,logoImage}=opt;
  const c=document.createElement('canvas'); c.width=c.height=dim; const ctx=c.getContext('2d');
  ctx.fillStyle=bg; ctx.fillRect(0,0,dim,dim);
  let logoRect=null;
  if(withLogo && logoImage){const inner=dim-2*margin*unit;const L=inner*0.22;logoRect={x:dim/2-L/2,y:dim/2-L/2,w:L,h:L};}
  ctx.globalAlpha=opacity; ctx.fillStyle=fg;
  for(let y=0;y<n;y++){for(let x=0;x<n;x++){if(!m[y][x])continue;const X=(x+margin)*unit,Y=(y+margin)*unit;
    if(logoRect){const cx=X+unit/2,cy=Y+unit/2;if(cx>logoRect.x&&cx<logoRect.x+logoRect.w&&cy>logoRect.y&&cy<logoRect.y+logoRect.h)continue;}
    if(style==='classic'){ctx.fillRect(X,Y,unit*scale,unit*scale);}
    else if(style==='half'){const r=unit*0.35*scale;roundRect(ctx,X,Y,unit*scale,unit*scale,r,true);}
    else if(style==='circle' || style==='circleVar'){const base=0.45, add=(style==='circleVar')? -0.15+0.2*(neighbors(m,x,y)/4):0;const r=unit*(base+add)*scale;ctx.beginPath();ctx.arc(X+unit/2,Y+unit/2,r,0,Math.PI*2);ctx.fill();}
  }}
  ctx.globalAlpha=1;
  drawEyes(n,unit,margin,eyeColor,bg,false)(ctx);
  if(logoRect && logoImage){const ratio=Math.min(logoRect.w/logoImage.width,logoRect.h/logoImage.height);const w=logoImage.width*ratio,h=logoImage.height*ratio;ctx.drawImage(logoImage,logoRect.x+(logoRect.w-w)/2,logoRect.y+(logoRect.h-h)/2,w,h);}
  return c.toDataURL('image/png',1);
}
function roundRect(ctx,x,y,w,h,r,fill){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);if(fill)ctx.fill();}

function init(){
  // elements
  const url=$('#url'), ecc=$('#ecc'), fg=$('#fg'), bg=$('#bg'), eyeColor=$('#eyeColor'), size=$('#size'), scale=$('#scale'), opacity=$('#opacity'), contentType=$('#contentType');
  const withLogo=$('#withLogo'), logoFile=$('#logoFile'), warn=$('#warn'), preview=$('#preview');
  let style='classic';
  $$('.style').forEach(btn=>btn.onclick=()=>{ $$('.style').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); style=btn.dataset.style; contentType.value=style; update(); });
  contentType.onchange=()=>{ style=contentType.value; $$('.style').forEach(b=>b.classList.toggle('active', b.dataset.style===style)); update(); };
  [url,ecc,fg,bg,eyeColor,size,scale,opacity].forEach(el=> el.oninput=debounce(update,150));
  withLogo.onchange=()=>{ logoFile.classList.toggle('file',!withLogo.checked); if(withLogo.checked && ecc.value==='L') ecc.value='M'; update(); }
  logoFile.onchange=update;
  ecc.onchange=()=>{ warn.hidden=!(withLogo.checked && ecc.value==='L'); };

  function debounce(fn,ms){let t;return ()=>{clearTimeout(t);t=setTimeout(fn,ms);}}
  async function readLogo(){
    return new Promise(r=>{
      if(!withLogo.checked||!logoFile.files||!logoFile.files[0]) return r(null);
      const fr=new FileReader(); fr.onload=()=>{const img=new Image(); img.onload=()=>r(img); img.src=fr.result;}; fr.readAsDataURL(logoFile.files[0]);
    });
  }
  async function update(){
    const text=normalizeURL(url.value); if(!text){ preview.innerHTML=''; return; }
    warn.hidden=!(withLogo.checked && ecc.value==='L');
    const m=buildMatrix(text, ecc.value);
    const opt={size:size.value, fg:fg.value, bg:bg.value, eyeColor:eyeColor.value, style, scale:parseFloat(scale.value), opacity:parseFloat(opacity.value), withLogo:withLogo.checked};
    const svg=renderSVG(m,opt);
    preview.innerHTML=svg;
  }
  async function download(kind){
    const text=normalizeURL(url.value); if(!text) return alert('أدخل رابطًا صحيحًا');
    const m=buildMatrix(text, ecc.value==='L' && withLogo.checked ? 'M' : ecc.value);
    const opt={size:size.value, fg:fg.value, bg:bg.value, eyeColor:eyeColor.value, style, scale:parseFloat(scale.value), opacity:parseFloat(opacity.value), withLogo:withLogo.checked};
    if(kind==='svg'){
      const svg=renderSVG(m,opt);
      const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})); a.download=slugFromURL(text)+'.svg'; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},0);
    }else{
      const logo=await readLogo(); opt.logoImage=logo; const urlData=renderPNG(m,opt); const b=await (await fetch(urlData)).blob();
      const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=slugFromURL(text)+'.png'; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},0);
    }
  }
  $('#btnSvg').onclick=()=>download('svg');
  $('#btnPng').onclick=()=>download('png');

  update();
}
