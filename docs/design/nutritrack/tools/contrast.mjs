// Usage: node contrast.mjs  — computes WCAG contrast for key token pairs in tokens.css
import fs from 'node:fs';
const css = fs.readFileSync(new URL('../tokens.css', import.meta.url), 'utf8');
function block(sel){ const i=css.indexOf(sel+' {'); const j=css.indexOf('}',i); return css.slice(i,j); }
function vars(b){ const o={}; for(const m of b.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)) o[m[1]]=m[2]; return o; }
const light = vars(block(':root'));
const dark = { ...light, ...vars(block('[data-theme="dark"]')) };
const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const cr=(a,b)=>{const[x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05)};
const pairs=[
 ['text','bg',4.5],['text','surface',4.5],['text-muted','surface',4.5],['text-muted','bg',4.5],['text-faint','surface',4.5],['text-faint','surface-2',4.5],
 ['primary-contrast','primary',4.5],['primary-contrast','primary-hover',4.5],['primary','surface',4.5],['link','bg',4.5],['primary-soft-text','primary-soft',4.5],
 ['danger','surface',4.5],['danger','danger-soft',4.5],['warning','warning-soft',4.5],['success','success-soft',4.5],
 ['macro-protein-text','surface',4.5],['macro-carb-text','surface',4.5],['macro-fat-text','surface',4.5],
 ['border-strong','surface',3],['border-strong','bg',3],['focus','surface',3],['focus','bg',3],
 ['macro-protein','surface',3],['macro-carb','surface',3],['macro-fat','surface',3],['kcal','surface',3],['water','surface',3],
 ['macro-protein','track',3],['macro-carb','track',3],['macro-fat','track',3],['kcal','track',3],['water','track',3],
];
let fail=0; const rows=[];
for(const [name,t] of [['light',light],['dark',dark]]) for(const [f,b,min] of pairs){const r=cr(t[f],t[b]);const ok=r>=min;if(!ok)fail++;rows.push(`| ${name} | ${f} ${t[f]} | ${b} ${t[b]} | ${r.toFixed(2)} | ≥${min} | ${ok?'✅':'❌'} |`)}
console.log('| Theme | Foreground | Background | Ratio | Yêu cầu | Đạt |\n|---|---|---|---|---|---|\n'+rows.join('\n'));
console.error(fail?`FAIL: ${fail}`:'ALL PASS'); process.exit(fail?1:0);
