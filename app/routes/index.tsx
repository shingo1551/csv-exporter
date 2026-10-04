import { createRoute } from 'honox/factory'

// 出力したいCSVヘッダーをここに設定します。入力CSVの1行目と完全一致させてください。
const OUTPUT_COLUMNS = ['名前', 'メールアドレス', '電話番号']

const script = `
(() => {
 const columns = ${JSON.stringify(OUTPUT_COLUMNS)};
 const input = document.getElementById('file');
 const card = document.getElementById('results');
 const body = document.getElementById('rows');
 const head = document.getElementById('headers');
 const warning = document.getElementById('warning');
 let headers = [], rows = [], indexes = [];
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
 function update(){const checks=[...body.querySelectorAll('input')], n=checks.filter(x=>x.checked).length;document.getElementById('count').textContent=n+' 行を選択中';document.getElementById('download').disabled=!n}
 input.addEventListener('change',async()=>{
   const file=input.files[0]; if(!file)return;
   try { const parsed=parse((await file.text()).replace(/^\\uFEFF/,'')); if(parsed.length<2)throw Error('ヘッダーとデータ行を含むCSVを選択してください。');
     headers=parsed[0].map(x=>x.trim()); rows=parsed.slice(1); indexes=columns.map(x=>headers.indexOf(x)).filter(i=>i>=0);
     const missing=columns.filter(x=>!headers.includes(x)); warning.hidden=!missing.length; warning.textContent=missing.length?'入力CSVに見つからない列: '+missing.join('、'):'';
     head.innerHTML='<tr><th>選択</th>'+indexes.map(i=>'<th>'+esc(headers[i])+'</th>').join('')+'</tr>';
     body.innerHTML=rows.map((r,i)=>'<tr><td><input type="checkbox" checked aria-label="'+(i+1)+'行目" /></td>'+indexes.map(j=>'<td>'+esc(r[j]||'')+'</td>').join('')+'</tr>').join('');
     body.querySelectorAll('input').forEach(x=>x.addEventListener('change',update));
     document.getElementById('fileinfo').textContent=file.name+' · '+rows.length+' 行'; card.hidden=false;update();
   } catch(e){document.getElementById('fileinfo').textContent=e.message;card.hidden=true}
 });
 document.getElementById('all').addEventListener('click',()=>{body.querySelectorAll('input').forEach(x=>x.checked=true);update()});
 document.getElementById('none').addEventListener('click',()=>{body.querySelectorAll('input').forEach(x=>x.checked=false);update()});
 document.getElementById('download').addEventListener('click',()=>{
   const selected=[...body.querySelectorAll('input')].map((x,i)=>x.checked?rows[i]:null).filter(Boolean);
   const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
   const csv=[indexes.map(i=>headers[i]),...selected.map(r=>indexes.map(i=>r[i]||''))].map(r=>r.map(quote).join(',')).join('\\r\\n');
   const url=URL.createObjectURL(new Blob(['\\uFEFF',csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='selected-rows.csv';a.click();URL.revokeObjectURL(url);
 });
})();`

export default createRoute((c) => c.render(
  <main class="page">
    <header><a class="brand" href="/">CSV <span>SELECT</span></a><small>ブラウザ内で安全に処理</small></header>
    <section class="hero"><p class="eyebrow">CSV WORKFLOW / CLOUDFLARE</p><h1>必要な行と列だけ、<br /><span>すばやく書き出す。</span></h1><p>CSVを読み込み、出力する行を選んでダウンロード。出力列はソースコードで設定できます。</p></section>
    <section class="panel"><p class="label">01　CSVファイルを読み込む</p><label class="drop" for="file"><input id="file" type="file" accept=".csv,text/csv" /><b>↑</b><strong>CSVファイルを選択</strong><span>クリック、またはここにファイルをドロップ</span></label><p id="fileinfo" class="info">ファイルはサーバーへ送信されません。</p></section>
    <section id="results" class="panel" hidden><div class="tabletop"><div><p class="label">02　出力する行を選ぶ</p><span id="count">0 行を選択中</span></div><div><button id="all" class="link" type="button">すべて選択</button><button id="none" class="link" type="button">選択解除</button></div></div><p id="warning" class="warning" hidden></p><div class="scroll"><table><thead id="headers"></thead><tbody id="rows"></tbody></table></div><button id="download" class="download" type="button" disabled>↓　選択した行をCSVで保存</button></section>
    <footer>CSV SELECT <span>必要なデータを、必要な分だけ。</span></footer>
    <script dangerouslySetInnerHTML={{__html: script}} />
  </main>, { title: 'CSV Select — 必要な行だけ書き出す' }
))
