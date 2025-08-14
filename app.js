function loadFromMirrors(urls){return new Promise((res,rej)=>{
  (function next(i){ if(i>=urls.length){rej(new Error('load fail'));return;}
    const s=document.createElement('script'); s.src=urls[i]; s.defer=true;
    s.onload=()=>res(); s.onerror=()=>{s.remove(); next(i+1)}; document.head.appendChild(s);
  })(0);
});}

(async function boot(){
  try{
    await loadFromMirrors([
      'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
      'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js',
      'https://unpkg.com/qrcode-generator@1.4.4/qrcode.min.js'
    ]);
    init();
  }catch(e){
    alert('تعذّر تحميل مكتبة QR، حاول تحديث الصفحة.');
  }
})();

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function normalizeURL(s){
  s = (s||'').trim();
  if(!s) return '';
  if(!/^https?:\/\//i.test(s)) s = 'https://' + s;
  return s;
}
function slugFromURL(s){
  try{
    const u = new URL(normalizeURL(s));
    let slug = u.hostname.replace(/^www\./,'').replace(/\./g,'-');
    const path = u.pathname.replace(/\/+/g,'/').replace(/^\/|\/$/g,'').split('/').filter(Boolean);
    if(path.length) slug += '-' + path.map(p=>p.replace(/[^a-zA-Z0-9\-_.]/g,'-')).join('-');
    return slug.toLowerCase().replace(/-+/g,'-').slice(0,100) || 'qr';
  }catch{ return s.replace(/[^a-zA-Z0-9\-_.]/g,'-').slice(0,100) || 'qr'; }
}

function buildMatrix(text, ecc){
  const qr = qrcode(0, ecc || 'M');
  qr.addData(text); qr.make();
  const n = qr.getModuleCount();
  const m = new Array(n);
  for(let y=0;y<n;y++){ m[y]=new Array(n); for(let x=0;x<n;x++){ m[y][x] = qr.isDark(y,x); } }
  return m;
}

function drawEyes(n, unit, margin, color, bg, useSVG){
  const eyes = [[0,0],[n-7,0],[0,n-7]];
  if(useSVG){
    let s='';
    for(const [ex,ey] of eyes){
      const ox=(ex+margin)*unit, oy=(ey+margin)*unit;
      const a=7*unit,b=5*unit,c=3*unit;
      s += `<rect x="${ox}" y="${oy}" width="${a}" height="${a}" fill="${color}"/>`;
      s += `<rect x="${ox+unit}" y="${oy+unit}" width="${b}" height="${b}" fill="${bg}"/>`;
      s += `<rect x="${ox+2*unit}" y="${oy+2*unit}" width="${c}" height="${c}" fill="${color}"/>`;
    }
    return s;
  }else{
    return function(ctx){
      for(const [ex,ey] of eyes){
        const ox=(ex+margin)*unit, oy=(ey+margin)*unit;
        const a=7*unit,b=5*unit,c=3*unit;
        ctx.fillStyle=color; ctx.fillRect(ox,oy,a,a);
        ctx.fillStyle=bg; ctx.fillRect(ox+unit,oy+unit,b,b);
        ctx.fillStyle=color; ctx.fillRect(ox+2*unit,oy+2*unit,c,c);
      }
    }
  }
}

function neighborCount(matrix,x,y){
  let c=0, n=matrix.length;
  [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
    const xx=x+dx, yy=y+dy;
    if(yy>=0&&yy<n&&xx>=0&&xx<n && matrix[yy][xx]) c++;
  });
  return c;
}

function drawSVG(matrix, opt){
  const n = matrix.length, margin=2, px = Math.max(180, Math.min(2000, parseInt(opt.size||520,10)));
  const unit = Math.max(1, Math.floor(px / (n + margin*2)));
  const dim = unit * (n + margin*2);
  const {fg,bg,style,withLogo,logoHole} = opt;
  let content = `<rect width="${dim}" height="${dim}" fill="${bg}"/>`;

  let logoRect=null;
  if(withLogo && logoHole){
    const innerDim = dim - 2*margin*unit;
    const L = innerDim*0.22;
    logoRect = {x: dim/2 - L/2, y: dim/2 - L/2, w: L, h: L};
  }

  for(let y=0;y<n;y++){
    for(let x=0;x<n;x++){
      if(!matrix[y][x]) continue;
      const X=(x+margin)*unit, Y=(y+margin)*unit;
      if(logoRect){
        const cx = X + unit/2, cy = Y + unit/2;
        if(cx>logoRect.x && cx<logoRect.x+logoRect.w && cy>logoRect.y && cy<logoRect.y+logoRect.h) continue;
      }
      if(style==='classic'){
        content += `<rect x="${X}" y="${Y}" width="${unit}" height="${unit}" fill="${fg}"/>`;
      }else if(style==='half'){
        const r=unit*0.35;
        content += `<rect x="${X}" y="${Y}" width="${unit}" height="${unit}" rx="${r}" ry="${r}" fill="${fg}"/>`;
      }else if(style==='circle'){
        const r=unit*0.45;
        content += `<circle cx="${X+unit/2}" cy="${Y+unit/2}" r="${r}" fill="${fg}"/>`;
      }else if(style==='circleVar'){
        const base=0.32, add=0.18, r=unit*(base+add*(neighborCount(matrix,x,y)/4));
        content += `<circle cx="${X+unit/2}" cy="${Y+unit/2}" r="${r}" fill="${fg}"/>`;
      }
    }
  }

  content += drawEyes(n,unit,margin,fg,bg,true);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" shape-rendering="geometricPrecision" aria-label="رمز QR">${content}</svg>`;
}

