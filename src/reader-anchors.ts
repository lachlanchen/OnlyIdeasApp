export type Annotation={id:string;version:number;operation:string;revision:string;language:string;quote:string;prefix:string;suffix:string;start:number;color:string;note:string;deleted?:boolean;updatedAt?:string}
const excluded='button,script,style,svg,math,mjx-assistive-mml,.reading-language-label,.reading-pair-actions,.source-attribution,[data-reader-tools]'
export function corpus(root:HTMLElement,language:string,sourceLanguage:string){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes:{node:Text;start:number;end:number}[]=[];let text='',node:Node|null
 while((node=walker.nextNode())){const parent=node.parentElement;if(!parent||parent.closest(excluded))continue
  const translation=parent.closest<HTMLElement>('.reading-translation')
  if((translation?.lang||sourceLanguage)!==language)continue
  const value=node.textContent||'';nodes.push({node:node as Text,start:text.length,end:text.length+value.length});text+=value
 }
 return {text,nodes}
}
export function anchorSelection(root:HTMLElement,revision:string,sourceLanguage:string):Annotation|null{
 const selection=window.getSelection();if(!selection?.rangeCount||selection.isCollapsed)return null
 const range=selection.getRangeAt(0);if(!root.contains(range.startContainer)||!root.contains(range.endContainer))return null
 const language=range.startContainer.parentElement?.closest<HTMLElement>('.reading-translation')?.lang||sourceLanguage
 const {nodes,text}=corpus(root,language,sourceLanguage);const first=nodes.find(n=>n.node===range.startContainer),last=nodes.find(n=>n.node===range.endContainer)
 if(!first||!last)return null
 const start=first.start+range.startOffset,end=last.start+range.endOffset,quote=text.slice(start,end)
 if(!quote.trim()||quote.length>4000||(range.endContainer.parentElement?.closest<HTMLElement>('.reading-translation')?.lang||sourceLanguage)!==language)return null
 return {id:crypto.randomUUID(),operation:crypto.randomUUID(),version:0,revision,language,quote,prefix:text.slice(Math.max(0,start-48),start),suffix:text.slice(end,end+48),start,color:'yellow',note:''}
}
export function locate(text:string,a:Pick<Annotation,'quote'|'prefix'|'suffix'|'start'>):number{
 const valid=(at:number)=>at>=0&&text.slice(at,at+a.quote.length)===a.quote&&(!a.prefix||text.slice(Math.max(0,at-a.prefix.length),at)===a.prefix)&&(!a.suffix||text.slice(at+a.quote.length,at+a.quote.length+a.suffix.length)===a.suffix)
 if(valid(a.start))return a.start
 const hits:number[]=[];let at=text.indexOf(a.quote);while(at>=0&&hits.length<2){if(valid(at))hits.push(at);at=text.indexOf(a.quote,at+Math.max(1,a.quote.length))}
 return hits.length===1?hits[0]:-1
}
