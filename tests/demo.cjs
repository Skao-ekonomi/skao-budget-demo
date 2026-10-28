// Run with Playwright available: node tests/demo.cjs
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.DEMO_URL||'http://127.0.0.1:8000/');
 for(const id of ['overview','centers','projects','months','forecast']){await page.locator(`[data-tab="${id}"]`).click();assert.equal(await page.locator('section:visible').getAttribute('id'),id);}
 assert.deepEqual(await page.locator('.report-table thead .num').allTextContents(),['Utfall perioden','Budget perioden','Budget reståret','Prognos','Helårsbudget','Avvikelse','Avvikelse %']);
 await page.getByRole('button',{name:'Importera utfall (demo)',exact:true}).click();assert.equal(await page.locator('#importExample').evaluate(e=>e===document.activeElement),true);
 const baseline=await page.evaluate(()=>JSON.stringify(reportRoot));
 const total=()=>page.locator('#reportTotal td').allTextContents();
 const approve=page.locator('#approveImport');
 const preview=async type=>{await page.selectOption('#importExample',type);await page.locator('#simulateImport').click();};
 assert.equal((await total())[0],'—');assert.equal((await total())[5],'—');
 assert.match(await page.locator('.import-steps').innerText(),/Välj underlag → Förhandsgranska → Kontrollera → Godkänn/);
 assert.equal(await page.locator('.import-actions #importExample').count(),1);
 assert.equal(await page.locator('.import-actions #simulateImport').innerText(),'Förhandsgranska import');
 const adjacent=await page.locator('.import-actions').evaluate(e=>{const select=e.querySelector('select'),button=e.querySelector('button');return button.offsetLeft>select.offsetLeft&&Math.abs(button.offsetTop-select.offsetTop)<5;});assert(adjacent);
 await preview('valid');assert.equal(await page.locator('#previewRows tr').count(),4);assert.equal((await total())[0],'—');assert.equal(await approve.isEnabled(),true);assert.match(await page.locator('#workflowStatus').innerText(),/ännu inte godkänd/);
 await approve.click();const original=await total();assert.match(await page.locator('#workflowStatus').innerText(),/Godkänd – import #1/);assert.match(await page.locator('#importConfirmation').innerText(),/import #1 gäller nu för januari–September 2026/);assert((await page.locator('#importConfirmation').innerText()).includes(original[0]));assert.equal(await approve.isEnabled(),false);assert.equal(await page.locator('#importHistory tr').count(),1);
 await preview('valid');await approve.click();assert.deepEqual(await total(),original);assert.equal(await page.locator('#importHistory .status-badge.replaced').count(),1);
 await preview('revised');await approve.click();const revised=await total();assert.notEqual(revised[0],original[0]);assert.deepEqual(revised.filter((_,i)=>[1,2,4].includes(i)),original.filter((_,i)=>[1,2,4].includes(i)));
 for(const type of ['invalid','duplicate']){await preview(type);assert.equal(await approve.isDisabled(),true);assert((await page.locator('#importErrors li').count())>0);assert.match(await page.locator('#workflowStatus').innerText(),/Stoppad/);if(type==='invalid'){assert.equal(await page.locator('#importErrors > li').count(),4);assert((await page.locator('#importErrors > li').first().locator('li').count())>1);}assert.match(await page.locator('#importConfirmation').innerText(),/import #3 gäller nu/);await page.evaluate(()=>approveImport());assert.deepEqual(await total(),revised);}
 await preview('valid');await page.selectOption('#reportMonth','7');assert.equal(await page.locator('#importPreview').isVisible(),false);await page.evaluate(()=>approveImport());assert.equal((await total())[0],'—');await preview('valid');await approve.click();await page.selectOption('#reportMonth','8');assert.deepEqual(await total(),revised);assert.match(await page.locator('#importConfirmation').innerText(),/import #3 gäller nu/);assert.match(await page.locator('#importHistory .replaced').first().innerText(),/räknas inte med/);
 const checks=await page.evaluate(()=>{
  let count=0;for(let month=0;month<12;month++){
   reportMonth.value=String(month);pendingImport={month,rows:makeExample(month,'valid')};approveImport();
   function visit(node){const a=reportAmounts(node);if(a[3]!==a[0]+a[2]||a[4]!==a[1]+a[2])throw Error('Formula');if(node.children){const sum=node.children.map(visit).reduce((x,y)=>x.map((v,i)=>v+y[i]),[0,0,0,0,0]);if(JSON.stringify(sum)!==JSON.stringify(a))throw Error('Lost amounts');}count++;return a;}visit(reportRoot);
  }
  const rows=makeExample(8,'valid');rows[0].year=2025;rows[1].month=7;rows[2].amount=NaN;if(validateImport(rows,8).length!==3)throw Error('Period/amount validation');
  // Replacing an entire snapshot must zero omitted accounts, not retain old values.
  reportMonth.value='8';pendingImport={month:8,rows:makeExample(8,'valid').slice(1)};approveImport();if(reportAmounts(registry[0].leaf)[0]!==0)throw Error('Omitted account retained');
  return count;
 });assert.equal(checks,120);assert.equal(await page.evaluate(()=>JSON.stringify(reportRoot)),baseline);
 await page.selectOption('#reportMonth','8');for(let i=0;i<4;i++)await page.locator('#reportRows button').first().click();assert.match(await page.locator('#reportRows').innerText(),/kontonivå/);

 const historyBefore=await page.locator('#importHistory').innerText();
 const varianceChecks=await page.evaluate(()=>{
  let checked=0;
  const number=text=>Number(text.replace(/[^0-9−+.,-]/g,'').replace('−','-').replace(',','.'));
  function checkRow(row){const cells=[...row.querySelectorAll('td')];if(cells.length!==7)throw Error('Column count');if(cells[3].textContent==='—'){if(cells[5].textContent!=='—'||cells[6].textContent!=='—')throw Error('Missing variance');checked++;return;}if(number(cells[5].textContent)!==number(cells[3].textContent)-number(cells[4].textContent))throw Error('Variance');const budget=number(cells[4].textContent);if(budget===0){if(cells[6].textContent!=='—')throw Error('Zero budget');}else if(Math.abs(number(cells[6].textContent)-number(cells[5].textContent)/Math.abs(budget)*100)>.051)throw Error('Percent');checked++;}
  function visit(node,path){reportPath=path;renderReport();document.querySelectorAll('#reportRows tr,#reportTotal tr').forEach(checkRow);if(node.children)node.children.forEach(child=>visit(child,[...path,child]));}
  const root={label:'Rapport',children:[reportRoot]};visit(root,[root]);
  for(const value of [-100,0,100]){const fake={budget:Array(12).fill(0)};const snapshot=importSnapshots.get(Number(reportMonth.value));snapshot.amounts.set(fake,value);const cell=reportCells(fake)[5];snapshot.amounts.delete(fake);if(cell.classList.contains('variance-negative')!==(value<0)||cell.classList.contains('variance-positive')!==(value>0))throw Error('Variance color');}
  for(const [budget,actual,expected,sign] of [[-1000,-1320,'−32 %','negative'],[-1000,-680,'+32 %','positive'],[-1000,-1000,'0 %',''],[0,100,'—','']]){const fake={budget:[budget,...Array(11).fill(0)]};const snapshot=importSnapshots.get(Number(reportMonth.value));snapshot.amounts.set(fake,actual);const cell=reportCells(fake)[6];snapshot.amounts.delete(fake);if(cell.textContent!==expected)throw Error('Percent example: '+cell.textContent);if(cell.classList.contains('variance-negative')!==(sign==='negative')||cell.classList.contains('variance-positive')!==(sign==='positive'))throw Error('Percent color');}
  const saved=importedMonth;importedMonth=null;visit(root,[root]);if([...document.querySelectorAll('#reportRows tr,#reportTotal tr')].some(r=>r.lastElementChild.textContent!=='—'))throw Error('Missing forecast');importedMonth=saved;reportPath=[root];renderReport();return checked;
 });assert(varianceChecks>20);assert.equal(await page.locator('#importHistory').innerText(),historyBefore);
 const sortingChecks=await page.evaluate(()=>{
  const mixed=[null,20,0,-2,100,-100,null,0];mixed.sort(compareReportVariances);
  if(JSON.stringify(mixed)!==JSON.stringify([-100,-2,0,0,20,100,null,null]))throw Error('Mixed missing/negative/zero/positive order');
  const originalPath=reportPath,originalMonth=reportMonth.value,originalImported=importedMonth;
  const root={label:'Rapport',children:[reportRoot]};let checked=0;
  function visit(node,path){
   reportPath=path;renderReport();
   const rows=[...document.querySelectorAll('#reportRows tr')];
   const values=rows.map(row=>{const text=row.querySelectorAll('td')[5].textContent;return text==='—'?null:Number(text.replace(/[^0-9−+-]/g,'').replace('−','-'));});
   for(let i=1;i<values.length;i++){if(compareReportVariances(values[i-1],values[i])>0)throw Error('Wrong order on '+node.label);}
   if(document.querySelectorAll('#reportTotal tr').length!==1||document.querySelector('#reportTotal').parentElement.lastElementChild.id!=='reportTotal')throw Error('Summary moved');
   const cells=reportCells(node);if([...document.querySelectorAll('#reportTotal td')].some((cell,i)=>cell.textContent!==cells[i].textContent))throw Error('Summary changed');
   checked++;
   if(node.children)node.children.forEach(child=>visit(child,[...path,child]));
  }
  for(let month=0;month<12;month++){reportMonth.value=String(month);importedMonth=month;visit(root,[root]);}
  importedMonth=null;visit(root,[root]);
  reportMonth.value=originalMonth;importedMonth=originalImported;reportPath=originalPath;renderReport();return checked;
 });assert.equal(sortingChecks,143);assert.equal(await page.locator('#importHistory').innerText(),historyBefore);assert.equal(await page.evaluate(()=>JSON.stringify(reportRoot)),baseline);
 // Follow a sorted row by its label, then navigate back through the breadcrumbs.
 await page.getByRole('button',{name:'Hela Skao →',exact:true}).click();
 const firstLabel=(await page.locator('#reportRows button').first().innerText()).replace(' →','');
 await page.locator('#reportRows button').first().click();assert.equal(await page.locator('#reportHeading').innerText(),firstLabel);
 await page.locator('#reportPath button').filter({hasText:'Hela Skao'}).click();assert.equal(await page.locator('#reportHeading').innerText(),'Hela Skao');
 await page.setViewportSize({width:1366,height:900});
 const layout=await page.locator('.report-table').evaluate(e=>({width:e.clientWidth,available:e.parentElement.clientWidth}));assert(layout.width<=layout.available);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('.report-scroll').last().evaluate(e=>e.scrollWidth>e.clientWidth),true);
 const noOverlap=await page.locator('.report-table').evaluate(table=>[...table.querySelectorAll('th,td')].every(cell=>cell.scrollWidth<=cell.clientWidth));assert(noOverlap);
 assert.equal(await page.locator('input[type=file]').count(),0);assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
 await page.reload();await page.locator('[data-tab="forecast"]').click();assert.equal((await total())[0],'—');assert.match(await page.locator('#importHistory').innerText(),/Inga godkända/);assert.deepEqual(errors,[]);
 console.log('PASS: preview, validation, blocked errors, atomic replacement, period isolation, history, 120 report checks, unchanged budgets, drill-down, mobile, reload reset.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