function drawPNG(matrix, opt){
  const n = matrix.length, margin=2, px = Math.max(180, Math.min(2000, parseInt(opt.size||520,10)));
  const unit = Math.max(1, Math.floor(px / (n + margin*2)));
  const dim = unit * (n + margin*2);
  const {fg,bg,style,withLogo,logoImage} = opt;
  const c=document.createElement('canvas'); c.width=c.height=dim; const ctx=c.getContext('2d');
  ctx.fillStyle=bg; ctx.fillRect(0,0,dim,dim);

  let logoRect=null;
  if(withLogo && logoImage){
    const innerDim = dim - 2*margin*unit;
    const L = innerDim*0.22;
    logoRect = {x: dim/2 - L/2, y: dim/2 - L/2, w: L, h: L};
  }

  ctx.fillStyle=fg;
  for(let y=0;y<n;y++){
    for(let x=0;x<n;x++){
      if(!matrix[y][x]) continue;
      const X=(x+margin)*unit, Y=(y+margin)*unit;
      if(logoRect){
        const cx = X + unit/2, cy = Y + unit/2;
        if(cx>logoRect.x && cx<logoRect.x+logoRect.w && cy>logoRect.y && cy<logoRect.y+logoRect.h) continue;
      }
      if(style==='classic'){
        ctx.fillRect(X,Y,unit,unit);
      }else if(style==='half'){
        const r=unit*0.35;
        roundRect(ctx,X,Y,unit,unit,r,true);
      }else if(style==='circle' || style==='circleVar'){
        const base=0.45, add=(style==='circleVar')? -0.13 + 0.18*(neighborCount(matrix,x,y)/4) : 0;
        const r=unit*(base+add);
        ctx.beginPath(); ctx.arc(X+unit/2,Y+unit/2,r,0,Math.PI*2); ctx.fill();
      }
    }
  }

  drawEyes(n,unit,margin,fg,bg,false)(ctx);

  if(logoRect && logoImage){
    const ratio = Math.min(logoRect.w/logoImage.width, logoRect.h/logoImage.height);
    const w = logoImage.width*ratio, h = logoImage.height*ratio;
    ctx.drawImage(logoImage, logoRect.x + (logoRect.w-w)/2, logoRect.y + (logoRect.h-h)/2, w,h);
  }

  return c.toDataURL('image/png', 1.0);
}

function roundRect(ctx,x,y,w,h,r,fill){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  if(fill) ctx.fill();
}

function init(){
  const url = $('#url'), fg = $('#fg'), bg = $('#bg'), ecc = $('#ecc'), size = $('#size');
  const withLogo = $('#withLogo'), logoFile = $('#logoFile');
  const mini = $('#miniPreview'), warn = $('#warn');
  let currentStyle = 'classic';

  $$('.style-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.style-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentStyle = btn.dataset.style;
      trigger();
    });
  });
  document.querySelector('.style-btn[data-style="classic"]').classList.add('active');

  withLogo.addEventListener('change',()=>{
    logoFile.classList.toggle('file', !withLogo.checked);
    if(withLogo.checked && (ecc.value==='L')){ ecc.value='M'; }
    trigger();
  });

  ecc.addEventListener('change',()=>{
    warn.hidden = !(withLogo.checked && (ecc.value==='L'));
  });

  let t=null;
  [url, fg, bg, ecc, size].forEach(el=> el.addEventListener('input', ()=>{
    clearTimeout(t); t=setTimeout(trigger, 200);
  }));
  logoFile.addEventListener('change', trigger);

  async function trigger(){
    const text = normalizeURL(url.value);
    if(!text){ mini.innerHTML=''; return; }
    warn.hidden = !(withLogo.checked && (ecc.value==='L'));
    const m = buildMatrix(text, ecc.value);
    const opt = {size:size.value, fg:fg.value, bg:bg.value, style:currentStyle, withLogo:withLogo.checked, logoHole:true};
    const svg = drawSVG(m, opt);
    mini.innerHTML = svg;
  }

  async function readLogo(){
    return new Promise(resolve=>{
      if(!withLogo.checked || !logoFile.files || !logoFile.files[0]){ resolve(null); return; }
      const f = logoFile.files[0]; const r = new FileReader();
      r.onload = ()=>{ const img=new Image(); img.onload=()=>resolve(img); img.src=r.result; }; r.readAsDataURL(f);
    });
  }
  function downloadBlob(filename, blob){
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=filename;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },0);
  }

  $('#dlSvg').addEventListener('click', ()=>{
    const text = normalizeURL(url.value);
    if(!text){ alert('أدخل رابطاً صالحاً'); return; }
    const m = buildMatrix(text, ecc.value);
    const opt = {size:size.value, fg:fg.value, bg:bg.value, style:currentStyle, withLogo:withLogo.checked, logoHole:true};
    const svg = drawSVG(m, opt);
    downloadBlob(slugFromURL(text)+'.svg', new Blob([svg], {type:'image/svg+xml;charset=utf-8'}));
  });

  $('#dlPng').addEventListener('click', async ()=>{
    const text = normalizeURL(url.value);
    if(!text){ alert('أدخل رابطاً صالحاً'); return; }
    let logoImg = await readLogo();
    const m = buildMatrix(text, (ecc.value==='L' && withLogo.checked)? 'M' : ecc.value);
    const opt = {size:size.value, fg:fg.value, bg:bg.value, style:currentStyle, withLogo:withLogo.checked, logoImage:logoImg};
    const dataURL = drawPNG(m, opt);
    fetch(dataURL).then(r=>r.blob()).then(b=> downloadBlob(slugFromURL(text)+'.png', b));
  });

  trigger();
}
