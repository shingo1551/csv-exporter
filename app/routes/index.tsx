import { createRoute } from 'honox/factory'

const script = `
(() => {
 const input = document.getElementById('file');
 const card = document.getElementById('results');
 const columnBody = document.getElementById('column-rows');
 const columnHead = document.getElementById('column-headers');
 const dataCard = document.getElementById('selected-results');
 const dataTable = document.getElementById('selected-table');
 const dataHead = document.getElementById('data-headers');
 const dataBody = document.getElementById('data-rows');
 const noColumns = document.getElementById('no-columns');
 let headers = [], rows = [], selectedRows = new Set();
 function parse(text) {
   const out=[]; let row=[], field='', quoted=false;
   for(let i=0;i<text.length;i++) { const c=text[i];
     if(quoted) { if(c==='"'&&text[i+1]==='"'){field+='"';i++} else if(c==='"') quoted=false; else field+=c }
     else if(c==='"'&&!field) quoted=true;
     else if(c===','){row.push(field);field=''}
     else if(c==='\\n'||c==='\\r'){if(c==='\\r'&&text[i+1]==='\\n')i++;row.push(field);out.push(row);row=[];field=''}
     else field+=c;
   }
   if(field||row.length){row.push(field);out.push(row)} return out.filter(r=>r.some(v=>v));
 }
 function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
 function selectedIndexes(){return [...columnBody.querySelectorAll('input[type="checkbox"]')].filter(x=>x.checked).map(x=>Number(x.dataset.index))}
 function updateRowCount(){const n=[...dataBody.querySelectorAll('input[type="checkbox"]')].filter(x=>x.checked).length;document.getElementById('row-count').textContent=n+' 行を選択中';document.getElementById('download').disabled=!selectedIndexes().length||!n}
 function renderDataRows(){
   const indexes=selectedIndexes();
   document.getElementById('count').textContent=indexes.length+' 列を選択中';
   noColumns.hidden=indexes.length>0; dataTable.hidden=!indexes.length;
   if(!indexes.length){dataHead.innerHTML='';dataBody.innerHTML='';updateRowCount();return}
   dataHead.innerHTML='<tr><th>選択</th><th>行</th>'+indexes.map(i=>'<th>'+esc(headers[i])+'</th>').join('')+'</tr>';
   dataBody.innerHTML=rows.map((row,rowIndex)=>'<tr><td><input type="checkbox" data-row-index="'+rowIndex+'" '+(selectedRows.has(rowIndex)?'checked':'')+' aria-label="'+(rowIndex+1)+'行目" /></td><th scope="row">'+(rowIndex+1)+'</th>'+indexes.map(i=>'<td>'+esc(row[i]??'')+'</td>').join('')+'</tr>').join('');
   dataBody.querySelectorAll('input[type="checkbox"]').forEach(x=>x.addEventListener('change',()=>{const i=Number(x.dataset.rowIndex);if(x.checked)selectedRows.add(i);else selectedRows.delete(i);updateRowCount()}));
   updateRowCount();
 }
 input.addEventListener('change',async()=>{
   const file=input.files[0]; if(!file)return;
   try { const parsed=parse((await file.text()).replace(/^\\uFEFF/,'')); if(parsed.length<2)throw Error('ヘッダーとデータ行を含むCSVを選択してください。');
     headers=parsed[0].map(x=>x.trim()); rows=parsed.slice(1).reverse(); selectedRows=new Set(rows.map((_,i)=>i));
     const previewRows=rows.slice(0,3);
     columnHead.innerHTML='<tr><th>選択</th><th>CSVヘッダー</th>'+previewRows.map((_,i)=>'<th>'+(i+1)+'行目</th>').join('')+'</tr>';
     columnBody.innerHTML=headers.map((header,i)=>'<tr><td><input type="checkbox" data-index="'+i+'" aria-label="'+esc(header)+'を出力" /></td><th scope="row">'+esc(header)+'</th>'+previewRows.map(r=>'<td>'+esc(r[i]??'')+'</td>').join('')+'</tr>').join('');
     columnBody.querySelectorAll('input[type="checkbox"]').forEach(x=>x.addEventListener('change',renderDataRows));
     document.getElementById('fileinfo').textContent=file.name+' · '+rows.length+' 行'; card.hidden=false;dataCard.hidden=false;renderDataRows();
   } catch(e){document.getElementById('fileinfo').textContent=e.message;card.hidden=true;dataCard.hidden=true}
 });
 document.getElementById('all-columns').addEventListener('click',()=>{columnBody.querySelectorAll('input').forEach(x=>x.checked=true);renderDataRows()});
 document.getElementById('no-columns-button').addEventListener('click',()=>{columnBody.querySelectorAll('input').forEach(x=>x.checked=false);renderDataRows()});
 document.getElementById('all-rows').addEventListener('click',()=>{selectedRows=new Set(rows.map((_,i)=>i));dataBody.querySelectorAll('input').forEach(x=>x.checked=true);updateRowCount()});
 document.getElementById('no-rows').addEventListener('click',()=>{selectedRows.clear();dataBody.querySelectorAll('input').forEach(x=>x.checked=false);updateRowCount()});
 document.getElementById('download').addEventListener('click',()=>{
   const selectedColumns=selectedIndexes();
   const selectedDataRows=rows.filter((_,i)=>selectedRows.has(i));
   const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
   const csv=[selectedColumns.map(i=>headers[i]),...selectedDataRows.map(r=>selectedColumns.map(i=>r[i]??''))].map(r=>r.map(quote).join(',')).join('\\r\\n');
   const url=URL.createObjectURL(new Blob(['\\uFEFF',csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='selected-data.csv';a.click();URL.revokeObjectURL(url);
 });
})();`

