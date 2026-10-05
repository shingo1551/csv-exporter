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
 const columnOrderCard = document.getElementById('column-order');
 const columnOrderList = document.getElementById('column-order-list');
 const noColumns = document.getElementById('no-columns');
 const presetName = document.getElementById('preset-name');
 const presetSelect = document.getElementById('saved-presets');
 const presetStatus = document.getElementById('preset-status');
 const PRESETS_KEY = 'csv-select-column-presets-v1';
 let toastTimer;
 let headers = [], rows = [], selectedRows = new Set(), selectedColumnOrder = [], numericColumnSet = new Set();
 const collator = new Intl.Collator('ja',{numeric:true,sensitivity:'base'});
 const numberPattern=/^[+-]?(?:[0-9]+(?:[.][0-9]*)?|[.][0-9]+)$/;
 // 引用符内のカンマや改行を保ちながら、CSVを行とセルに分解する。
 function parse(text) {
   const out=[]; let row=[], field='', quoted=false;
   for(let i=0;i<text.length;i++) { const c=text[i];
     if(quoted) { if(c==='"'&&text[i+1]==='"'){field+='"';i++} else if(c==='"') quoted=false; else field+=c }
     else if(c==='"'&&!field) quoted=true;
     else if(c===','){row.push(field);field=''}
     else if(c.charCodeAt(0)===10||c.charCodeAt(0)===13){if(c.charCodeAt(0)===13&&text.charCodeAt(i+1)===10)i++;row.push(field);out.push(row);row=[];field=''}
     else field+=c;
   }
   if(field||row.length){row.push(field);out.push(row)} return out.filter(r=>r.some(v=>v));
 }
 function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
 // チェックされた列を、ドラッグで設定した順序のまま返す。
 function selectedIndexes(){
   const checked=[...columnBody.querySelectorAll('input[type="checkbox"]')].filter(x=>x.checked).map(x=>Number(x.dataset.index));
   selectedColumnOrder=selectedColumnOrder.filter(i=>checked.includes(i));
   checked.forEach(i=>{if(!selectedColumnOrder.includes(i))selectedColumnOrder.push(i)});
   return selectedColumnOrder.slice();
 }
 function showToast(message){
   const toast=document.getElementById('toast');
   toast.textContent=message;toast.hidden=false;
   clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true},2000);
 }
 function renderColumnOrder(indexes){
   columnOrderCard.hidden=!indexes.length;
   columnOrderList.innerHTML=indexes.map(i=>'<li draggable="true" data-index="'+i+'"><span class="drag-grip" aria-hidden="true">⠿</span><span>'+esc(headers[i])+'</span></li>').join('');
   columnOrderList.querySelectorAll('li').forEach(item=>{
     item.addEventListener('dragstart',event=>{event.dataTransfer.setData('text/plain',item.dataset.index);event.dataTransfer.effectAllowed='move';item.classList.add('dragging')});
     item.addEventListener('dragover',event=>{event.preventDefault();event.dataTransfer.dropEffect='move';item.classList.add('drag-over')});
     item.addEventListener('dragleave',()=>item.classList.remove('drag-over'));
     item.addEventListener('drop',event=>{
       event.preventDefault();item.classList.remove('drag-over');
       const from=selectedColumnOrder.indexOf(Number(event.dataTransfer.getData('text/plain')));
       const to=selectedColumnOrder.indexOf(Number(item.dataset.index));
       if(from<0||to<0||from===to)return;
       const [moved]=selectedColumnOrder.splice(from,1);
       selectedColumnOrder.splice(to,0,moved);
       renderDataRows();
     });
     item.addEventListener('dragend',()=>item.classList.remove('dragging'));
   });
 }
 function compareCellValues(a,b){
   const left=String(a??'').trim(),right=String(b??'').trim();
   if(!left&&!right)return 0;
   if(!left)return -1;
   if(!right)return 1;
   const leftNumber=Number(left.replace(/,/g,'')),rightNumber=Number(right.replace(/,/g,''));
   if(Number.isFinite(leftNumber)&&Number.isFinite(rightNumber))return leftNumber-rightNumber;
   return collator.compare(left,right);
 }
 // 数値セルは画面表示だけ桁区切りにし、元のCSV値は変更しない。
 function isNumericValue(value){return numberPattern.test(String(value??'').trim().replace(/,/g,''))}
 function formatNumericValue(value){
   const text=String(value??'').trim().replace(/,/g,'');
   if(!numberPattern.test(text))return String(value??'');
   const [integerPart,fraction]=text.split('.');
   const sign=integerPart.startsWith('-')?'-':'';
   const digits=integerPart.replace(/^[+-]/,'')||'0';
   const grouped=digits.replace(/([0-9])(?=(?:[0-9]{3})+$)/g,'$1,');
   return sign+grouped+(fraction!==undefined?'.'+fraction:'');
 }
 function formatCell(value,index){
   const numeric=numericColumnSet.has(index)&&isNumericValue(value);
   return {className:numeric?' class="numeric"':'',text:numeric?formatNumericValue(value):String(value??'')};
 }
 function getSortedRows(indexes){
   // 選択列の表示順を ORDER BY の優先順位として使い、同値なら元の順序を保つ。
   return rows.map((row,originalIndex)=>({row,originalIndex})).sort((a,b)=>{
     for(const index of indexes){const comparison=compareCellValues(a.row[index],b.row[index]);if(comparison)return comparison}
     return a.originalIndex-b.originalIndex;
   });
 }
 // localStorageには列名と順序だけを保存し、CSVの行データは保存しない。
 function readPresets(){
   try {
     const value=JSON.parse(localStorage.getItem(PRESETS_KEY)||'{}');
     if(!value||typeof value!=='object'||Array.isArray(value))return {};
     return Object.fromEntries(Object.entries(value).filter(([name,items])=>name&&Array.isArray(items)&&items.every(x=>typeof x==='string')));
   } catch { return {} }
 }
 function refreshPresets(selected=''){
   const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='保存済みの列設定';presetSelect.replaceChildren(placeholder);
   Object.keys(readPresets()).sort((a,b)=>a.localeCompare(b,'ja')).forEach(name=>{const option=document.createElement('option');option.value=name;option.textContent=name;presetSelect.append(option)});
   presetSelect.value=selected;
   document.getElementById('delete-preset').disabled=!presetSelect.value;
 }
 function applyPreset(name){
   const saved=readPresets()[name];if(!saved)return;
   const wanted=new Set(saved),missing=saved.filter(header=>!headers.includes(header));
   columnBody.querySelectorAll('input[type="checkbox"]').forEach(x=>{x.checked=wanted.has(headers[Number(x.dataset.index)])});
   selectedColumnOrder=saved.map(header=>headers.indexOf(header)).filter(i=>i>=0);
   renderDataRows();presetStatus.textContent=missing.length?'「'+name+'」を読み込みました。CSVにない列は選択されませんでした。':'「'+name+'」を読み込みました。';
 }
 function updateRowCount(){const n=[...dataBody.querySelectorAll('input[type="checkbox"]')].filter(x=>x.checked).length;document.getElementById('row-count').textContent=n+' 行を選択中';document.getElementById('download').disabled=!selectedIndexes().length||!n}
 function renderDataRows(){
   const indexes=selectedIndexes();
   renderColumnOrder(indexes);
   document.getElementById('count').textContent=indexes.length+' 列を選択中';
   noColumns.hidden=indexes.length>0; dataTable.hidden=!indexes.length;
   if(!indexes.length){dataHead.innerHTML='';dataBody.innerHTML='';updateRowCount();return}
   dataHead.innerHTML='<tr><th>選択</th><th>行</th>'+indexes.map(i=>'<th'+(numericColumnSet.has(i)?' class="numeric"':'')+'>'+esc(headers[i])+'</th>').join('')+'</tr>';
   dataBody.innerHTML=getSortedRows(indexes).map(({row,originalIndex},rowIndex)=>'<tr><td><input type="checkbox" data-row-index="'+originalIndex+'" '+(selectedRows.has(originalIndex)?'checked':'')+' aria-label="'+(rowIndex+1)+'行目" /></td><th scope="row">'+(rowIndex+1)+'</th>'+indexes.map(i=>{const cell=formatCell(row[i],i);return '<td'+cell.className+'>'+esc(cell.text)+'</td>'}).join('')+'</tr>').join('');
   dataBody.querySelectorAll('input[type="checkbox"]').forEach(x=>x.addEventListener('change',()=>{const i=Number(x.dataset.rowIndex);if(x.checked)selectedRows.add(i);else selectedRows.delete(i);updateRowCount()}));
   updateRowCount();
 }
 // CSVの解析と表示はブラウザー内で行う。
 input.addEventListener('change',async()=>{
   const file=input.files[0]; if(!file)return;
   try { const text=await file.text(); const parsed=parse(text.charCodeAt(0)===0xFEFF?text.slice(1):text); if(parsed.length<2)throw Error('ヘッダーとデータ行を含むCSVを選択してください。');
     headers=parsed[0].map(x=>x.trim()); rows=parsed.slice(1).reverse(); selectedRows=new Set(rows.map((_,i)=>i)); selectedColumnOrder=[];
     numericColumnSet=new Set(headers.map((_,i)=>i).filter(i=>rows.some(row=>isNumericValue(row[i]))));
     const previewRows=rows.slice(0,3);
     columnHead.innerHTML='<tr><th>選択</th><th>CSVヘッダー</th>'+previewRows.map((_,i)=>'<th>'+(i+1)+'行目</th>').join('')+'</tr>';
     columnBody.innerHTML=headers.map((header,i)=>'<tr><td><input type="checkbox" data-index="'+i+'" aria-label="'+esc(header)+'を出力" /></td><th scope="row">'+esc(header)+'</th>'+previewRows.map(r=>{const cell=formatCell(r[i],i);return '<td'+cell.className+'>'+esc(cell.text)+'</td>'}).join('')+'</tr>').join('');
     columnBody.querySelectorAll('input[type="checkbox"]').forEach(x=>x.addEventListener('change',renderDataRows));
     document.getElementById('fileinfo').textContent=file.name+' · '+rows.length+' 行'; card.hidden=false;dataCard.hidden=false;refreshPresets(presetSelect.value);renderDataRows();applyPreset(presetSelect.value);
   } catch(e){document.getElementById('fileinfo').textContent=e.message;card.hidden=true;dataCard.hidden=true}
 });
 document.getElementById('save-preset').addEventListener('click',()=>{
   const name=presetName.value.trim();
   if(!name){showToast('保存名を入力してください。');return}
   const indexes=selectedIndexes();
   if(!indexes.length){showToast('保存する列を1つ以上選択してください。');return}
   try {const saved=readPresets();saved[name]=indexes.map(i=>headers[i]);localStorage.setItem(PRESETS_KEY,JSON.stringify(saved));refreshPresets(name);showToast('「'+name+'」を保存しました。')}
   catch {showToast('ブラウザーの保存領域に書き込めませんでした。')}
 });
 presetSelect.addEventListener('change',()=>{document.getElementById('delete-preset').disabled=!presetSelect.value;applyPreset(presetSelect.value)});
 document.getElementById('delete-preset').addEventListener('click',()=>{
   const name=presetSelect.value;if(!name)return;
   try {const saved=readPresets();delete saved[name];localStorage.setItem(PRESETS_KEY,JSON.stringify(saved));refreshPresets();presetStatus.textContent='「'+name+'」を削除しました。'}
   catch {presetStatus.textContent='ブラウザーの保存領域を更新できませんでした。'}
 });
 document.getElementById('all-columns').addEventListener('click',()=>{columnBody.querySelectorAll('input').forEach(x=>x.checked=true);renderDataRows()});
 document.getElementById('no-columns-button').addEventListener('click',()=>{columnBody.querySelectorAll('input').forEach(x=>x.checked=false);renderDataRows()});
 document.getElementById('all-rows').addEventListener('click',()=>{selectedRows=new Set(rows.map((_,i)=>i));dataBody.querySelectorAll('input').forEach(x=>x.checked=true);updateRowCount()});
 document.getElementById('no-rows').addEventListener('click',()=>{selectedRows.clear();dataBody.querySelectorAll('input').forEach(x=>x.checked=false);updateRowCount()});
 // 表示用の桁区切りを使わず、選択した元データをCSVとして書き出す。
 document.getElementById('download').addEventListener('click',()=>{
   const selectedColumns=selectedIndexes();
   const selectedDataRows=getSortedRows(selectedColumns).filter(({originalIndex})=>selectedRows.has(originalIndex)).map(({row})=>row);
   const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
   const csv=[selectedColumns.map(i=>headers[i]),...selectedDataRows.map(r=>selectedColumns.map(i=>r[i]??''))].map(r=>r.map(quote).join(',')).join(String.fromCharCode(13,10));
   const url=URL.createObjectURL(new Blob([String.fromCharCode(0xFEFF),csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='selected-data.csv';a.click();URL.revokeObjectURL(url);
 });
})();`

export default createRoute((c) => c.render(
  <main class="page">
    <header><a class="brand" href="/">CSV <span>SELECT</span></a><small>ブラウザ内で安全に処理</small></header>
    <section class="hero"><p class="eyebrow">CSV WORKFLOW / CLOUDFLARE</p><h1>必要な行と列だけ書き出す</h1><p>先頭3行を確認しながら列を選び、出力する行も指定できます。</p></section>
    <section class="panel"><p class="label">01　CSVファイルを読み込む</p><label class="drop" for="file"><input id="file" type="file" accept=".csv,text/csv" /><b>↑</b><strong>CSVファイルを選択</strong><span>クリック、またはここにファイルをドロップ</span></label><p id="fileinfo" class="info">ファイルはサーバーへ送信されません。</p></section>
    <section id="results" class="panel" hidden><div class="tabletop"><div><p class="label">02　出力する列を選ぶ</p><span id="count">0 列を選択中</span></div><div><button id="all-columns" class="link" type="button">すべての列を選択</button><button id="no-columns-button" class="link" type="button">選択解除</button></div></div><div class="preset-tools"><select id="saved-presets" aria-label="保存済みの列設定"><option value="">保存済みの列設定</option></select><button id="delete-preset" class="link" type="button" disabled>削除</button></div><p id="preset-status" class="info" aria-live="polite"></p><div class="scroll"><table><thead id="column-headers"></thead><tbody id="column-rows"></tbody></table></div></section>
    <section id="column-order" class="panel" hidden><p class="label">03　選択した列の表示順</p><p class="info">ドラッグで並べ替えます。この順番が04のソート優先順（昇順）になります。</p><div class="preset-tools"><input id="preset-name" type="text" maxlength="80" placeholder="列設定の名前" aria-label="列設定の名前" /><button id="save-preset" class="link" type="button">名前を付けて保存</button></div><ol id="column-order-list" class="column-order-list" aria-label="選択した列のソート優先順"></ol></section>
    <section id="selected-results" class="panel" hidden><div class="tabletop"><div><p class="label">04　選択した列のデータ</p><span id="row-count">0 行を選択中</span></div><div><button id="all-rows" class="link" type="button">すべての行を選択</button><button id="no-rows" class="link" type="button">選択解除</button></div></div><p id="no-columns" class="info">列を選択すると、その列を使ったデータ行がここに表示されます。</p><div class="scroll"><table id="selected-table" hidden><thead id="data-headers"></thead><tbody id="data-rows"></tbody></table></div><button id="download" class="download" type="button" disabled>↓　選択した行と列をCSVで保存</button></section>
    <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
    <footer>CSV SELECT <span>必要なデータを、必要な分だけ。</span></footer>
    <script dangerouslySetInnerHTML={{ __html: script }} />
  </main>, { title: 'CSV Select — 必要な列だけ書き出す' }
))
