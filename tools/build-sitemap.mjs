import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function sitemap({origin,articles=[],listings=[]}){
 const base=new URL(origin);if(!['https:','http:'].includes(base.protocol))throw new Error('Invalid site URL');
 const entries=['/','/about','/contact','/explore','/products','/masterclass','/founding-voices'].map(path=>({loc:new URL(path,base).href}));
 for(const row of articles.filter(row=>row.status==='published'))entries.push({loc:new URL('/article?'+new URLSearchParams({slug:row.slug}),base).href,modified:row.updated_at});
 for(const row of listings.filter(row=>row.status==='published'))entries.push({loc:new URL('/product-detail?'+new URLSearchParams(row.slug?{slug:row.slug}:{id:row.id}),base).href,modified:row.updated_at});
 return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+entries.map(row=>'  <url><loc>'+escape(row.loc)+'</loc>'+(row.modified?'<lastmod>'+escape(new Date(row.modified).toISOString())+'</lastmod>':'')+'</url>').join('\n')+'\n</urlset>\n';
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 const origin=process.env.ETCH_SITE_URL;if(!origin)throw new Error('Set ETCH_SITE_URL to your public site origin.');
 const staticOnly=process.argv.includes('--static-only');
 let articles=[],listings=[];
 if(!staticOnly){
  const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_ANON_KEY;
  if(!base||!key)throw new Error('Set SUPABASE_URL and SUPABASE_ANON_KEY, or use --static-only for a development sitemap.');
  const read=async(table,select)=>{const rows=[];for(let offset=0;;offset+=500){const response=await fetch(base+'/rest/v1/'+table+'?select='+select+'&status=eq.published&order=id&limit=500&offset='+offset,{headers:{apikey:key,Authorization:'Bearer '+key}});if(!response.ok)throw new Error('Sitemap query failed: '+response.status);const data=await response.json();rows.push(...data);if(data.length<500)return rows;}};
  [articles,listings]=await Promise.all([read('masterclass_articles','slug,status,updated_at'),read('listings','id,slug,status,updated_at')]);
 }
 await writeFile(new URL('../sitemap.xml',import.meta.url),sitemap({origin,articles,listings}));
 await writeFile(new URL('../robots.txt',import.meta.url),'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /user/\nDisallow: /article-preview\nDisallow: /*?preview=\nDisallow: /*&preview=\n\nSitemap: '+new URL('/sitemap.xml',origin).href+'\n');
 console.log(`Generated sitemap with ${articles.length} articles and ${listings.length} listings${staticOnly?' (static-only development output)':''}.`);
}
