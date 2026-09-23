import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain = value => String(value ?? '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
function imageUrl(value, origin) {
    try { const url = new URL(value || '/assets/logo.png',origin); return ['https:','http:'].includes(url.protocol) ? url.href : new URL('/assets/logo.png',origin).href; }
    catch { return new URL('/assets/logo.png',origin).href; }
}
export function renderMetadata(html, {title,description,image,url,type='website',privatePage=false}) {
    // Replace metadata once in the initial HTML, not after crawler execution.
    html = html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi,'')
        .replace(/<meta\b[^>]*(?:name|property)\s*=\s*["'](?:description|robots|og:[^"']*|twitter:[^"']*)["'][^>]*>/gi,'')
        .replace(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/gi,'');
    const tags = [
        `<title>${escape(title)}</title>`,
        `<meta name="description" content="${escape(description)}" />`,
        `<meta name="robots" content="${privatePage?'noindex, nofollow':'index, follow'}" />`
    ];
    if (!privatePage) {
        tags.push(`<link rel="canonical" href="${escape(url)}" />`);
        for (const [property,value] of [['og:type',type],['og:site_name','ETCH by OMIMI'],['og:title',title],['og:description',description],['og:image',image],['og:image:alt',title],['og:url',url]]) tags.push(`<meta property="${property}" content="${escape(value)}" />`);
        for (const [name,value] of [['twitter:card','summary_large_image'],['twitter:title',title],['twitter:description',description],['twitter:image',image],['twitter:image:alt',title]]) tags.push(`<meta name="${name}" content="${escape(value)}" />`);
    }
    return html.replace(/<head\b[^>]*>/i, head=>head+'\n'+tags.join('\n'));
}
export function createShareHandler({origin,supabaseUrl,anonKey,fetchImpl=fetch,readTemplate=name=>readFile(new URL('../'+name,import.meta.url),'utf8')}) {
    const siteOrigin=new URL(origin).origin;
    return async request => {
        const url=new URL(request.url);
        const kind=url.pathname.replace(/\.html$/,'');
        if (!['/article','/product-detail'].includes(kind)) return new Response('Not found',{status:404});
        if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
        const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
        let html;
        try { html=await readTemplate(kind==='/article'?'article.html':'product-detail.html'); }
        catch { return new Response('Page template unavailable',{status:503,headers}); }
        const privateResponse=(status,title,description)=>new Response(request.method==='HEAD'?null:renderMetadata(html,{title,description,privatePage:true}),{status,headers:{...headers,'X-Robots-Tag':'noindex, nofollow'}});
        // Staff previews remain browser-authenticated. Never expose their metadata to crawlers.
        if (url.searchParams.has('preview')) return privateResponse(200,'Private preview | ETCH','Sign in with an authorized staff account to view this preview.');
        const slug=url.searchParams.get('slug'),id=url.searchParams.get('id');
        if ((!slug && (kind==='/article'||!id)) || (slug && slug.length>300) || (!slug && id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) return privateResponse(404,'Content not found | ETCH','This content is not available.');
        if(!supabaseUrl||!anonKey) return privateResponse(503,'Temporarily unavailable | ETCH','Please try again shortly.');
        const article=kind==='/article';
        const query=new URLSearchParams({select:article?'slug,title,excerpt,seo_title,seo_description,featured_image,status':'id,slug,title,description,cover_url,status',status:'eq.published',limit:'1'});
        query.set(slug?'slug':'id','eq.'+(slug||id));
        try {
            const response=await fetchImpl(supabaseUrl.replace(/\/$/,'')+'/rest/v1/'+(article?'masterclass_articles':'listings')+'?'+query,{headers:{apikey:anonKey,Authorization:'Bearer '+anonKey},signal:AbortSignal.timeout(8000)});
            if(!response.ok) return privateResponse(503,'Temporarily unavailable | ETCH','Please try again shortly.');
            const [record]=await response.json();
            if(!record||record.status!=='published') return privateResponse(404,'Content not found | ETCH','This content is not available.');
            const canonical=new URL(kind,siteOrigin);canonical.search=new URLSearchParams(record.slug?{slug:record.slug}:{id:record.id}).toString();
            const metadata={title:plain(article?(record.seo_title||record.title):record.title),description:plain(article?(record.seo_description||record.excerpt):record.description).slice(0,300),image:imageUrl(article?record.featured_image:record.cover_url,siteOrigin),url:canonical.href,type:article?'article':'website'};
            return new Response(request.method==='HEAD'?null:renderMetadata(html,metadata),{headers});
        } catch { return privateResponse(503,'Temporarily unavailable | ETCH','Please try again shortly.'); }
    };
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
    const {ETCH_SITE_URL,SUPABASE_URL,SUPABASE_ANON_KEY}=process.env;
    if(!ETCH_SITE_URL||!SUPABASE_URL||!SUPABASE_ANON_KEY) throw new Error('Set ETCH_SITE_URL, SUPABASE_URL and SUPABASE_ANON_KEY. Use the public anon key, never a service-role key.');
    const handler=createShareHandler({origin:ETCH_SITE_URL,supabaseUrl:SUPABASE_URL,anonKey:SUPABASE_ANON_KEY});
    createServer(async(req,res)=>{
        try {
            const result=await handler(new Request(new URL(req.url,ETCH_SITE_URL),{method:req.method}));
            res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
        } catch {res.writeHead(500,{'Cache-Control':'no-store'});res.end('Unable to load page');}
    }).listen(Number(process.env.ETCH_SHARE_PORT||3100),'127.0.0.1',()=>console.log('ETCH sharing pages listening on localhost'));
}
