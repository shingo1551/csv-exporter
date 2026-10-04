import { createRoute } from 'honox/factory'

// 出力したいCSVヘッダーをここに設定します。入力CSVの1行目と完全一致させてください。
const OUTPUT_COLUMNS = ['注文日', '注文番号', '注文の合計（税込）', '商品カテゴリー', '商品名']
const script = `
(() => {
 const columns = ${JSON.stringify(OUTPUT_COLUMNS)};
 const input = document.getElementById('file');
 const card = document.getElementById('results');
 const body = document.getElementById('rows');
 const head = document.getElementById('headers');
 const warning = document.getElementById('warning');
 let headers = [], rows = [];
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
 function selectedIndexes(){return [...body.querySelectorAll('input[type="checkbox"]')].filter(x=>x.checked).map(x=>Number(x.dataset.index))}
 function update(){const n=selectedIndexes().length;document.getElementById('count').textContent=n+' 列を選択中';document.getElementById('download').disabled=!n}
 input.addEventListener('change',async()=>{
   const file=input.files[0]; if(!file)return;
   try { const parsed=parse((await file.text()).replace(/^\\uFEFF/,'')); if(parsed.length<2)throw Error('ヘッダーとデータ行を含むCSVを選択してください。');
     headers=parsed[0].map(x=>x.trim()); rows=parsed.slice(1);
     const missing=columns.filter(x=>!headers.includes(x)); warning.hidden=!missing.length; warning.textContent=missing.length?'入力CSVに見つからない列: '+missing.join('、'):'';
     head.innerHTML='<tr><th>選択</th><th>CSVヘッダー</th>'+rows.map((_,i)=>'<th>'+(i+1)+'行目</th>').join('')+'</tr>';
     body.innerHTML=headers.map((header,i)=>'<tr><td><input type="checkbox" data-index="'+i+'" '+(columns.includes(header)?'checked':'')+' aria-label="'+esc(header)+'を出力" /></td><th scope="row">'+esc(header)+'</th>'+rows.map(r=>'<td>'+esc(r[i]??'')+'</td>').join('')+'</tr>').join('');
     body.querySelectorAll('input').forEach(x=>x.addEventListener('change',update));
     document.getElementById('fileinfo').textContent=file.name+' · '+rows.length+' 行'; card.hidden=false;update();
   } catch(e){document.getElementById('fileinfo').textContent=e.message;card.hidden=true}
 });
 document.getElementById('all').addEventListener('click',()=>{body.querySelectorAll('input').forEach(x=>x.checked=true);update()});
 document.getElementById('none').addEventListener('click',()=>{body.querySelectorAll('input').forEach(x=>x.checked=false);update()});
 document.getElementById('download').addEventListener('click',()=>{
   const selected=selectedIndexes();
   const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
   const csv=[selected.map(i=>headers[i]),...rows.map(r=>selected.map(i=>r[i]??''))].map(r=>r.map(quote).join(',')).join('\\r\\n');
   const url=URL.createObjectURL(new Blob(['\\uFEFF',csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='selected-columns.csv';a.click();URL.revokeObjectURL(url);
 });
})();`

export default createRoute((c) => c.render(
  <main class="page">
    <header><a class="brand" href="/">CSV <span>SELECT</span></a><small>ブラウザ内で安全に処理</small></header>
    <section class="hero"><p class="eyebrow">CSV WORKFLOW / CLOUDFLARE</p><h1>必要な列を選んで、<br /><span>すばやく書き出す。</span></h1><p>CSVを読み込み、ヘッダーとデータを確認して出力する列を選べます。</p></section>
    <section class="panel"><p class="label">01　CSVファイルを読み込む</p><label class="drop" for="file"><input id="file" type="file" accept=".csv,text/csv" /><b>↑</b><strong>CSVファイルを選択</strong><span>クリック、またはここにファイルをドロップ</span></label><p id="fileinfo" class="info">ファイルはサーバーへ送信されません。</p></section>
    <section id="results" class="panel" hidden><div class="tabletop"><div><p class="label">02　出力する列を選ぶ</p><span id="count">0 列を選択中</span></div><div><button id="all" class="link" type="button">すべての列を選択</button><button id="none" class="link" type="button">選択解除</button></div></div><p id="warning" class="warning" hidden></p><div class="scroll"><table><thead id="headers"></thead><tbody id="rows"></tbody></table></div><button id="download" class="download" type="button" disabled>↓　選択した列をCSVで保存</button></section>
    <footer>CSV SELECT <span>必要なデータを、必要な分だけ。</span></footer>
    <script dangerouslySetInnerHTML={{ __html: script }} />
  </main>, { title: 'CSV Select — 必要な列だけ書き出す' }
))