export default createRoute((c) => c.render(
  <main class="page">
    <header><a class="brand" href="/">CSV <span>SELECT</span></a><small>ブラウザ内で安全に処理</small></header>
    <section class="hero"><p class="eyebrow">CSV WORKFLOW / CLOUDFLARE</p><h1>必要な行と列だけ、<br /><span>すばやく書き出す。</span></h1><p>先頭3行を確認しながら列を選び、出力する行も指定できます。</p></section>
    <section class="panel"><p class="label">01　CSVファイルを読み込む</p><label class="drop" for="file"><input id="file" type="file" accept=".csv,text/csv" /><b>↑</b><strong>CSVファイルを選択</strong><span>クリック、またはここにファイルをドロップ</span></label><p id="fileinfo" class="info">ファイルはサーバーへ送信されません。</p></section>
    <section id="results" class="panel" hidden><div class="tabletop"><div><p class="label">02　出力する列を選ぶ</p><span id="count">0 列を選択中</span></div><div><button id="all-columns" class="link" type="button">すべての列を選択</button><button id="no-columns-button" class="link" type="button">選択解除</button></div></div><div class="scroll"><table><thead id="column-headers"></thead><tbody id="column-rows"></tbody></table></div></section>
    <section id="selected-results" class="panel" hidden><div class="tabletop"><div><p class="label">03　選択した列のデータ</p><span id="row-count">0 行を選択中</span></div><div><button id="all-rows" class="link" type="button">すべての行を選択</button><button id="no-rows" class="link" type="button">選択解除</button></div></div><p id="no-columns" class="info">列を選択すると、その列を使ったデータ行がここに表示されます。</p><div class="scroll"><table id="selected-table" hidden><thead id="data-headers"></thead><tbody id="data-rows"></tbody></table></div><button id="download" class="download" type="button" disabled>↓　選択した行と列をCSVで保存</button></section>
    <footer>CSV SELECT <span>必要なデータを、必要な分だけ。</span></footer>
    <script dangerouslySetInnerHTML={{ __html: script }} />
  </main>, { title: 'CSV Select — 必要な列だけ書き出す' }
))
