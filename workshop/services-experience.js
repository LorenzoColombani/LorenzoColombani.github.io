import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from './vendor/CSS3DRenderer.js';

// Verified against the public homepage's #offer and #contact on 2026-09-29.
// See SERVICES-MVP.md for source and delivery boundaries.
export const SERVICE_EMAIL='lorenzo.colombani@live.fr';
export const SERVICE_OFFERS=Object.freeze([
  Object.freeze({id:'build',label:'Build',title:'I build AI tools for your team.',description:'Working software, designed with the people who’ll use it. It takes the repetitive work off their plate; they keep the judgment.'}),
  Object.freeze({id:'train',label:'Train',title:'I train and coach people, and build AI-powered interactive courses.',description:'Live workshops and coaching for your team, plus interactive courses they keep using after I’ve left.'}),
  Object.freeze({id:'retain',label:'Retain',title:'Available on retainer, for a few clients at a time.',description:'You don’t need me to run what I built. Keep me on when you want it to keep getting better: days reserved for you each month, to design, build, and improve.'}),
]);

/** Build a mailto draft only. This never submits or sends a message. */
export function createServiceDraft({service='',name='',brief=''}={}){
  const offer=SERVICE_OFFERS.find(item=>item.id===service);
  const clean=(value,max)=>String(value??'').replace(/\r\n?/g,'\n').trim().slice(0,max);
  const sender=clean(name,80).replace(/\n/g,' '),details=clean(brief,700);
  const subject=offer?`${offer.label} — project enquiry`:'Project enquiry';
  const body=['Hello Lorenzo,',offer?`I’d like to discuss: ${offer.title}`:'I’d like to discuss a project.',details,sender?`From: ${sender}`:''].filter(Boolean).join('\n\n');
  return {subject,body,href:`mailto:${SERVICE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`};
}

