// Search only the built-in fictional report hierarchy; never filter report totals.
const reportSearch = document.getElementById('reportSearch');
const searchResults = document.getElementById('searchResults');
const searchStatus = document.getElementById('searchStatus');
const searchIndex = [];
const searchRoot = {label:'Rapport',children:[reportRoot]};
function indexReportSearch(node,path,depth) {
 if(depth>0) searchIndex.push({node,path,level:['','Kostnadsställe','Projekt','Konto'][depth]});
 if(node.children) node.children.forEach(child=>indexReportSearch(child,[...path,child],depth+1));
}
indexReportSearch(reportRoot,[searchRoot,reportRoot],0);
function renderSearchResults() {
 const query=reportSearch.value.trim().toLocaleLowerCase('sv-SE');
 searchResults.replaceChildren();
 if(!query){searchStatus.textContent='';return;}
 const matches=searchIndex.filter(item=>item.node.label.toLocaleLowerCase('sv-SE').includes(query));
 searchStatus.textContent=matches.length?matches.length+' träffar':'Inga träffar';
 matches.forEach(item=>{
  const li=document.createElement('li'),button=document.createElement('button');
  button.type='button';button.className='row-link';
  button.textContent=item.level+': '+item.node.label;
  button.addEventListener('click',()=>{reportPath=[...item.path];renderReport();document.getElementById('reportHeading').focus();});
  const context=document.createElement('div');context.className='muted';
  context.textContent=item.path.slice(1,-1).map(node=>node.label).join(' → ');
  li.append(button,context);searchResults.appendChild(li);
 });
}
reportSearch.addEventListener('input',renderSearchResults);
document.getElementById('clearReportSearch').addEventListener('click',()=>{reportSearch.value='';renderSearchResults();reportSearch.focus();});
