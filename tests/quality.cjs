// Independent fixture-based checks, complementary to demo.cjs.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const money=v=>new Intl.NumberFormat('sv-SE').format(v)+' kr';
const first=(a,b)=>Array.from({length:12},(_,i)=>i<8?a:b);
const fixtures=[
 {center:'DEMO-100',project:'DEMO-BET',account:'DEMO-3010',budget:[0,0,0,0,0,0,0,0,3000,0,0,0],actual:[0,0,0,0,0,0,0,0,2800,0,0,0]},
 {center:'DEMO-100',project:'DEMO-BET',account:'DEMO-5010',budget:first(-100,-50),actual:first(-110,-60)},
 {center:'DEMO-100',project:'DEMO-FRI',account:'DEMO-5020',budget:first(-100,-300),actual:first(-90,-320)},
 {center:'DEMO-200',project:'DEMO-VER',account:'DEMO-6010',budget:first(-50,-150),actual:first(-60,-140)}
];
function expected(rows,month){
 const sum=xs=>xs.reduce((a,b)=>a+b,0);
 const actual=sum(rows.map(r=>sum(r.actual.slice(0,month+1))));
 const budget=sum(rows.map(r=>sum(r.budget.slice(0,month+1))));
 const rest=sum(rows.map(r=>sum(r.budget.slice(month+1))));
 const full=budget+rest,forecast=actual+rest,variance=forecast-full;
 return [money(actual),money(budget),money(rest),money(forecast),money(full),(variance>0?'+':'')+money(variance),full===0?'—':(variance>0?'+':'')+new Intl.NumberFormat('sv-SE',{maximumFractionDigits:1}).format(variance/Math.abs(full)*100)+' %'];
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 const page=await browser.newPage();const errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:')&&!r.url().startsWith('file:'))external.push(r.url());});
 await page.goto(process.env.DEMO_URL||'http://127.0.0.1:8000/');
 await page.locator('[data-tab="months"]').click();
 for(let m=0;m<12;m++){
  await page.locator('#monthButtons button').nth(m).click();
  const income=m===8?3000:0,cost=m<8?250:500;
  assert.deepEqual(await page.locator('#mi,#mc,#mn').allTextContents(),[money(income),money(cost),money(income-cost)]);
 }
 await page.locator('[data-tab="forecast"]').click();let levels=0;
 for(let m=0;m<12;m++){
  await page.selectOption('#reportMonth',String(m));await page.locator('#simulateImport').click();await page.locator('#approveImport').click();
  const monthName=await page.locator('#reportMonth option:checked').textContent();assert.equal(await page.locator('#reportCaption').textContent(),`Fiktiv rapport · Januari–${monthName} · kr`);
  // Discover each real node, but calculate every expected amount independently.
  const nodes=await page.evaluate(()=>searchIndex.map(item=>({label:item.node.label,key:item.node.label.split(' · ')[0],level:item.level})));nodes.unshift({label:'Hela Skao',key:'Hela Skao'});
  for(const node of nodes){
   if(node.key==='Hela Skao'){const crumb=page.locator('#reportPath button').filter({hasText:'Hela Skao'});if(await crumb.count())await crumb.click();else await page.locator('#reportRows button').filter({hasText:'Hela Skao'}).click();}
   else{await page.locator('#reportSearch').fill(node.key);await page.locator('#searchResults button').filter({hasText:node.label}).click();}
   const selected=fixtures.filter(r=>node.key==='Hela Skao'||[r.center,r.project,r.account].includes(node.key));
   assert.deepEqual(await page.locator('#reportTotal td').allTextContents(),expected(selected,m),`${node.key} month ${m+1}`);
   const rows=page.locator('#reportRows tr');let previous=-Infinity;
   for(let i=0;i<await rows.count();i++){
    const row=rows.nth(i),key=(await row.locator('th').innerText()).split(' · ')[0];
    const subset=fixtures.filter(r=>key==='Hela Skao'||[r.center,r.project,r.account].includes(key));
    assert.deepEqual(await row.locator('td').allTextContents(),expected(subset,m));
    const variance=Number((await row.locator('td').nth(5).textContent()).replace(/[^0-9−+-]/g,'').replace('−','-'));assert(variance>=previous);previous=variance;
   }
   levels++;
  }
 }
 await page.locator('#clearReportSearch').click();
 // Check all tabs, populated imports and report layout at common desktop/mobile sizes.
 for(const width of [1366,1024,390,320]){
  await page.setViewportSize({width,height:900});
  for(const tab of ['overview','centers','projects','months','forecast']){
   await page.locator(`[data-tab="${tab}"]`).click();assert.equal(await page.locator('section:visible').getAttribute('id'),tab);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${tab} width ${width}`);
  }
  assert(await page.locator('.report-table').evaluate(t=>[...t.querySelectorAll('th,td')].every(c=>c.scrollWidth<=c.clientWidth)));
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log(`PASS: ${levels} independent seven-column level/month checks; 12 monthly cards; all five tabs at 1366/1024/390/320 px; no external requests or JS errors; static HTTP without backend.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
