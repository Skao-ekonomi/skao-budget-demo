// Run with Playwright available: node tests/demo.cjs
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.DEMO_URL||'http://127.0.0.1:8000/');
 for(const id of ['overview','centers','projects','months','forecast']){await page.locator(`[data-tab="${id}"]`).click();assert.equal(await page.locator('section:visible').getAttribute('id'),id);}
 assert.deepEqual(await page.locator('.report-table thead .num').allTextContents(),['Utfall','Budget','Restbudget','Prognos','Helårsbudget']);
 const baseline=await page.evaluate(()=>JSON.stringify(reportRoot));
 const total=()=>page.locator('#reportTotal td').allTextContents();
 const approve=page.locator('#approveImport');
 const preview=async type=>{await page.selectOption('#importExample',type);await page.locator('#simulateImport').click();};
 assert.equal((await total())[0],'—');
 assert.match(await page.locator('.import-steps').innerText(),/Välj underlag → Förhandsgranska → Kontrollera → Godkänn/);
 assert.equal(await page.locator('.import-actions #importExample').count(),1);
 assert.equal(await page.locator('.import-actions #simulateImport').innerText(),'Förhandsgranska import');
 const selectBox=await page.locator('#importExample').boundingBox(), previewBox=await page.locator('#simulateImport').boundingBox();assert(Math.abs(selectBox.y-previewBox.y)<5);assert(previewBox.x>selectBox.x);
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
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('.report-scroll').last().evaluate(e=>e.scrollWidth>e.clientWidth),true);
 assert.equal(await page.locator('input[type=file]').count(),0);assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
 await page.reload();await page.locator('[data-tab="forecast"]').click();assert.equal((await total())[0],'—');assert.match(await page.locator('#importHistory').innerText(),/Inga godkända/);assert.deepEqual(errors,[]);
 console.log('PASS: preview, validation, blocked errors, atomic replacement, period isolation, history, 120 report checks, unchanged budgets, drill-down, mobile, reload reset.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
