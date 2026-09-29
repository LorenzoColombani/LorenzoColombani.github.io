const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
/** Keep the last movement through normal finger lift-off, but expire a held drag. */
export function releaseVelocity(samples,now){
  const recent=[];
  for(const p of samples){
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.t)||p.t>now||now-p.t>240)continue;
    const previous=recent.at(-1);
    // Accumulate subpixel coalesced samples; ignore stationary lift-off jitter.
    if(!previous||Math.hypot(p.x-previous.x,p.y-previous.y)>=2)recent.push(p);
  }
  let end=recent.length-1;
  while(end>0&&recent[end].t-recent[end-1].t>=32&&Math.hypot(recent[end].x-recent[end-1].x,recent[end].y-recent[end-1].y)<4)end--;
  if(end<1||now-recent[end].t>=120)return {x:0,y:0};
  const last=recent[end];let begin=end-1;
  while(begin>0&&last.t-recent[begin-1].t<=90)begin--;
  let first=recent[begin],dt=last.t-first.t;
  const tail=recent[end-1],tx=last.x-tail.x,ty=last.y-tail.y;
  // A decisive change of direction overrides the earlier forward movement.
  if(Math.hypot(tx,ty)>=6&&tx*(last.x-first.x)+ty*(last.y-first.y)<0){first=tail;dt=last.t-first.t;}
  return dt>=8?{x:clamp((last.x-first.x)/dt,-4,4),y:clamp((last.y-first.y)/dt,-4,4)}:{x:0,y:0};
}
export function captureIntent({point,start,velocity,target,cancelled=false}){
  if(cancelled||!target||![point?.x,point?.y,start?.x,start?.y,velocity?.x,velocity?.y,target.x,target.y,target.rx,target.ry].every(Number.isFinite))return null;
  const travel=Math.hypot(point.x-start.x,point.y-start.y);
  const dx=target.x-point.x,dy=target.y-point.y,rx=Math.max(64,target.rx),ry=Math.max(64,target.ry);
  if(travel>=24&&(dx/rx)**2+(dy/ry)**2<=1)return 'drop';
  const distance=Math.hypot(dx,dy),speed=Math.hypot(velocity.x,velocity.y);
  if(travel<18||speed<.32||distance<1)return null;
  const alignment=(dx*velocity.x+dy*velocity.y)/(distance*speed);
  // The visitor indicates a destination, not a ballistic trajectory. The
  // staging area catches a short flick inside a broad forward cone.
  if(alignment>.45)return 'flick';
  const sx=(start.x-target.x)/rx,sy=(start.y-target.y)/ry;
  const ux=(point.x-start.x)/rx,uy=(point.y-start.y)/ry;
  const along=clamp(-(sx*ux+sy*uy)/(ux*ux+uy*uy||1),0,1);
  const stillForward=(target.x-start.x)*velocity.x+(target.y-start.y)*velocity.y>0;
  if(stillForward&&along>0&&along<1&&(sx+along*ux)**2+(sy+along*uy)**2<=1)return 'flick';
  return null;
}
export const shouldCapture=gesture=>captureIntent(gesture)!==null;
export function boundedCardPosition(point,bounds){
  return {x:clamp(Number.isFinite(point.x)?point.x:0,bounds.minX,bounds.maxX),y:clamp(Number.isFinite(point.y)?point.y:0,bounds.minY,bounds.maxY)};
}
// Track a full click/tap, not just where it ends: a drag can return to its
// starting point, and a second finger must cancel an outside-tap dismissal.
export function createOutsideTap(threshold = 9) {
  const pointers = new Set();
  let press = null;
  function move(event) {
    if (press?.id === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) >= threshold) press = null;
  }
  return {
    down(event, eligible) {
      const alone = pointers.size === 0;
      pointers.add(event.pointerId);
      press = eligible && alone && event.button === 0 && event.isPrimary !== false
        ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
      return Boolean(press);
    },
    move,
    up(event, eligible) {
      move(event);
      const activate = Boolean(eligible && press?.id === event.pointerId && pointers.size === 1);
      pointers.delete(event.pointerId);
      press = null;
      return activate;
    },
    cancel() { press = null; pointers.clear(); },
  };
}
