import os,re,sys
sys.path.insert(0,os.path.dirname(__file__))
import importlib.util
spec=importlib.util.spec_from_file_location('b',os.path.join(os.path.dirname(__file__),'build.py')); b=importlib.util.module_from_spec(spec); spec.loader.exec_module(b)
R=b.R
css=open(os.path.join(R,'tokens.css')).read()
def blk(sel):
    i=css.index(sel+' {'); return dict(re.findall(r'--([\w-]+):\s*(#[0-9A-Fa-f]{6})',css[i:css.index('}',i)]))
L=blk(':root'); D={**L,**blk('[data-theme="dark"]')}
names=['bg','surface','surface-2','border','border-strong','text','text-muted','text-faint','primary','primary-hover','primary-soft','danger','warning','success','info','focus','macro-protein','macro-carb','macro-fat','kcal','water','track']
def sw(T): return '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px">'+''.join(f'<div style="border:1px solid #999;border-radius:8px;overflow:hidden;font-size:11px"><div style="height:36px;background:{T[n]}"></div><div style="padding:4px 6px;background:#fff;color:#111"><b>{n}</b><br>{T[n]}</div></div>' for n in names if n in T)+'</div>'
rows=[l for l in open(os.path.join(R,'contrast-report.md')).read().splitlines() if l.startswith('| ') and 'Theme' not in l]
def tbl(th): return '<table class="t" style="font-size:11px">'+''.join('<tr>'+''.join(f'<td>{c.strip()}</td>' for c in r.strip('|').split('|')[1:])+'</tr>' for r in rows if r.split('|')[1].strip()==th)+'</table>'
comp='''
<div class="grid g3"><div class="card"><h3>Button</h3><span class="btn">Chính</span><span class="btn sec">Phụ</span><span class="btn ghost">Ghost</span><span class="btn dng">Nguy hiểm</span><span class="faint">Cao ≥44px. Focus: viền 3px var(--focus).</span></div>
<div class="card"><h3>Input / Segmented / Chip / Toggle</h3><div class="in">Nhập…</div><div class="seg"><span class="on">Nữ</span><span>Nam</span></div><div><span class="chip on">Duy trì</span> <span class="chip">Giảm cân</span></div><div class="tog"></div></div>
<div class="card"><h3>Ring progress</h3>'''+b.ring()+'''</div>
<div class="card"><h3>Macro bar (màu + hoa văn + chữ cái)</h3>'''+b.macs()+'''</div>
<div class="card"><h3>List item món</h3>'''+b.li('Phở bò','1 tô · 450g','480')+'''</div>
<div class="card"><h3>Toast / Empty state</h3><div class="toast">'''+b.ic('check')+''' Đã thêm Phở bò</div><div class="empty">'''+b.ic('book',28)+'''<b>Chưa có dữ liệu</b><span class="btn">Hành động</span></div></div>
<div class="card"><h3>Chart (xu hướng)</h3>'''+b.trend()+'''</div>
<div class="card"><h3>Bottom nav</h3><div style="border:1px solid var(--border)">'''+b.bnav(0)+'''</div></div>
<div class="card"><h3>Modal / Sheet</h3><div style="position:relative;height:160px;overflow:hidden;border-radius:12px"><div class="ov"></div><div class="sheet"><b>Tiêu đề sheet</b><span class="btn">Xác nhận</span></div></div></div></div>'''
def sec(t,x): return f'<section class="card" style="margin-bottom:16px"><h3 style="font-size:20px">{t}</h3>{x}</section>'
type_=''.join(f'<div style="font-size:{s};font-weight:{w}">{n} — {s} · Thực đơn dinh dưỡng Việt Nam ăn ơ ư đ</div>' for n,s,w in [('Number 40','2.5rem',700),('H1 28','1.75rem',700),('H2 22','1.375rem',600),('Body 16','1rem',400),('Small 14','.875rem',400),('Caption 12','.75rem',400)])
sp='<div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">'+''.join(f'<div style="text-align:center;font-size:11px"><div style="width:{p}px;height:{p}px;background:var(--primary)"></div>{p}</div>' for p in [4,8,12,16,20,24,32,40,48])+'</div>'
rad='<div style="display:flex;gap:16px">'+''.join(f'<div style="text-align:center;font-size:11px"><div style="width:64px;height:64px;border:2px solid var(--primary);border-radius:{r}px"></div>{n} {r}</div>' for n,r in [('sm',8),('md',12),('lg',16),('xl',24),('full',999)])+'</div>'
el='<div style="display:flex;gap:20px">'+''.join(f'<div style="width:120px;height:70px;background:var(--surface);border-radius:12px;box-shadow:var(--shadow-{i});display:grid;place-items:center;font-size:12px">shadow-{i}</div>' for i in (1,2,3))+'</div>'
icons='<div style="display:flex;gap:14px;flex-wrap:wrap">'+''.join(f'<div style="text-align:center;font-size:11px;width:60px">{b.ic(k,28)}<br>{k}</div>' for k in b.IC)+'</div>'
def body(theme):
    return (sec('Màu — '+theme,sw(L if theme=='light' else D))+sec('Kiểm tra tương phản ('+theme+')  — tất cả ✅ ≥ AA',tbl(theme)))
b.page('design-system-light.html','NutriTrack Design System — Light','Tokens: tokens.css · font Be Vietnam Pro (OFL) · icon Lucide (ISC) · lưới 4px',
  body('light')+sec('Typography',type_)+sec('Spacing (lưới 4px)',sp)+sec('Radius',rad)+sec('Elevation',el)+sec('Icon set — Lucide (ISC, miễn phí)',icons)+sec('Components',comp),'light',1400)
b.page('design-system-dark.html','NutriTrack Design System — Dark','Cùng cấu trúc, token dark',
  body('dark')+sec('Components',comp)+sec('Ngữ nghĩa màu','<p>kcal = xanh lá · Đạm (P) = xanh dương/sọc chéo · Tinh bột (C) = cam/chấm · Béo (F) = hồng tím/ô lưới · Nước = xanh nước. Không chỉ dựa màu: luôn kèm chữ cái và hoa văn.</p>'),'dark',1400)
