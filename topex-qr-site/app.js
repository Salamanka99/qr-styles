// --- CDN loader with fallbacks (no integrity to avoid blocks) ---
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
    await loadFromMirrors([
      'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
      'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
      'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js'
    ]);
    initUI();
  }catch(e){
    alert('تعذّر تحميل المكتبات. أعد التحديث.');
  }
})();

// --- Helpers ---
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
    return slug.toLowerCase().replace(/-+/g,'-').slice(0,80) || 'qr';
  }catch{ return s.replace(/[^a-zA-Z0-9\-_.]/g,'-').slice(0,80) || 'qr'; }
}

// Build matrix using qrcode-generator
function buildMatrix(text, ecc){
  const qr = qrcode(0, ecc || 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const m = new Array(n);
  for(let y=0;y<n;y++){ m[y]=new Array(n); for(let x=0;x<n;x++){ m[y][x]=qr.isDark(y,x);} }
  return m;
}

// Style renderers
function drawEyes(n, unit, margin, type, color, bg){
  const eyes = [[0,0],[n-7,0],[0,n-7]];
  let s='';
  for(const [ex,ey] of eyes){
    const ox=(ex+margin)*unit, oy=(ey+margin)*unit;
    if(type==='circle'){
      const outer=3.5*unit, mid=2.5*unit, inner=1.5*unit;
      const cx=ox+outer, cy=oy+outer;
      s += `<circle cx="${cx}" cy="${cy}" r="${outer}" fill="${color}"/>`;
      s += `<circle cx="${cx}" cy="${cy}" r="${mid}" fill="${bg}"/>`;
      s += `<circle cx="${cx}" cy="${cy}" r="${inner}" fill="${color}"/>`;
    }else{ // square/rounded
      const a=7*unit,b=5*unit,c=3*unit, rx = (type==='rounded') ? unit*1.1 : 0;
      s += `<rect x="${ox}" y="${oy}" width="${a}" height="${a}" rx="${rx}" ry="${rx}" fill="${color}"/>`;
      s += `<rect x="${ox+unit}" y="${oy+unit}" width="${b}" height="${b}" rx="${rx}" ry="${rx}" fill="${bg}"/>`;
      s += `<rect x="${ox+2*unit}" y="${oy+2*unit}" width="${c}" height="${c}" rx="${rx}" ry="${rx}" fill="${color}"/>`;
    }
  }
  return s;
}

function drawSVG(matrix, opt){
  const n = matrix.length, margin=2, px = Math.max(180, Math.min(2000, parseInt(opt.size||520,10)));
  const unit = Math.max(1, Math.floor(px / (n + margin*2)));
  const dim = unit * (n + margin*2);
  const {fg,bg,style,eyes,eyeColor,logoDataURL} = opt;
  let content = `<rect width="${dim}" height="${dim}" fill="${bg}"/>`;

  // Helper for variable radius
  function neighborCount(x,y){
    let c=0;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
      const xx=x+dx, yy=y+dy;
      if(yy>=0&&yy<n&&xx>=0&&xx<n && matrix[yy][xx]) c++;
    });
    return c;
  }

  for(let y=0;y<n;y++){
    for(let x=0;x<n;x++){
      if(!matrix[y][x]) continue;
      const X=(x+margin)*unit, Y=(y+margin)*unit;
      if(style==='classic'){
        content += `<rect x="${X}" y="${Y}" width="${unit}" height="${unit}" fill="${fg}"/>`;
      }else if(style==='half'){
        const r=unit*0.35;
        content += `<rect x="${X}" y="${Y}" width="${unit}" height="${unit}" rx="${r}" ry="${r}" fill="${fg}"/>`;
      }else if(style==='circle'){
        const r=unit*0.45;
        content += `<circle cx="${X+unit/2}" cy="${Y+unit/2}" r="${r}" fill="${fg}"/>`;
      }else if(style==='circleVar'){
        const base=0.32, add=0.18, r=unit*(base+add*(neighborCount(x,y)/4));
        content += `<circle cx="${X+unit/2}" cy="${Y+unit/2}" r="${r}" fill="${fg}"/>`;
      }
    }
  }

  content += drawEyes(n,unit,margin,eyes,eyeColor,bg);

  if(logoDataURL){
    const innerDim = dim - 2*margin*unit;
    const logoSize = innerDim*0.22; // 22%
    const cx = dim/2 - logoSize/2, cy = dim/2 - logoSize/2;
    content += `<rect x="${cx-6}" y="${cy-6}" width="${logoSize+12}" height="${logoSize+12}" rx="${unit*0.8}" fill="${bg}" opacity="0.9"/>`;
    content += `<image href="${logoDataURL}" x="${cx}" y="${cy}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" shape-rendering="geometricPrecision" aria-label="QR code">${content}</svg>`;
}

