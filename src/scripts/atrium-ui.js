import products from '../data/products.json';
import imagePaths from '../data/image-paths.json';
import { createScenePlayback } from './scene-playback.js';
// Shared schema allows the existing catalogue and inquiry pages to read this shortlist.
const storageKey = 'nicethryun-prototype-v1';
let cart = [], draft = {};
const quantity = value => Math.min(1000000, Math.max(1, Math.floor(Number(value) || 1)));
function restore() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const ids = new Set();
    cart = (Array.isArray(value.cart) ? value.cart : []).filter(item => item && products.some(p => p.id === item.id) && !ids.has(item.id) && ids.add(item.id)).map(item => ({ id: item.id, qty: quantity(item.qty) }));
    draft = value.draft && typeof value.draft === 'object' && !Array.isArray(value.draft) ? value.draft : {};
  } catch { cart = []; draft = {}; }
}
function save() { try { localStorage.setItem(storageKey, JSON.stringify({cart, draft})); return true; } catch { return false; } }
function updateCount() {
  document.querySelectorAll('.a-quote-count').forEach(el => { el.textContent = String(cart.length); });
  document.querySelectorAll('[data-a-quote]').forEach(el => el.setAttribute('aria-label', `Open quote list, ${cart.length} product families`));
}
let toastTimer;
function toast(message) {
  const target = document.getElementById('a-toast'); target.textContent = message; target.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { target.hidden = true; }, 3200);
}
const quoteDialog = document.getElementById('a-quote-dialog');
function commitQuoteQuantities() {
  quoteDialog.querySelectorAll('input[data-a-quantity]').forEach(input => {
    const item = cart.find(entry => entry.id === input.dataset.aQuantity);
    if (!item) return;
    item.qty = quantity(input.value);
    input.value = String(item.qty);
  });
  save();
}
function renderQuote() {
  const container = document.getElementById('a-quote-items'); container.replaceChildren();
  if (!cart.length) { const empty = document.createElement('p'); empty.className = 'a-quote-empty'; empty.textContent = 'Add product families you want to discuss, or continue with a project brief.'; container.append(empty); }
  cart.forEach(item => {
    const product = products.find(p => p.id === item.id);
    const row = document.createElement('article'); row.className = 'a-quote-item';
    const img = document.createElement('img'); img.src = imagePaths[product.image] || `/images/${product.image}`; img.alt = product.name;
    const body = document.createElement('div'), title = document.createElement('h3'), link = document.createElement('a');
    link.href = `/products/${product.id}/`; link.textContent = product.name; title.append(link);
    const label = document.createElement('label'); label.textContent = 'Target quantity';
    const input = document.createElement('input'); input.type = 'number'; input.min = '1'; input.max = '1000000'; input.step = '1'; input.value = String(item.qty); input.dataset.aQuantity = item.id; input.setAttribute('aria-label', `Target quantity for ${product.name}`);
    input.addEventListener('input', () => {
      // Persist complete numbers immediately without rewriting a partially typed value.
      if (input.value === '' || !Number.isInteger(input.valueAsNumber) || input.valueAsNumber < 1) return;
      const current = cart.find(entry => entry.id === input.dataset.aQuantity);
      if (current) { current.qty = quantity(input.value); save(); }
    });
    input.addEventListener('change', commitQuoteQuantities); label.append(input); body.append(title, label);
    const remove = document.createElement('button'); remove.className = 'a-quote-remove'; remove.textContent = 'Remove'; remove.setAttribute('aria-label', `Remove ${product.name}`);
    remove.addEventListener('click', () => { cart = cart.filter(entry => entry.id !== item.id); save(); updateCount(); renderQuote(); }); row.append(img, body, remove); container.append(row);
  });
}
document.querySelectorAll('[data-a-quote]').forEach(button => button.addEventListener('click', () => { restore(); updateCount(); renderQuote(); quoteDialog.showModal(); }));
document.querySelectorAll('[data-a-add]').forEach(button => button.addEventListener('click', () => {
  restore(); const product = products.find(p => p.id === button.dataset.aAdd); if (!product) return;
  if (cart.some(item => item.id === product.id)) { renderQuote(); quoteDialog.showModal(); return; }
  cart.push({id:product.id,qty:100}); const persisted = save(); updateCount(); toast(persisted ? `${product.name} added to quote list` : 'Added for this visit. Browser storage is unavailable.');
}));
document.querySelector('[data-a-close]').addEventListener('click', () => quoteDialog.close());
quoteDialog.addEventListener('close', commitQuoteQuantities);
document.addEventListener('click', event => {
  if (quoteDialog.open && event.target.closest('a[href]')) commitQuoteQuantities();
}, true);
window.addEventListener('pagehide', () => { if (quoteDialog.open) commitQuoteQuantities(); });
quoteDialog.addEventListener('click', event => { if(event.target!==quoteDialog)return; const r=quoteDialog.getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)quoteDialog.close(); });
restore(); updateCount();
window.addEventListener('pageshow', () => { restore(); updateCount(); if(quoteDialog.open)renderQuote(); });
window.addEventListener('storage', event => { if(event.key===storageKey){restore();updateCount();if(quoteDialog.open)renderQuote();} });
const productToggle=document.getElementById('a-products-toggle'), productMenu=document.getElementById('a-product-menu'), mobileToggle=document.getElementById('a-mobile-toggle'), mobileMenu=document.getElementById('a-mobile-menu');
function setMenu(button, menu, open){menu.hidden=!open;button.setAttribute('aria-expanded',String(open));if(button===mobileToggle)button.setAttribute('aria-label',open?'Close navigation':'Open navigation');}
productToggle.addEventListener('click',()=>setMenu(productToggle,productMenu,productMenu.hidden));
mobileToggle.addEventListener('click',()=>{const open=mobileMenu.hidden;setMenu(mobileToggle,mobileMenu,open);mobileToggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');});
document.addEventListener('click',event=>{if(!event.target.closest('.a-dropdown'))setMenu(productToggle,productMenu,false);if(event.target.closest('#a-mobile-menu a'))setMenu(mobileToggle,mobileMenu,false);});
document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(!productMenu.hidden){setMenu(productToggle,productMenu,false);productToggle.focus();}if(!mobileMenu.hidden){setMenu(mobileToggle,mobileMenu,false);mobileToggle.focus();}});
function mountSceneExplorer(){
  const root=document.querySelector('.a-applications'),sceneStage=root?.querySelector('.a-scene-stage');
  const sceneTabs=[...(root?.querySelectorAll('[data-scene]')||[])];
  const controls=root?.querySelector('[data-scene-playback]'),playButton=root?.querySelector('[data-scene-play]');
  if(!sceneStage||!sceneTabs.length||!controls||!playButton)return;
  const sceneMotion=matchMedia('(prefers-reduced-motion: reduce)'),finePointer=matchMedia('(hover: hover) and (pointer: fine)');
  const rail=root.querySelector('.scene-explorer__rail'),fill=root.querySelector('[data-scene-progress]');
  const announcement=root.querySelector('[data-scene-announcement]');
  let renderedIndex=-1,progressAnimation;

  function showScene(index){
    const button=sceneTabs[index];
    sceneTabs.forEach(tab=>{
      const active=tab===button,panel=document.getElementById(tab.getAttribute('aria-controls'));
      tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
      if(panel){panel.hidden=!active;panel.classList.toggle('is-active',active);}
    });
    // Move only the thumbnail rail, never the document or the visitor's focus.
    const card=button.getBoundingClientRect(),bounds=rail.getBoundingClientRect();
    if(card.left<bounds.left||card.right>bounds.right){
      rail.scrollBy({left:card.left-bounds.left-(bounds.width-card.width)/2,behavior:sceneMotion.matches?'auto':'smooth'});
    }
  }

  function renderPlayback(state){
    if(renderedIndex!==state.index){showScene(state.index);renderedIndex=state.index;}
    controls.hidden=false;
    root.dataset.scenePlayback=state.running?'playing':state.wantsPlay?'waiting':'paused';
    root.querySelector('[data-scene-current]').textContent=String(state.index+1).padStart(2,'0');
    root.querySelector('[data-scene-position]').setAttribute('aria-label',`Scene ${state.index+1} of ${state.count}`);
    const action=state.reducedMotion?'Auto-play off':state.wantsPlay?'Pause tour':'Continue tour';
    root.querySelector('[data-scene-play-label]').textContent=action;
    playButton.setAttribute('aria-label',state.reducedMotion?'Scene auto-play is off because reduced motion is enabled':state.wantsPlay?'Pause scene tour':'Continue scene tour');
    playButton.disabled=state.reducedMotion;
    root.querySelector('[data-scene-pause-icon]').toggleAttribute('hidden',!state.wantsPlay);
    root.querySelector('[data-scene-resume-icon]').toggleAttribute('hidden',state.wantsPlay);
    const status=state.reducedMotion?'Choose a scene · Auto-play off':!state.wantsPlay?'Paused · Explore at your pace':!state.inView||!state.pageVisible?'Ready when the scene is in view':state.hovered||state.focused||state.interacting?'Paused while you explore':'Playing · 6 seconds per scene';
    root.querySelector('[data-scene-playback-status]').textContent=status;
    // A single native animation mirrors the state machine's remaining time.
    // No progress interval or second scene timer competes with the countdown.
    progressAnimation?.cancel();
    const progress=1-state.remaining/state.interval;
    fill.style.transform=`scaleX(${progress})`;
    if(state.running&&typeof fill.animate==='function'){
      progressAnimation=fill.animate([{transform:`scaleX(${progress})`},{transform:'scaleX(1)'}],{duration:state.remaining,easing:'linear',fill:'forwards'});
    }
  }

  const playback=createScenePlayback({count:sceneTabs.length,interval:6000,reducedMotion:sceneMotion.matches,onChange:renderPlayback});
  playback.setPageVisible(!document.hidden);
  function choose(index,focus=false){
    playback.select(index);
    const selected=sceneTabs[playback.getState().index];
    if(focus)selected.focus({preventScroll:true});
    announcement.textContent=`Scene ${playback.getState().index+1} of ${sceneTabs.length}: ${selected.getAttribute('aria-label')}. Tour paused.`;
  }
  sceneTabs.forEach((button,index)=>{
    button.addEventListener('click',()=>choose(index));
    button.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowRight')next=index+1;
      if(event.key==='ArrowLeft')next=index-1;
      if(event.key==='Home')next=0;
      if(event.key==='End')next=sceneTabs.length-1;
      if(next!==undefined){event.preventDefault();choose(next,true);}
    });
  });
  playButton.addEventListener('click',()=>{
    if(playback.getState().wantsPlay){playback.pause();announcement.textContent='Scene tour paused.';}
    else{playback.play();announcement.textContent='Scene tour continued.';}
  });
  sceneStage.addEventListener('pointerenter',event=>{
    if(event.pointerType==='mouse'&&finePointer.matches)playback.setHovered(true);
  },{passive:true});
  sceneStage.addEventListener('pointerleave',()=>playback.setHovered(false),{passive:true});
  function updateFocus(){
    playback.setFocused(root.contains(document.activeElement)&&!playButton.contains(document.activeElement));
  }
  root.addEventListener('focusin',updateFocus);
  root.addEventListener('focusout',()=>queueMicrotask(updateFocus));

  let swipeStart;
  function endSwipe(){swipeStart=null;playback.setInteracting(false);}
  sceneStage.addEventListener('pointerdown',event=>{
    endSwipe();
    if(event.isPrimary===false||event.target.closest('a,button,input,select,textarea')||event.button!==0)return;
    swipeStart={x:event.clientX,y:event.clientY,id:event.pointerId};
    playback.setInteracting(true);
  },{passive:true});
  sceneStage.addEventListener('pointerup',event=>{
    if(!swipeStart||swipeStart.id!==event.pointerId)return;
    const dx=event.clientX-swipeStart.x,dy=event.clientY-swipeStart.y;
    if(Math.abs(dx)>=60&&Math.abs(dx)>Math.abs(dy)*1.3)choose(playback.getState().index+(dx<0?1:-1));
    endSwipe();
  },{passive:true});
  sceneStage.addEventListener('pointercancel',endSwipe,{passive:true});
  sceneStage.addEventListener('pointerleave',endSwipe,{passive:true});
  function syncPageVisibility(){
    playback.setPageVisible(!document.hidden);
    if(!document.hidden){playback.setHovered(finePointer.matches&&sceneStage.matches(':hover'));updateFocus();}
  }
  document.addEventListener('visibilitychange',syncPageVisibility);
  window.addEventListener('pagehide',()=>playback.setPageVisible(false));
  window.addEventListener('pageshow',syncPageVisibility);
  sceneMotion.addEventListener('change',event=>playback.setReducedMotion(event.matches));
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{
      playback.setInView(entries[0].isIntersecting&&entries[0].intersectionRatio>=.15);
    },{threshold:[0,.15]}).observe(sceneStage);
  }else{
    const checkView=()=>{const rect=sceneStage.getBoundingClientRect();playback.setInView(rect.bottom>0&&rect.top<innerHeight);};
    window.addEventListener('scroll',checkView,{passive:true});window.addEventListener('resize',checkView,{passive:true});checkView();
  }
}
mountSceneExplorer();
document.querySelectorAll('[data-range-filter]').forEach(button=>{ const family=button.dataset.rangeFilter; if(family!=='all'&&!products.some(product=>product.family===family))button.hidden=true; });
document.querySelectorAll('[data-range-filter]').forEach(button=>button.addEventListener('click',()=>{const filter=button.dataset.rangeFilter;document.querySelectorAll('[data-range-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));document.querySelectorAll('[data-product-family]').forEach(card=>{card.hidden=filter!=='all'&&card.dataset.productFamily!==filter;});}));
const stage=document.getElementById('solar-stage'), hero=document.querySelector('.a-hero');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let scene,sceneFailed=false;
stage.addEventListener('solar-ready',()=>{if(!sceneFailed)stage.classList.add('is-ready');});
function sceneFallback(){sceneFailed=true;scene=null;stage.classList.remove('is-ready');}
stage.addEventListener('solar-error',sceneFallback);
import('./solar-scene.js').then(({mountSolarScene})=>{
  const mounted=mountSolarScene(stage,{mode:'night',motion:!reducedMotion.matches,reducedMotion:reducedMotion.matches});
  if(!mounted||sceneFailed){sceneFallback();return;}
  scene=mounted;
}).catch(sceneFallback);

// The presentation follows the visitor; no demo controls sit in the buying path.
const backdrops=[...document.querySelectorAll('[data-hero-bg]')];
const heroVisual=document.querySelector('.a-hero-visual');
// Map the source product rectangles through cover cropping. Every slide shares
// a fixed logo position: only the photographs move/zoom, never the totem.
function positionHeroSubjects(){
  const width=heroVisual.clientWidth,height=heroVisual.clientHeight;
  if(!width||!height)return;
  const narrow=matchMedia('(max-width: 1000px)').matches;
  const portrait=width<600;

  backdrops.forEach(img=>{
    if(!img.dataset.productBounds)return;
    const [x0,y0,x1,y1]=img.dataset.productBounds.split(',').map(Number);
    const iw=img.naturalWidth||1672,ih=img.naturalHeight||941;
    const scale=Math.max(width/iw,height/ih)*(narrow?1.6:1.35),drawWidth=iw*scale,drawHeight=ih*scale;
    const overflowX=Math.max(0,drawWidth-width),overflowY=Math.max(0,drawHeight-height);
    const subjectWidth=(x1-x0)*drawWidth;
    const targetX=portrait?width*.52:Math.min(width*.94,width-subjectWidth*.5-24);
    const cropX=Math.max(0,Math.min(overflowX,((x0+x1)/2)*drawWidth-targetX));
    const cropY=Math.max(0,Math.min(overflowY,((y0+y1)/2)*drawHeight-height*(portrait?.085:.24)));
    Object.assign(img.style,{width:`${drawWidth}px`,height:`${drawHeight}px`,left:`${-cropX}px`,top:`${-cropY}px`,objectFit:'fill',objectPosition:'0 0'});
    const box=[x0*drawWidth-cropX,y0*drawHeight-cropY,x1*drawWidth-cropX,y1*drawHeight-cropY];
    img.dataset.productScreenBounds=box.map(n=>n.toFixed(1)).join(',');

  });
  stage.dispatchEvent(new CustomEvent('solar-layout-change'));
}
backdrops.forEach(img=>img.addEventListener('load',positionHeroSubjects,{once:true}));
new ResizeObserver(positionHeroSubjects).observe(heroVisual);
positionHeroSubjects();
let activeBackdrop=0,backdropTimer,heroVisible=true;
const backdropInterval=Number(document.querySelector('.a-hero-backdrops').dataset.rotationInterval)||2000;
// A URL-only local review mode lets each crop be checked without adding controls.
const previewBackdrop=backdrops.findIndex(img=>img.dataset.heroBg===new URLSearchParams(location.search).get('preview-scene'));
function showBackdrop(index){
  activeBackdrop=(index+backdrops.length)%backdrops.length;
  const selected=backdrops[activeBackdrop];if(!selected)return;
  backdrops.forEach(img=>img.classList.toggle('is-active',img===selected));
  document.getElementById('a-bg-kind').textContent=selected.dataset.kind;
  document.getElementById('a-bg-caption').textContent=selected.dataset.caption;
}
function restartBackdropRotation(){
  clearInterval(backdropTimer);
  if(previewBackdrop<0&&!reducedMotion.matches&&!document.hidden&&heroVisible&&backdrops.length>1){
    backdropTimer=setInterval(()=>showBackdrop(activeBackdrop+1),backdropInterval);
  }
}
reducedMotion.addEventListener('change',()=>{scene?.setMotion(!reducedMotion.matches);restartBackdropRotation();});
document.addEventListener('visibilitychange',restartBackdropRotation);
if('IntersectionObserver' in window){new IntersectionObserver(entries=>{
  heroVisible=entries[0].isIntersecting;restartBackdropRotation();
},{threshold:0.1}).observe(hero);}
restartBackdropRotation();
if(previewBackdrop>=0)showBackdrop(previewBackdrop);

document.querySelector('[data-whatsapp-preview]')?.addEventListener('click',()=>toast('WhatsApp contact is not connected in this preview.'));
