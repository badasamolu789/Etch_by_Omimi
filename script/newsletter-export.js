(() => {
'use strict';
// Quote every cell and neutralize formula prefixes before opening in spreadsheets.
const csvCell=value=>'"'+String(value??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
window.EtchCSV={csvCell};
const button=document.createElement('button');button.type='button';button.textContent='Export active subscribers for Mailchimp';button.className='border rounded-xl px-4 py-3 my-4';
const status=document.createElement('p');status.setAttribute('role','status');
const host=document.getElementById('newsletterSubscribersTable')?.closest('section') || document.querySelector('main');
if(!host)return;host.prepend(button,status);
button.onclick=async()=>{
 button.disabled=true;status.textContent='Preparing CSV…';
 try{
  const client=EtchSupabase.getClient(),rows=[];
  for(let offset=0;;offset+=500){
   const {data,error}=await client.from('newsletter_subscribers').select('id,email,name,subscribed_at').eq('is_active',true).order('id').range(offset,offset+499);
   if(error)throw error;rows.push(...data);if(data.length<500)break;
  }
  if(!rows.length){status.textContent='No active subscribers to export.';return;}
  const lines=[['Email Address','Full Name','Subscription Date'],...rows.map(row=>[row.email,row.name,row.subscribed_at])].map(row=>row.map(csvCell).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\uFEFF'+lines],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='etch-mailchimp-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  status.textContent=`Exported ${rows.length} active subscribers. Preserve Mailchimp unsubscribe status when importing.`;
 }catch(error){status.textContent='Export failed: '+error.message;}finally{button.disabled=false;}
};
})();
