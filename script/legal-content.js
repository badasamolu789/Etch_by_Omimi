/* One rendering path for the legal editor preview and public documents. */
(()=>{
'use strict';
window.EtchLegalContent={render(target,source){
 if(!window.marked||!window.DOMPurify)throw new Error('Formatting tools could not load. Reload this page.');
 const html=marked.parse(String(source||'').replace(/^\uFEFF/,''),{gfm:true,breaks:true});
 target.innerHTML=DOMPurify.sanitize(html,{
  ALLOWED_TAGS:['h1','h2','h3','h4','h5','h6','p','br','hr','strong','b','em','i','u','s','del','a','ul','ol','li','blockquote','pre','code','table','thead','tbody','tfoot','tr','th','td','caption','section','article','div','span','dl','dt','dd','sup','sub'],
  ALLOWED_ATTR:['href','title','colspan','rowspan','start'],ALLOW_DATA_ATTR:false,ALLOW_ARIA_ATTR:false
 });
}};
})();
