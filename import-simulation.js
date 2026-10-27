// This simulation only uses built-in fictional data and page memory. No I/O or storage.
const importSnapshots = new Map();
const importHistory = [];
const registry = [];
for (const center of reportRoot.children) {
 for (const project of center.children) {
  for (const leaf of project.children) {
   registry.push({center:center.label.split(' · ')[0], project:project.label.split(' · ')[0], account:leaf.label.split(' · ')[0], leaf});
  }
 }
}
const rowKey = row => [row.center,row.project,row.account].join('|');
let pendingImport = null;
const exampleSelect = document.getElementById('importExample');
const approveButton = document.getElementById('approveImport');
function validateImport(rows, month) {
 const errors = [], seen = new Set();
 if (!rows.length) errors.push('Underlaget saknar rader.');
 rows.forEach((row,i)=>{
  const prefix = 'Rad '+(i+1)+': ';
  if (row.year!==2026 || row.month!==month) errors.push(prefix+'Fel rapportår eller rapportmånad.');
  if (!Number.isSafeInteger(row.amount)) errors.push(prefix+'Beloppet måste vara ett giltigt heltal i kronor.');
  if (!registry.some(r=>r.account===row.account)) errors.push(prefix+'Ogiltigt konto '+row.account+'.');
  if (!registry.some(r=>r.center===row.center)) errors.push(prefix+'Ogiltigt kostnadsställe '+row.center+'.');
  const project = registry.find(r=>r.project===row.project);
  if (!project) errors.push(prefix+'Ogiltigt projekt '+row.project+'.');
  else if (project.center!==row.center) errors.push(prefix+'Projekt '+row.project+' tillhör '+project.center+', inte '+row.center+'.');
  if (!registry.some(r=>rowKey(r)===rowKey(row))) errors.push(prefix+'Kombinationen konto, projekt och kostnadsställe är inte tillåten i demon.');
  if (seen.has(rowKey(row))) errors.push(prefix+'Dubblett av konto/projekt/kostnadsställe. Ackumulerade belopp får inte summeras dubbelt.');
  seen.add(rowKey(row));
 });
 return errors;
}
function makeExample(month, type) {
 const rows=registry.map(r=>({center:r.center,project:r.project,account:r.account,year:2026,month,amount:r.leaf.actual.slice(0,month+1).reduce((a,b)=>a+b,0)}));
 if (type==='revised') rows[0].amount+=200;
 if (type==='invalid') {
  rows[0].account='DEMO-9999'; rows[1].center='DEMO-200';
  rows[2].project='DEMO-SAKNAS'; rows[3].center='DEMO-SAKNAS';
 }
 if (type==='duplicate') rows.push({...rows[0]});
 return rows;
}
function invalidatePreview() {
 pendingImport=null;
 document.getElementById('importPreview').hidden=true;
 approveButton.disabled=true;
}
function previewImport() {
 const month=Number(reportMonth.value), rows=makeExample(month,exampleSelect.value);
 const errors=validateImport(rows,month);
 pendingImport={month,rows,errors};
 const income=rows.reduce((a,r)=>a+Math.max(r.amount,0),0);
 const costs=rows.reduce((a,r)=>a+Math.min(r.amount,0),0);
 document.getElementById('importPreview').hidden=false;
 document.getElementById('previewSummary').textContent=`Januari–${names[month]} 2026 · ${rows.length} rader · Intäkter ${fmt(income)} · Kostnader ${fmt(costs)} · Netto ${fmt(income+costs)} · ${errors.length} fel. `+(errors.length?'Importen är stoppad; totalsummorna avser det felaktiga underlaget.':'Kontroller godkända. Inget utfall ändras förrän du godkänner.');
 document.getElementById('replacementNotice').textContent=importSnapshots.has(month)?'Godkännande ersätter hela tidigare utfallet för denna period, inklusive rader som saknas i det nya underlaget. Andra rapportmånader behålls separat och summeras aldrig med denna period.':'Godkännande skapar ett separat ackumulerat utfall för denna period. Olika rapportmånader summeras aldrig med varandra.';
 const list=document.getElementById('importErrors');list.replaceChildren();
 errors.forEach(error=>{const li=document.createElement('li');li.textContent=error;list.appendChild(li);});
 const body=document.getElementById('previewRows');body.replaceChildren();
 rows.forEach((row,i)=>{const tr=document.createElement('tr');[i+1,row.center,row.project,row.account,fmt(row.amount)].forEach((value,j)=>{const td=document.createElement('td');td.textContent=value;if(j===4)td.className='num';tr.appendChild(td);});body.appendChild(tr);});
 approveButton.disabled=errors.length>0;
}
function approveImport() {
 // Revalidate the period and every row at approval; never partially apply invalid data.
 if (!pendingImport || pendingImport.month!==Number(reportMonth.value) || validateImport(pendingImport.rows,pendingImport.month).length) return;
 const {month,rows}=pendingImport;
 const amounts=new Map(registry.map(r=>[r.leaf,0]));
 rows.forEach(row=>amounts.set(registry.find(r=>rowKey(r)===rowKey(row)).leaf,row.amount));
 const previous=importSnapshots.get(month);
 if(previous) previous.entry.active=false;
 const entry={id:importHistory.length+1,month,count:rows.length,total:rows.reduce((a,r)=>a+r.amount,0),active:true};
 importHistory.push(entry);
 importSnapshots.set(month,{amounts,entry}); // Atomic replacement, never addition.
 importedMonth=month;
 invalidatePreview();renderReport();renderImportHistory();
}
function renderImportHistory() {
 const body=document.getElementById('importHistory');body.replaceChildren();
 [...importHistory].reverse().forEach(entry=>{const tr=document.createElement('tr');[entry.id,'Januari–'+names[entry.month],entry.count,fmt(entry.total),entry.active?'Aktuell för perioden':'Ersatt'].forEach((value,i)=>{const td=document.createElement('td');td.textContent=value;if(i===3)td.className='num';tr.appendChild(td);});body.appendChild(tr);});
}
reportMonth.addEventListener('change',()=>{invalidatePreview();importedMonth=importSnapshots.has(Number(reportMonth.value))?Number(reportMonth.value):null;renderReport();});
exampleSelect.addEventListener('change',invalidatePreview);
document.getElementById('simulateImport').addEventListener('click',previewImport);
approveButton.addEventListener('click',approveImport);
renderReport();