/** A small, native contact desk projected into the room. No iframe or backend. */
export function createServicesExperience({scene,camera,canvas,onOpen,onClose}){
  const make=(tag,className,text)=>{const element=document.createElement(tag);if(className)element.className=className;if(text)element.textContent=text;return element;};
  const shell=make('section','services-experience');shell.hidden=true;shell.setAttribute('aria-label','Services');
  const panel=make('section','services-pane');panel.setAttribute('aria-labelledby','services-title');
  const header=make('header','services-header');
  const heading=make('div','services-heading');heading.append(make('span','services-eyebrow','WORK WITH LORENZO'));
  const title=make('h2','','Services');title.id='services-title';heading.append(title);
  const back=make('button','services-back','← Return to the desk');back.type='button';header.append(heading,back);
  const content=make('div','services-content');content.tabIndex=0;content.setAttribute('aria-label','Service offers and optional project brief');
  content.append(make('p','services-intro','Three things you can hire me for.'));
  const offers=make('fieldset','services-offers');offers.append(make('legend','sr-only','Choose a service for your email (optional)'));
  const radios=[];
  SERVICE_OFFERS.forEach((offer,index)=>{
    const card=make('label','services-offer'),radio=make('input');radio.type='radio';radio.name='workshop-service';radio.value=offer.id;radio.setAttribute('aria-label',offer.label);radios.push(radio);
    const caption=make('span','services-offer-label',`${String(index+1).padStart(2,'0')} / ${offer.label}`);
    const cardTitle=make('span','services-offer-title',offer.title),description=make('span','services-offer-description',offer.description);
    card.append(radio,caption,cardTitle,description);offers.append(card);
  });
  content.append(offers,make('p','services-price','Details and price with me, not on this page.'));
  const details=make('details','services-details'),summary=make('summary','','Add a project brief (optional)');details.append(summary);
  const fields=make('div','services-fields'),nameLabel=make('label','','Your name'),name=make('input');name.type='text';name.name='name';name.autocomplete='name';name.maxLength=80;name.id='services-name';nameLabel.htmlFor=name.id;nameLabel.append(name);
  const briefLabel=make('label','','What would you like to build or improve?'),brief=make('textarea');brief.name='brief';brief.id='services-brief';brief.maxLength=700;brief.rows=3;briefLabel.htmlFor=brief.id;briefLabel.append(brief);
  fields.append(nameLabel,briefLabel);details.append(fields,make('p','services-local-note','These details stay in this page until you open the email draft.'));content.append(details);
  const footer=make('footer','services-contact'),contactCopy=make('div','services-contact-copy');
  const draft=make('a','services-draft','Draft email ↗');draft.setAttribute('aria-describedby','services-draft-help');
  const help=make('p','services-draft-help','Opens your email app. Review and send from there.');help.id='services-draft-help';
  const address=make('a','services-email',SERVICE_EMAIL);address.href=`mailto:${SERVICE_EMAIL}`;
  const status=make('p','services-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.hidden=true;
  contactCopy.append(help,address);footer.append(draft,contactCopy,status);panel.append(header,content,footer);
  const cssScene=new THREE.Scene(),cssRenderer=new CSS3DRenderer();cssRenderer.domElement.className='services-css-scene';cssRenderer.domElement.style.overflow='clip';shell.append(cssRenderer.domElement);document.body.append(shell);
  const screen=new CSS3DObject(panel);screen.name='Services / room contact screen';cssScene.add(screen);
  const anchor=new THREE.Vector3(2.58,4.55,6.39),scale=.006;
  screen.position.copy(anchor);screen.scale.setScalar(scale);
  const frame=new THREE.Group();frame.name='Services / optical frame';frame.position.copy(anchor);frame.visible=false;scene.add(frame);
  const geometry=new THREE.PlaneGeometry(1,1),edgeGeometry=new THREE.EdgesGeometry(geometry),edgeMaterial=new THREE.LineBasicMaterial({color:0xb5e7ef,transparent:true,opacity:.28,depthWrite:false});
  const edge=new THREE.LineSegments(edgeGeometry,edgeMaterial);edge.raycast=()=>{};frame.add(edge);
  const focusPosition=new THREE.Vector3(),focusTarget=new THREE.Vector3();
  let active=false,disposed=false,previousFocus=null,viewW=0,viewH=0;
  const updateDraft=()=>{draft.href=createServiceDraft({service:radios.find(radio=>radio.checked)?.value,name:name.value,brief:brief.value}).href;status.hidden=true;};
  for(const input of [...radios,name,brief])input.addEventListener('input',updateDraft);
  draft.addEventListener('click',()=>{updateDraft();status.hidden=false;status.textContent='Send from your email app. If no draft appears, copy the email address above into your email service.';});
  function layout(){
    const width=innerWidth,height=innerHeight;
    if(width!==viewW||height!==viewH){
      viewW=width;viewH=height;
      const top=height<540?82:width<700?156:104,bottom=24;
      const nativeW=Math.min(1040,Math.max(240,width-36)),nativeH=Math.min(720,Math.max(80,height-top-bottom));
      panel.style.width=`${nativeW}px`;panel.style.height=`${nativeH}px`;frame.scale.set(nativeW*scale,nativeH*scale,1);cssRenderer.setSize(width,height);
    }
    const top=viewH<540?82:viewW<700?156:104,bottom=24;
    const centerY=(top+viewH-bottom)/2,tanHalfFov=1/camera.projectionMatrix.elements[5];
    const distance=viewH*scale/(2*tanHalfFov);
    focusTarget.copy(anchor);focusTarget.y+=(centerY-viewH/2)*scale;
    focusPosition.set(anchor.x,focusTarget.y,anchor.z+distance);
  }
  function close({restoreFocus=true,notify=true}={}){
    if(!active)return;active=false;shell.hidden=true;frame.visible=false;document.body.classList.remove('services-open');
    if(notify)onClose?.();
    if(restoreFocus){const target=previousFocus?.isConnected?previousFocus:canvas;target?.focus({preventScroll:true});}
  }
  function open(){
    if(disposed)return false;if(active)return true;
    previousFocus=document.activeElement;active=true;shell.hidden=false;frame.visible=true;document.body.classList.add('services-open');layout();updateDraft();onOpen?.();back.focus({preventScroll:true});return true;
  }
  back.addEventListener('click',()=>close());
  // Capture Escape before the desk handler so one press has one navigation effect.
  const key=event=>{if(active&&event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}};
  addEventListener('keydown',key,true);
  return {
    open,close,get active(){return active;},get ownsScreen(){return false;},
    getFocusPose(){layout();return {position:focusPosition,target:focusTarget};},
    update(){if(!active)return;layout();camera.updateMatrixWorld();cssRenderer.render(cssScene,camera);},
    dispose(){if(disposed)return;close({restoreFocus:false});disposed=true;removeEventListener('keydown',key,true);screen.removeFromParent();frame.removeFromParent();geometry.dispose();edgeGeometry.dispose();edgeMaterial.dispose();shell.remove();},
  };
}