function drawPNG(matrix, opt){
  const n = matrix.length, margin=2, px = Math.max(180, Math.min(2000, parseInt(opt.size||520,10)));
  const unit = Math.max(1, Math.floor(px / (n + margin*2)));
  const dim = unit * (n + margin*2);
  const {fg,bg,style,eyes,eyeColor,logoImage} = opt;
  const c=document.createElement('canvas'); c.width=c.height=dim; const ctx=c.getContext('2d');
  ctx.fillStyle=bg; ctx.fillRect(0,0,dim,dim);

  function neighborCount(x,y){
    let c=0;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
      const xx=x+dx, yy=y+dy;
      if(yy>=0&&yy<n&&xx>=0&&xx<n && matrix[yy][xx]) c++;
    });
    return c;
  }

  ctx.fillStyle=fg;
  for(let y=0;y<n;y++){
    for(let x=0;x<n;x++){
      if(!matrix[y][x]) continue;
      const X=(x+margin)*unit, Y=(y+margin)*unit;
      if(style==='classic'){
        ctx.fillRect(X,Y,unit,unit);
      }else if(style==='half'){
        const r=unit*0.35;
        roundRect(ctx,X,Y,unit,unit,r,true);
      }else if(style==='circle' || style==='circleVar'){
        const base=0.45, add=(style==='circleVar')? -0.13 + 0.18*(neighborCount(x,y)/4) : 0;
        const r=unit*(base+add);
        ctx.beginPath(); ctx.arc(X+unit/2,Y+unit/2,r,0,Math.PI*2); ctx.fill();
      }
    }
  }

  // Eyes
  const eyeCoords=[[0,0],[n-7,0],[0,n-7]];
  eyeCoords.forEach(([ex,ey])=>{
    const ox=(ex+margin)*unit, oy=(ey+margin)*unit;
    if(eyes==='circle'){
      const outer=3.5*unit, mid=2.5*unit, inner=1.5*unit;
      ctx.fillStyle=eyeColor; ctx.beginPath(); ctx.arc(ox+outer,oy+outer,outer,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(ox+outer,oy+outer,mid,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=eyeColor; ctx.beginPath(); ctx.arc(ox+outer,oy+outer,inner,0,Math.PI*2); ctx.fill();
    }else{
      const a=7*unit,b=5*unit,c=3*unit, rx=(eyes==='rounded')? unit*1.1 : 0;
      ctx.fillStyle=eyeColor; roundRect(ctx,ox,oy,a,a,rx,true);
      ctx.fillStyle=bg; roundRect(ctx,ox+unit,oy+unit,b,b,rx,true);
      ctx.fillStyle=eyeColor; roundRect(ctx,ox+2*unit,oy+2*unit,c,c,rx,true);
    }
  });

  if(logoImage){
    const innerDim = dim - 2*margin*unit;
    const size = innerDim*0.22;
    const cx = dim/2 - size/2, cy = dim/2 - size/2;
    ctx.fillStyle=bg; roundRect(ctx,cx-6,cy-6,size+12,size+12,unit*0.8,true);
    const ratio = Math.min(size/logoImage.width, size/logoImage.height);
    const w = logoImage.width*ratio, h = logoImage.height*ratio;
    ctx.drawImage(logoImage, cx+(size-w)/2, cy+(size-h)/2, w,h);
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

// --- UI ---
function initUI(){
  // Tabs
  $$('.tab').forEach(btn=>btn.addEventListener('click',()=>{
    $$('.tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const id = btn.dataset.tab;
    $('#tab-single').classList.toggle('hidden', id!=='single');
    $('#tab-batch').classList.toggle('hidden', id!=='batch');
  }));

  // Single preview & downloads
  const state = {
    url: $('#url'), style: $('#style'), eyes: $('#eyes'), ecc: $('#ecc'), size: $('#size'),
    fg: $('#fg'), eyeColor: $('#eyeColor'), bg: $('#bg'),
    withLogo: $('#withLogo'), logoFile: $('#logoFile'),
  };

  // Expose file input when checkbox on click
  state.withLogo.addEventListener('change',()=> state.logoFile.classList.toggle('file', !state.withLogo.checked));

  function readLogoData(){
    return new Promise(resolve=>{
      if(!state.withLogo.checked || !state.logoFile.files || !state.logoFile.files[0]){ resolve({dataURL:null,img:null}); return; }
      const file = state.logoFile.files[0];
      const reader = new FileReader();
      reader.onload = ()=>{
        const dataURL = reader.result;
        const img = new Image();
        img.onload = ()=> resolve({dataURL, img});
        img.src = dataURL;
      };
      reader.readAsDataURL(file);
    });
  }

  async function generateOne(returnType){ // returnType: 'svg' | 'png'
    const text = normalizeURL(state.url.value);
    if(!text){ alert('أدخل رابطاً صالحاً'); return; }
    const ecc = (state.withLogo.checked && state.ecc.value!=='H') ? 'H' : state.ecc.value;
    const m = buildMatrix(text, ecc);
    const {dataURL, img} = await readLogoData();
    const opt = {
      size: state.size.value, fg: state.fg.value, bg: state.bg.value,
      style: state.style.value, eyes: state.eyes.value, eyeColor: state.eyeColor.value,
      logoDataURL: dataURL, logoImage: img
    };
    let data, filename = slugFromURL(text) + (returnType==='svg'?'.svg':'.png');
    if(returnType==='svg'){
      const svg = drawSVG(m, opt);
      $('#previewSingle').innerHTML = svg;
      data = new Blob([svg], {type:'image/svg+xml;charset=utf-8'});
    }else{
      const url = drawPNG(m, opt);
      $('#previewSingle').innerHTML = `<img src="${url}" alt="معاينة رمز QR" style="max-width:100%;height:auto">`;
      data = await (await fetch(url)).blob();
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(data);
    a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },0);
  }

  $('#previewOne').addEventListener('click', async ()=>{
    const text = normalizeURL(state.url.value);
    if(!text){ alert('أدخل رابطاً صالحاً'); return; }
    const ecc = (state.withLogo.checked && state.ecc.value!=='H') ? 'H' : state.ecc.value;
    const m = buildMatrix(text, ecc);
    const {dataURL, img} = await readLogoData();
    const opt = {
      size: state.size.value, fg: state.fg.value, bg: state.bg.value,
      style: state.style.value, eyes: state.eyes.value, eyeColor: state.eyeColor.value,
      logoDataURL: dataURL, logoImage: img
    };
    const svg = drawSVG(m, opt);
    $('#previewSingle').innerHTML = svg;
  });
  $('#downloadSvgOne').addEventListener('click', ()=> generateOne('svg'));
  $('#downloadPngOne').addEventListener('click', ()=> generateOne('png'));

  // Batch
  const b = {
    urls: $('#urls'), style: $('#styleB'), eyes: $('#eyesB'), ecc: $('#eccB'), size: $('#sizeB'),
    fg: $('#fgB'), eyeColor: $('#eyeColorB'), bg: $('#bgB'),
    withLogo: $('#withLogoB'), logoFile: $('#logoFileB'), bar: $('#bar'),
    previewBox: $('#previewBatch')
  };
  b.withLogo.addEventListener('change',()=> b.logoFile.classList.toggle('file', !b.withLogo.checked));

  async function readBatchLogo(){
    return new Promise(resolve=>{
      if(!b.withLogo.checked || !b.logoFile.files || !b.logoFile.files[0]){ resolve({dataURL:null,img:null}); return; }
      const file = b.logoFile.files[0];
      const reader = new FileReader();
      reader.onload = ()=>{
        const dataURL = reader.result;
        const img = new Image(); img.onload = ()=> resolve({dataURL, img}); img.src = dataURL;
      };
      reader.readAsDataURL(file);
    });
  }

  function lines(input){
    const set = new Set();
    return input.split(/\r?\n/).map(v=>v.trim()).filter(v=>v && !set.has(v) && set.add(v));
  }

  async function batchZip(ext){ // 'svg' | 'png'
    const list = lines(b.urls.value);
    if(!list.length){ alert('أضف رابطاً واحداً على الأقل'); return; }
    const zip = new JSZip();
    const {dataURL, img} = await readBatchLogo();
    b.bar.style.width = '0%';
    const eccBase = (b.withLogo.checked && b.ecc.value!=='H') ? 'H' : b.ecc.value;

    // Preview first
    try{
      const m0 = buildMatrix(normalizeURL(list[0]), eccBase);
      const svg0 = drawSVG(m0, {size:b.size.value, fg:b.fg.value, bg:b.bg.value, style:b.style.value, eyes:b.eyes.value, eyeColor:b.eyeColor.value, logoDataURL:dataURL});
      b.previewBox.innerHTML = svg0;
    }catch{}

    const used = new Set();
    for(let i=0;i<list.length;i++){
      const url = normalizeURL(list[i]);
      const m = buildMatrix(url, eccBase);
      const opt = {size:b.size.value, fg:b.fg.value, bg:b.bg.value, style:b.style.value, eyes:b.eyes.value, eyeColor:b.eyeColor.value, logoDataURL:dataURL, logoImage:img};
      let filename = slugFromURL(url);
      while(used.has(filename)) filename += '-x';
      used.add(filename);
      if(ext==='svg'){
        const svg = drawSVG(m, opt);
        zip.file(filename + '.svg', svg);
      }else{
        const dataURLpng = drawPNG(m, opt);
        const bin = await (await fetch(dataURLpng)).blob();
        zip.file(filename + '.png', bin);
      }
      b.bar.style.width = ((i+1)/list.length*100).toFixed(1)+'%';
      await new Promise(r=>setTimeout(r,0));
    }
    const blob = await zip.generateAsync({type:'blob'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'qr-batch-' + new Date().toISOString().slice(0,19).replace(/[:T]/g,'-') + '.zip';
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },0);
  }

  $('#batchZipSvg').addEventListener('click', ()=> batchZip('svg'));
  $('#batchZipPng').addEventListener('click', ()=> batchZip('png'));
}
