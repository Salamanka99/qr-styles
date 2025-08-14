// load QR lib
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

const $ = s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));

function normalizeURL(s){
  s=(s||'').trim(); if(!s) return '';
  if(!/^https?:\/\//i.test(s)) s='https://'+s;
  return s;
}
function slugFromURL(s){
  try{ const u=new URL(normalizeURL(s));
    let slug=u.hostname.replace(/^www\./,'').replace(/\./g,'-');
    const path=u.pathname.replace(/\/+/g,'/').replace(/^\/|\/$/g,'').split('/').filter(Boolean);
    if(path.length) slug+='-'+path.map(p=>p.replace(/[^a-zA-Z0-9\-_.]/g,'-')).join('-');
    return slug.toLowerCase().replace(/-+/g,'-').slice(0,100)||'qr';
  }catch{ return s.replace(/[^a-zA-Z0-9\-_.]/g,'-').slice(0,100)||'qr'; }
}

function seedPRNG(seed){
  let h=0;
  for(let i=0;i<seed.length;i++){ h=Math.imul(31,h)+seed.charCodeAt(i)|0; }
  return function(){
    h^=h<<13; h^=h>>>17; h^=h<<5;
    return (h>>>0)/4294967296;
  };
}

function buildMatrix(text,ecc){
  const qr=qrcode(0,ecc||'M'); qr.addData(text); qr.make();
  const n=qr.getModuleCount(); const m=new Array(n);
  for(let y=0;y<n;y++){ m[y]=new Array(n); for(let x=0;x<n;x++){ m[y][x]=qr.isDark(y,x);} }
  return m;
}

function drawEyes(n,unit,margin,fg,bg,useSVG){
  const eyes=[[0,0],[n-7,0],[0,n-7]];
  if(useSVG){
    let s='';
    for(const [ex,ey] of eyes){
      const ox=(ex+margin)*unit, oy=(ey+margin)*unit;
      const outer=3.5*unit, mid=2.5*unit, inner=1.5*unit;
      const cx=ox+outer, cy=oy+outer;
      s+=`<rect x="${ox}" y="${oy}" width="${outer*2}" height="${outer*2}" fill="${bg}"/>`;
      s+=`<circle cx="${cx}" cy="${cy}" r="${outer}" fill="${fg}"/>`;
      s+=`<circle cx="${cx}" cy="${cy}" r="${mid}" fill="${bg}"/>`;
      s+=`<circle cx="${cx}" cy="${cy}" r="${inner}" fill="${fg}"/>`;
    } return s;
  }else{ // canvas
    return function(ctx){
      for(const [ex,ey] of eyes){
        const ox=(ex+margin)*unit, oy=(ey+margin)*unit;
        const outer=3.5*unit, mid=2.5*unit, inner=1.5*unit;
        const cx=ox+outer, cy=oy+outer;
        ctx.fillStyle=bg; ctx.fillRect(ox,oy,outer*2,outer*2);
        ctx.fillStyle=fg; ctx.beginPath(); ctx.arc(cx,cy,outer,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(cx,cy,mid,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=fg; ctx.beginPath(); ctx.arc(cx,cy,inner,0,Math.PI*2); ctx.fill();
      }
    }
  }
}

function neighborCount(matrix,x,y){
  let c=0,n=matrix.length; const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  for(const [dx,dy] of dirs){ const xx=x+dx, yy=y+dy;
    if(yy>=0&&yy<n&&xx>=0&&xx<n && matrix[yy][xx]) c++;
  } return c;
}

function drawSVG(matrix,opt){
  const n=matrix.length, margin=2, px=Math.max(180,Math.min(2000,parseInt(opt.size||520,10)));
  const unit=Math.max(1,Math.floor(px/(n+margin*2)));
  const dim=unit*(n+margin*2);
  const {fg,bg,style,withLogo,logoHole,seed}=opt;
  let content=`<rect width="${dim}" height="${dim}" fill="${bg}"/>`;

  let logoRect=null;
  if(withLogo && logoHole){
    const innerDim=dim-2*margin*unit;
    const L=innerDim*0.22; logoRect={x:dim/2-L/2,y:dim/2-L/2,w:L,h:L};
  }

  const rnd=seedPRNG(seed||'seed');

  for(let y=0;y<n;y++){
    for(let x=0;x<n;x++){
      if(!matrix[y][x]) continue;
      const X=(x+margin)*unit,Y=(y+margin)*unit;
      if(logoRect){
        const cx=X+unit/2, cy=Y+unit/2;
        if(cx>logoRect.x && cx<logoRect.x+logoRect.w && cy>logoRect.y && cy<logoRect.y+logoRect.h) continue;
      }
      if(style==='classic'){
        content+=`<rect x="${X}" y="${Y}" width="${unit}" height="${unit}" fill="${fg}"/>`;
      }else if(style==='half'){
        const w=unit*0.86, h=unit*0.32, rx=h*0.5;
        const hori = ((x+y)&1)===0;
        const cx=X+unit/2, cy=Y+unit/2;
        const x0=cx-(hori?w/2:h/2), y0=cy-(hori?h/2:w/2), W=hori?w:h, H=hori?h:w;
        content+=`<rect x="${x0}" y="${y0}" width="${W}" height="${H}" rx="${rx}" ry="${rx}" fill="${fg}"/>`;
      }else if(style==='circle'){
        const r=unit*0.4;
        content+=`<circle cx="${X+unit/2}" cy="${Y+unit/2}" r="${r}" fill="${fg}"/>`;
      }else if(style==='circleVar'){
        const r=unit*(0.28 + rnd()*0.22);
        content+=`<circle cx="${X+unit/2}" cy="${Y+unit/2}" r="${r}" fill="${fg}"/>`;
      }
    }
  }
  content += drawEyes(n,unit,margin,fg,bg,true);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" aria-label="رمز QR">${content}</svg>`;
}

function drawPNG(matrix,opt){
  const n=matrix.length, margin=2, px=Math.max(180,Math.min(2000,parseInt(opt.size||520,10)));
  const unit=Math.max(1,Math.floor(px/(n+margin*2)));
  const dim=unit*(n+margin*2);
  const {fg,bg,style,withLogo,logoImage,seed}=opt;
  const c=document.createElement('canvas'); c.width=c.height=dim; const ctx=c.getContext('2d');
  ctx.fillStyle=bg; ctx.fillRect(0,0,dim,dim);

  let logoRect=null;
  if(withLogo && logoImage){
    const innerDim=dim-2*margin*unit;
    const L=innerDim*0.22; logoRect={x:dim/2-L/2,y:dim/2-L/2,w:L,h:L};
  }

  const rnd=seedPRNG(seed||'seed');

  ctx.fillStyle=fg;
  for(let y=0;y<n;y++){
    for(let x=0;x<n;x++){
      if(!matrix[y][x]) continue;
      const X=(x+margin)*unit, Y=(y+margin)*unit;
      if(logoRect){
        const cx=X+unit/2, cy=Y+unit/2;
        if(cx>logoRect.x && cx<logoRect.x+logoRect.w && cy>logoRect.y && cy<logoRect.y+logoRect.h) continue;
      }
      if(style==='classic'){
        ctx.fillRect(X,Y,unit,unit);
      }else if(style==='half'){
        const w=unit*0.86, h=unit*0.32, rx=h*0.5;
        const hori = ((x+y)&1)===0;
        const cx=X+unit/2, cy=Y+unit/2;
        roundRect(ctx, cx-(hori?w/2:h/2), cy-(hori?h/2:w/2), hori?w:h, hori?h:w, rx, true);
      }else if(style==='circle'){
        const r=unit*0.4; ctx.beginPath(); ctx.arc(X+unit/2,Y+unit/2,r,0,Math.PI*2); ctx.fill();
      }else if(style==='circleVar'){
        const r=unit*(0.28 + rnd()*0.22); ctx.beginPath(); ctx.arc(X+unit/2,Y+unit/2,r,0,Math.PI*2); ctx.fill();
      }
    }
  }

  drawEyes(n,unit,margin,fg,bg,false)(ctx);

  if(logoRect && logoImage){
    const ratio=Math.min(logoRect.w/logoImage.width, logoRect.h/logoImage.height);
    const w=logoImage.width*ratio, h=logoImage.height*ratio;
    ctx.drawImage(logoImage, logoRect.x+(logoRect.w-w)/2, logoRect.y+(logoRect.h-h)/2, w,h);
  }

  return c.toDataURL('image/png', 1.0);
}

function roundRect(ctx,x,y,w,h,r,fill){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  if(fill) ctx.fill();
}

// UI
function init(){
  const url=$('#url'), fg=$('#fg'), bg=$('#bg'), ecc=$('#ecc'), size=$('#size');
  const withLogo=$('#withLogo'), logoFile=$('#logoFile');
  const mini=$('#miniPreview'), warn=$('#warn');
  let currentStyle='classic';

  $$('.style-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      $$('.style-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentStyle=btn.dataset.style;
      trigger();
    });
  });
  document.querySelector('.style-btn[data-style="classic"]').classList.add('active');

  withLogo.addEventListener('change',()=>{
    logoFile.classList.toggle('file', !withLogo.checked);
    if(withLogo.checked && ecc.value==='L'){ ecc.value='M'; }
    trigger();
  });
  ecc.addEventListener('change',()=>{
    warn.hidden = !(withLogo.checked && (ecc.value==='L'));
  });

  let t=null;
  [url, fg, bg, ecc, size].forEach(el=> el.addEventListener('input', ()=>{ clearTimeout(t); t=setTimeout(trigger,150); }));
  logoFile.addEventListener('change', trigger);

  async function trigger(){
    const text=normalizeURL(url.value); if(!text){ mini.innerHTML=''; return; }
    warn.hidden=!(withLogo.checked && (ecc.value==='L'));
    const m=buildMatrix(text, ecc.value);
    const svg=drawSVG(m,{size:size.value, fg:fg.value, bg:bg.value, style:currentStyle, withLogo:withLogo.checked, logoHole:true, seed:text});
    mini.innerHTML=svg;
  }

  function readLogo(){
    return new Promise(resolve=>{
      if(!withLogo.checked || !logoFile.files || !logoFile.files[0]){ resolve(null); return; }
      const f=logoFile.files[0]; const r=new FileReader();
      r.onload=()=>{ const img=new Image(); img.onload=()=>resolve(img); img.src=r.result; }; r.readAsDataURL(f);
    });
  }

  function downloadBlob(name,blob){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},0); }

  $('#dlSvg').addEventListener('click',()=>{
    const text=normalizeURL(url.value); if(!text){ alert('أدخل رابطاً صالحاً'); return; }
    const m=buildMatrix(text, ecc.value);
    const svg=drawSVG(m,{size:size.value, fg:fg.value, bg:bg.value, style:currentStyle, withLogo:withLogo.checked, logoHole:true, seed:text});
    downloadBlob(slugFromURL(text)+'.svg', new Blob([svg], {type:'image/svg+xml;charset=utf-8'}));
  });

  $('#dlPng').addEventListener('click', async ()=>{
    const text=normalizeURL(url.value); if(!text){ alert('أدخل رابطاً صالحاً'); return; }
    const logo=await readLogo();
    const m=buildMatrix(text, (ecc.value==='L' && withLogo.checked)? 'M' : ecc.value);
    const dataURL=drawPNG(m,{size:size.value, fg:fg.value, bg:bg.value, style:currentStyle, withLogo:withLogo.checked, logoImage:logo, seed:text});
    const b = await (await fetch(dataURL)).blob();
    downloadBlob(slugFromURL(text)+'.png', b);
  });

  trigger();
}
