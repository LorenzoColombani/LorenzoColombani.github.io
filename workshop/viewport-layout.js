/** Reflow the content; never scale a desktop grid down into tiny touch targets. */
export function productLayout(width,height){
 const compact=width<700||width/height<.85||height<540;
 const portrait=height>=width,kind=compact?(portrait?'portrait':'landscape'):'desktop';
 const cols=compact?(portrait&&width>=700?3:2):3,rows=compact?(portrait&&height>=720?2:1):2;
 const w=compact?(cols===3?5.1:3.2):5.7,gap=.18,cw=(w-.46-(cols-1)*gap)/cols;
 const ch=compact?cw*600/512:1.6,h=compact?.45+rows*ch+(rows-1)*gap+.15:4;
 return {key:`${kind}:${cols}:${rows}`,kind,compact,portrait,cols,rows,w,h,gap,cw,ch,size:cols*rows};
}

export function productPanelRect(layout,width,height,controlsBottom=layout.portrait?140:64,safeBottom=0){
 const footer=70+Math.max(0,safeBottom),hint=30,margin=12;
 const top=controlsBottom+hint+(layout.portrait?(height<600?96:112):4);
 const availableHeight=Math.max(80,height-footer-top);
 const availableWidth=layout.portrait?Math.min(width-margin*2,layout.cols===3?680:440):Math.min(width*.56,600);
 const scale=Math.min(availableWidth/layout.w,availableHeight/layout.h);
 const w=layout.w*scale,h=layout.h*scale;
 const x=layout.portrait?(width-w)/2:Math.max(margin,(width*.54-w)/2);
 const y=layout.portrait?height-footer-h:top+(availableHeight-h)/2;
 return {x,y,w,h,bottom:y+h};
}

export function containedFrame(width,height,aspect){
 const w=Math.min(width,height*aspect);
 return {width:w,height:w/aspect};
}
