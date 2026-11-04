# Generates wireframe + design-system HTML (static). Run: python3 tools/build.py
import os, json
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = os.path.join(R, 'wireframes'); os.makedirs(W, exist_ok=True)

IC = {  # Lucide-style 24px stroke icons (Lucide: ISC license)
 'home':'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
 'book':'<path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M8 8h8"/>',
 'drop':'<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
 'chart':'<path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6"/>',
 'cog':'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
 'plus':'<path d="M12 5v14M5 12h14"/>','search':'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
 'chef':'<path d="M6 14a4 4 0 1 1 2-7 4 4 0 0 1 8 0 4 4 0 1 1 2 7v6H6z"/>','cal':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 'scale':'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 9a5 5 0 0 1 8 0"/><path d="M12 9l2-2"/>',
 'copy':'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
 'moon':'<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z"/>','bell':'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
 'user':'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>','back':'<path d="M15 5l-7 7 7 7"/>','x':'<path d="M6 6l12 12M18 6L6 18"/>',
 'check':'<path d="M5 12l5 5 9-10"/>','flame':'<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
}
def ic(n,s=22): return f'<svg class="ic" width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{IC[n]}</svg>'

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0}
body{font-family:var(--font-sans);background:#E7EAE5;color:var(--text);font-size:14px;line-height:1.45;padding:24px}
h1.pg{font-size:20px;margin-bottom:4px} p.sub{color:#4A5A50;margin-bottom:20px;font-size:13px}
.row{display:flex;gap:28px;align-items:flex-start;flex-wrap:nowrap}
.lbl{font-size:12px;font-weight:600;color:#4A5A50;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em}
.phone{width:390px;height:844px;background:var(--bg);border:1px solid var(--border-strong);border-radius:28px;overflow:hidden;position:relative;display:flex;flex-direction:column;flex:none}
.desk{width:1440px;height:900px;background:var(--bg);border:1px solid var(--border-strong);border-radius:10px;overflow:hidden;display:flex;position:relative}
.scroll{flex:1;overflow:hidden;padding:16px;display:flex;flex-direction:column;gap:12px}
.top{display:flex;align-items:center;gap:8px;padding:14px 16px 4px;font-weight:700;font-size:var(--fs-lg)}
.top .sp{flex:1}
.bnav{display:flex;border-top:1px solid var(--border);background:var(--surface);padding:6px 4px 14px}
.bnav a{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;color:var(--text-muted);padding:6px 0;min-height:44px}
.bnav a.on{color:var(--primary);font-weight:700}
.side{width:var(--sidebar-w);background:var(--surface);border-right:1px solid var(--border);padding:20px 12px;display:flex;flex-direction:column;gap:4px;flex:none}
.side .brand{font-weight:700;font-size:18px;color:var(--primary);padding:0 12px 16px}
.side a{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:var(--r-md);color:var(--text-muted);min-height:44px}
.side a.on{background:var(--primary-soft);color:var(--primary-soft-text);font-weight:600}
.main{flex:1;padding:28px 32px;display:flex;flex-direction:column;gap:16px;overflow:hidden}
.main h1{font-size:var(--fs-2xl)}
.grid{display:grid;gap:16px}.g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:repeat(3,1fr)}.g21{grid-template-columns:2fr 1fr}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:16px;box-shadow:var(--shadow-1);display:flex;flex-direction:column;gap:10px}
.card h3{font-size:var(--fs-md);font-weight:600}
.muted{color:var(--text-muted)} .faint{color:var(--text-faint);font-size:12px}
.big{font-size:var(--fs-3xl);font-weight:700;line-height:1;font-variant-numeric:tabular-nums}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 18px;border-radius:var(--r-md);background:var(--primary);color:var(--primary-contrast);font-weight:600;border:0;font-family:inherit;font-size:14px}
.btn.sec{background:var(--surface);color:var(--text);border:1px solid var(--border-strong)}.btn.ghost{background:transparent;color:var(--link)}.btn.block{width:100%}
.btn.dng{background:var(--danger-soft);color:var(--danger)}
.in{min-height:44px;border:1.5px solid var(--border-strong);border-radius:var(--r-md);background:var(--surface);padding:10px 12px;display:flex;align-items:center;gap:8px;color:var(--text-muted)}
.fld{display:flex;flex-direction:column;gap:4px}.fld b{font-size:13px;font-weight:600}
.seg{display:flex;border:1.5px solid var(--border-strong);border-radius:var(--r-md);overflow:hidden}.seg span{flex:1;text-align:center;padding:10px 4px;min-height:44px;display:flex;align-items:center;justify-content:center;font-size:13px}
.seg .on{background:var(--primary-soft);color:var(--primary-soft-text);font-weight:700}
.chip{display:inline-flex;align-items:center;padding:6px 12px;border-radius:999px;background:var(--surface-2);font-size:13px;min-height:32px;border:1px solid var(--border)}
.chip.on{background:var(--primary-soft);color:var(--primary-soft-text);border-color:var(--primary);font-weight:600}
.li{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);min-height:56px}
.li:last-child{border:0}.li .t{flex:1}.li .t b{display:block;font-weight:600}.li .t span{font-size:12px;color:var(--text-muted)}
.li .k{font-weight:600;font-variant-numeric:tabular-nums}
.thumb{width:40px;height:40px;border-radius:var(--r-sm);background:var(--surface-2);border:1px dashed var(--border-strong);flex:none}
.bar{height:10px;border-radius:99px;background:var(--track);overflow:hidden}.bar i{display:block;height:100%;border-radius:99px}
.p{background:var(--macro-protein);background-image:repeating-linear-gradient(45deg,rgba(255,255,255,.35) 0 3px,transparent 3px 7px)}
.c{background:var(--macro-carb);background-image:radial-gradient(rgba(255,255,255,.55) 1.2px,transparent 1.6px);background-size:6px 6px}
.f{background:var(--macro-fat);background-image:repeating-linear-gradient(45deg,rgba(255,255,255,.35) 0 2px,transparent 2px 6px),repeating-linear-gradient(-45deg,rgba(255,255,255,.35) 0 2px,transparent 2px 6px)}
.w{background:var(--water)}
.mac{display:flex;flex-direction:column;gap:4px}.mac .h{display:flex;justify-content:space-between;font-size:13px;font-weight:600}
.tP{color:var(--macro-protein-text)}.tC{color:var(--macro-carb-text)}.tF{color:var(--macro-fat-text)}
.ring{width:180px;height:180px;border-radius:50%;background:conic-gradient(var(--kcal) 0 64%,var(--track) 0);display:grid;place-items:center;flex:none}
.ring>div{width:144px;height:144px;border-radius:50%;background:var(--surface);display:flex;flex-direction:column;align-items:center;justify-content:center}
.ring.sm{width:96px;height:96px}.ring.sm>div{width:74px;height:74px}
.fab{position:absolute;right:16px;bottom:84px;width:56px;height:56px;border-radius:50%;background:var(--primary);color:var(--primary-contrast);display:grid;place-items:center;box-shadow:var(--shadow-2)}
.sheet{position:absolute;left:0;right:0;bottom:0;background:var(--surface);border-radius:24px 24px 0 0;box-shadow:var(--shadow-3);padding:12px 16px 20px;display:flex;flex-direction:column;gap:12px}
.sheet:before{content:"";width:40px;height:4px;border-radius:2px;background:var(--border-strong);margin:0 auto}
.ov{position:absolute;inset:0;background:var(--overlay)}
.chartbox{height:150px;border:1px dashed var(--border-strong);border-radius:var(--r-md);position:relative;overflow:hidden;background:repeating-linear-gradient(0deg,transparent 0 29px,var(--chart-grid) 29px 30px)}
.chartbox svg{position:absolute;inset:0;width:100%;height:100%}
.empty{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;padding:20px;color:var(--text-muted)}
.toast{background:var(--text);color:var(--bg);padding:12px 16px;border-radius:var(--r-md);display:flex;gap:10px;align-items:center;box-shadow:var(--shadow-2)}
.tag{font-size:11px;padding:2px 8px;border-radius:99px;background:var(--warning-soft);color:var(--warning);font-weight:600}
.note{font-size:12px;color:#4A5A50;max-width:390px;margin-top:8px}
.steps{display:flex;gap:6px}.steps i{flex:1;height:4px;border-radius:2px;background:var(--track)}.steps i.on{background:var(--primary)}
table.t{width:100%;border-collapse:collapse}table.t td,table.t th{padding:8px;border-bottom:1px solid var(--border);text-align:left;font-size:13px}
.tog{width:44px;height:26px;border-radius:99px;background:var(--primary);position:relative;flex:none}.tog:after{content:"";position:absolute;right:3px;top:3px;width:20px;height:20px;border-radius:50%;background:var(--primary-contrast)}
.tog.off{background:var(--border-strong)}.tog.off:after{right:auto;left:3px;background:#fff}
"""
def page(name, title, sub, body, theme='light', width=None):
    html=f'''<!doctype html><html lang="vi" data-theme="{theme}"><head><meta charset="utf-8"><title>{title}</title>
<link rel="stylesheet" href="../tokens.css"><style>{CSS}</style></head><body style="{f'width:{width}px' if width else 'width:max-content'}"><h1 class="pg">{title}</h1><p class="sub">{sub}</p>{body}</body></html>'''
    open(os.path.join(W,name),'w').write(html)

def bnav(on):
    items=[('home','Hôm nay'),('book','Nhật ký'),('drop','Nước & cân'),('chart','Báo cáo'),('cog','Cài đặt')]
    return '<nav class="bnav">'+''.join(f'<a class="{"on" if k==on else ""}">{ic(i)}<span>{t}</span></a>' for k,(i,t) in enumerate(items))+'</nav>'
def side(on):
    items=[('home','Hôm nay'),('book','Nhật ký & tìm món'),('drop','Nước & cân nặng'),('chart','Báo cáo'),('chef','Công thức & thực đơn'),('cog','Cài đặt')]
    return '<aside class="side"><div class="brand">NutriTrack</div>'+''.join(f'<a class="{"on" if k==on else ""}">{ic(i)}{t}</a>' for k,(i,t) in enumerate(items))+'<div style="flex:1"></div><a>'+ic('moon')+'Sáng / Tối</a></aside>'
def phone(label, inner, nav=None, note=''):
    return f'<div><div class="lbl">{label}</div><div class="phone">{inner}{bnav(nav) if nav is not None else ""}</div><p class="note">{note}</p></div>'
def desk(label, on, inner, note=''):
    return f'<div><div class="lbl">{label}</div><div class="desk">{side(on)}<div class="main">{inner}</div></div><p class="note" style="max-width:none">{note}</p></div>'
def mac(l,cls,cur,tot,tc,ltr):
    pct=min(100,int(cur/tot*100))
    return f'<div class="mac"><div class="h"><span class="{tc}">{ltr} · {l}</span><span>{cur} / {tot} g</span></div><div class="bar" role="progressbar" aria-valuenow="{cur}" aria-valuemax="{tot}"><i class="{cls}" style="width:{pct}%"></i></div></div>'
def macs(): return mac('Đạm','p',78,130,'tP','P')+mac('Tinh bột','c',165,220,'tC','C')+mac('Béo','f',42,60,'tF','F')
def ring(sm=False): return f'<div class="ring {"sm" if sm else ""}" role="img" aria-label="Còn 720 kcal"><div><span class="big" style="font-size:{"22px" if sm else "36px"}">720</span><span class="faint">kcal còn lại</span></div></div>'
def li(t,s,k,thumb=True,extra=''): return f'<div class="li">{"<div class=thumb></div>" if thumb else ""}<div class="t"><b>{t}</b><span>{s}</span></div>{extra}<span class="k">{k}</span></div>'
def fld(l,v='',hint=''): return f'<div class="fld"><b>{l}</b><div class="in">{v}</div>{f"<span class=faint>{hint}</span>" if hint else ""}</div>'
def trend(): return '<div class="chartbox"><svg viewBox="0 0 300 150" preserveAspectRatio="none"><polyline fill="none" stroke="var(--chart-line)" stroke-width="3" points="0,40 40,48 80,55 120,52 160,70 200,78 240,92 300,100"/><polyline fill="none" stroke="var(--text-faint)" stroke-dasharray="5 4" stroke-width="2" points="0,45 300,105"/></svg></div>'
def bars(n=7,h=None):
    h=h or [70,85,60,95,80,40,65]
    return '<div class="chartbox" style="display:flex;align-items:flex-end;gap:10px;padding:0 12px">'+''.join(f'<div style="flex:1;height:{x}%;background:var(--kcal);border-radius:6px 6px 0 0"></div>' for x in h[:n])+'</div>'
def meals():
    return ''.join(f'<div class="card" style="padding:12px"><div class="li" style="padding:0;border:0;min-height:44px"><div class="t"><b>{m}</b><span>{d}</span></div><span class="k">{k} kcal</span><span class="btn sec" style="min-height:36px;padding:0 10px">{ic("plus",18)}</span></div></div>' for m,d,k in [('Sáng','Phở bò, cà phê sữa','520'),('Trưa','Cơm gà, canh rau','680'),('Tối','Chưa ghi','0'),('Phụ','Sữa chua, chuối','180')])

# ---------- 1 Onboarding ----------
m1=phone('1a · Đăng ký','<div class="scroll" style="justify-content:center;gap:16px"><div class="big" style="font-size:28px;color:var(--primary)">NutriTrack</div><p class="muted">Theo dõi dinh dưỡng đơn giản, đẹp và đầy đủ.</p>'+fld('Email','email@vidu.com')+fld('Mật khẩu','••••••••','Tối thiểu 8 ký tự')+'<span class="btn block">Tạo tài khoản</span><span class="btn sec block">Tiếp tục với Google</span><p class="faint" style="text-align:center">Đã có tài khoản? <u>Đăng nhập</u></p></div>',None,'Trạng thái lỗi: viền + chữ danger, icon + câu "Email chưa đúng định dạng".')
m1+=phone('1b · Hồ sơ (bước 2/4)','<div class="top">'+ic('back')+'Hồ sơ của bạn</div><div class="scroll"><div class="steps"><i class=on></i><i class=on></i><i></i><i></i></div>'+'<div class="fld"><b>Giới tính</b><div class="seg"><span class=on>Nữ</span><span>Nam</span><span>Khác</span></div></div>'+fld('Tuổi','28 tuổi')+'<div class="grid g2">'+fld('Chiều cao','165 cm')+fld('Cân nặng','58 kg')+'</div><div class="fld"><b>Mức vận động</b><div class="seg"><span>Ít</span><span class=on>Vừa</span><span>Nhiều</span></div><span class="faint">Vừa: tập 3–4 buổi/tuần</span></div><div class="fld"><b>Mục tiêu</b><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="chip">Giảm cân</span><span class="chip on">Duy trì</span><span class="chip">Tăng cân</span><span class="chip">Tăng cơ</span></div></div><div style="flex:1"></div><span class="btn block">Tiếp tục</span></div>',None,'Đơn vị metric mặc định; đổi trong Cài đặt.')
m1+=phone('1c · Kết quả mục tiêu','<div class="top">'+ic('back')+'Mục tiêu của bạn</div><div class="scroll"><div class="card" style="align-items:center"><span class="faint">Mỗi ngày bạn nên nạp</span><span class="big">1.980 <small style="font-size:16px">kcal</small></span><span class="faint">TDEE 1.980 · mục tiêu duy trì</span></div><div class="card"><h3>Chia macro</h3>'+macs()+'<span class="btn sec">Chỉnh tay</span></div><div class="card"><div class="li" style="padding:0;border:0"><div class="t"><b>Nước uống</b><span>Gợi ý theo cân nặng</span></div><span class="k">2.000 ml</span></div></div><div style="flex:1"></div><span class="btn block">Bắt đầu theo dõi</span></div>',None,'Chỉnh tay: mở sheet với slider/stepper kcal + % macro, tổng luôn = 100%.')
d1=desk('1 · Onboarding desktop (đăng ký + hồ sơ + kết quả, dạng wizard 2 cột)',-1,'<h1>Hồ sơ của bạn</h1><div class="steps" style="max-width:520px"><i class=on></i><i class=on></i><i></i><i></i></div><div class="grid g2" style="gap:32px;align-items:start"><div class="card" style="gap:14px">'+'<div class="fld"><b>Giới tính</b><div class="seg"><span class=on>Nữ</span><span>Nam</span><span>Khác</span></div></div><div class="grid g3">'+fld('Tuổi','28')+fld('Chiều cao','165 cm')+fld('Cân nặng','58 kg')+'</div><div class="fld"><b>Mức vận động</b><div class="seg"><span>Ít</span><span class=on>Vừa</span><span>Nhiều</span></div></div><div class="fld"><b>Mục tiêu</b><div style="display:flex;gap:8px"><span class="chip">Giảm cân</span><span class="chip on">Duy trì</span><span class="chip">Tăng cân</span><span class="chip">Tăng cơ</span></div></div><span class="btn" style="align-self:flex-end">Tiếp tục</span></div><div class="card" style="gap:14px"><h3>Xem trước mục tiêu</h3><div style="display:flex;gap:24px;align-items:center">'+ring()+'<div style="flex:1;display:flex;flex-direction:column;gap:10px">'+macs()+'</div></div><span class="btn sec" style="align-self:flex-start">Chỉnh tay kcal / macro</span></div></div>')

# ---------- 2 Dashboard ----------
dash_m='<div class="top"><span style="flex:1">Hôm nay, 4/11</span>'+ic('cal')+'</div><div class="scroll"><div class="card" style="flex-direction:row;align-items:center;gap:16px">'+ring(True)+'<div style="flex:1"><b>1.260 / 1.980 kcal</b><p class="faint">Đã nạp · Mục tiêu</p></div></div><div class="card"><h3>Macro</h3>'+macs()+'</div><div class="card" style="flex-direction:row;align-items:center"><div style="flex:1"><h3>Nước uống</h3><div class="bar" style="margin:8px 0 2px"><i class="w" style="width:60%"></i></div><span class="faint">1.200 / 2.000 ml</span></div><span class="btn sec">+250 ml</span></div>'+meals()+'</div><div class="fab">'+ic('plus',26)+'</div>'
m2=phone('2a · Dashboard',dash_m,0)
m2+=phone('2b · Trạng thái trống (chưa ghi gì)','<div class="top">Hôm nay, 4/11</div><div class="scroll"><div class="card" style="align-items:center">'+ring(True)+'<span class="muted">Còn 1.980 kcal</span></div><div class="card empty">'+ic('book',32)+'<b>Chưa có bữa nào hôm nay</b><span>Ghi bữa đầu tiên để thấy vòng kcal chạy.</span><span class="btn">Ghi bữa sáng</span><span class="btn ghost">Sao chép từ hôm qua</span></div></div>',0)
m2+=phone('2c · Loading / Vượt mục tiêu','<div class="top">Hôm nay, 4/11</div><div class="scroll"><div class="card"><div class="bar" style="height:140px;border-radius:16px"></div><span class="faint">Skeleton khi tải</span></div><div class="card" style="border-color:var(--danger)"><span class="tag" style="background:var(--danger-soft);color:var(--danger)">Vượt 120 kcal</span><b>2.100 / 1.980 kcal</b><div class="bar"><i style="width:100%;background:var(--danger)"></i></div><span class="faint">Vòng đổi sang danger + nhãn chữ, không chỉ dựa màu.</span></div></div>',0)
d2=desk('2 · Dashboard desktop',0,'<div style="display:flex;align-items:center"><h1 style="flex:1">Hôm nay, 4/11</h1><span class="btn">'+ic('plus',18)+' Ghi bữa</span></div><div class="grid g3"><div class="card" style="flex-direction:row;align-items:center;gap:20px">'+ring()+'<div><b>1.260 / 1.980</b><p class="faint">kcal đã nạp</p></div></div><div class="card"><h3>Macro</h3>'+macs()+'</div><div class="card"><h3>Nước uống</h3><div class="bar"><i class="w" style="width:60%"></i></div><span class="faint">1.200 / 2.000 ml</span><div style="display:flex;gap:8px"><span class="btn sec">+250</span><span class="btn sec">+500</span></div></div></div><div class="grid g2">'+meals()+'</div>')

# ---------- 3 Log / search ----------
m3=phone('3a · Ghi bữa / tìm món','<div class="top">'+ic('back')+'Bữa trưa</div><div class="scroll"><div class="in">'+ic('search',18)+'Tìm món, thương hiệu…</div><div style="display:flex;gap:8px"><span class="chip on">Gần đây</span><span class="chip">Hay dùng</span><span class="chip">Tự tạo</span></div><span class="btn sec block">'+ic('copy',18)+' Sao chép bữa hôm qua</span><div class="card" style="padding:4px 12px">'+li('Cơm gà xối mỡ','1 đĩa · 350g','620')+li('Phở bò','1 tô · 450g','480')+li('Canh rau muống','1 chén · 200g','40')+li('Chuối','1 quả · 100g','89')+'</div><div style="flex:1"></div><span class="btn dng" style="justify-content:flex-start">Không thấy món? Tạo món tự tạo</span></div>',1)
m3+=phone('3b · Chọn khẩu phần (bottom sheet)','<div class="scroll" style="opacity:.6"><div class="in">Phở</div></div><div class="ov"></div><div class="sheet"><b style="font-size:18px">Phở bò</b><div class="seg"><span class=on>Khẩu phần</span><span>Gram</span></div><div style="display:flex;align-items:center;justify-content:center;gap:20px"><span class="btn sec">−</span><span class="big">1 tô</span><span class="btn sec">+</span></div><div style="display:flex;gap:8px;justify-content:center"><span class="chip">½ tô</span><span class="chip on">1 tô</span><span class="chip">1½ tô</span></div><div class="card" style="background:var(--surface-2)"><b>480 kcal</b>'+macs()+'</div><span class="btn block">Thêm vào bữa trưa</span></div>')
m3+=phone('3c · Món tự tạo','<div class="top">'+ic('back')+'Tạo món mới</div><div class="scroll">'+fld('Tên món','Bánh mì trứng')+fld('Khẩu phần','1 ổ · 120 g')+'<div class="grid g2">'+fld('Kcal','320')+fld('Chất đạm (g)','12')+fld('Tinh bột (g)','40')+fld('Béo (g)','11')+fld('Chất xơ (g)','3')+fld('Đường (g)','4')+'</div>'+fld('Natri (mg)','480')+'<div style="flex:1"></div><span class="btn block">Lưu món</span></div>',1)
d3=desk('3 · Ghi bữa desktop (tìm kiếm + panel chi tiết)',1,'<h1>Bữa trưa · 4/11</h1><div class="grid" style="grid-template-columns:1.3fr 1fr;align-items:start"><div class="card"><div class="in">'+ic('search',18)+'Tìm món, thương hiệu…</div><div style="display:flex;gap:8px"><span class="chip on">Gần đây</span><span class="chip">Hay dùng</span><span class="chip">Tự tạo</span><span class="btn ghost" style="margin-left:auto;min-height:32px">'+ic('copy',18)+' Sao chép bữa hôm qua</span></div>'+li('Cơm gà xối mỡ','1 đĩa · 350g','620 kcal')+li('Phở bò','1 tô · 450g','480 kcal')+li('Canh rau muống','1 chén · 200g','40 kcal')+li('Chuối','1 quả · 100g','89 kcal')+li('Bánh mì trứng (tự tạo)','1 ổ · 120g','320 kcal')+'</div><div class="card" style="gap:12px"><b style="font-size:18px">Phở bò</b><div class="seg"><span class=on>Khẩu phần</span><span>Gram</span></div><div style="display:flex;align-items:center;justify-content:center;gap:20px"><span class="btn sec">−</span><span class="big">1 tô</span><span class="btn sec">+</span></div>'+macs()+'<span class="btn block">Thêm vào bữa trưa</span><span class="btn ghost block">Tạo món tự tạo</span></div></div>')

# ---------- 4 Water & weight ----------
m4=phone('4a · Nước & cân nặng','<div class="top">Nước & cân nặng</div><div class="scroll"><div class="card"><h3>Nước uống</h3><div style="display:flex;align-items:baseline;gap:6px"><span class="big" style="color:var(--water)">1.200</span><span class="muted">/ 2.000 ml</span></div><div class="bar"><i class="w" style="width:60%"></i></div><div class="grid g3" style="gap:8px"><span class="btn sec">+200</span><span class="btn sec">+250</span><span class="btn sec">+500</span></div></div><div class="card"><h3>Cân nặng</h3><div style="display:flex;justify-content:space-between;align-items:center"><span class="big">58,2 <small style="font-size:16px">kg</small></span><span class="tag" style="background:var(--success-soft);color:var(--success)">−0,6 kg / 30 ngày</span></div><div style="display:flex;gap:8px"><span class="chip">7 ngày</span><span class="chip on">30 ngày</span><span class="chip">90 ngày</span></div>'+trend()+'<span class="faint">Đường nét đứt: xu hướng (trung bình trượt 7 ngày)</span><span class="btn block">Ghi cân nặng</span></div></div>',2)
m4+=phone('4b · Ghi cân nặng (sheet)','<div class="scroll" style="opacity:.6"><div class="card" style="height:300px"></div></div><div class="ov"></div><div class="sheet"><b style="font-size:18px">Cân nặng hôm nay</b><div style="display:flex;justify-content:center;align-items:center;gap:20px"><span class="btn sec">−</span><span class="big">58,2 kg</span><span class="btn sec">+</span></div>'+fld('Ngày','Hôm nay, 4/11')+'<span class="btn block">Lưu</span><div class="toast">'+ic('check')+' Đã lưu 58,2 kg</div></div>')
d4=desk('4 · Nước & cân nặng desktop',2,'<h1>Nước & cân nặng</h1><div class="grid g2"><div class="card"><h3>Nước uống hôm nay</h3><span class="big" style="color:var(--water)">1.200 <small style="font-size:16px" class="muted">/ 2.000 ml</small></span><div class="bar"><i class="w" style="width:60%"></i></div><div style="display:flex;gap:8px"><span class="btn sec">+200</span><span class="btn sec">+250</span><span class="btn sec">+500</span><span class="btn sec">Tuỳ chỉnh</span></div></div><div class="card"><h3>Cân nặng</h3><span class="big">58,2 kg</span>'+fld('Ghi cân nặng','58,2')+'<span class="btn" style="align-self:flex-start">Lưu</span></div></div><div class="card"><h3>Xu hướng cân nặng</h3><div style="display:flex;gap:8px"><span class="chip">7 ngày</span><span class="chip on">30 ngày</span><span class="chip">90 ngày</span></div>'+trend().replace('height:150px','')+'</div>')

# ---------- 5 Reports ----------
m5=phone('5a · Báo cáo tuần','<div class="top">Báo cáo</div><div class="scroll"><div class="seg"><span class=on>Tuần</span><span>Tháng</span></div><div class="card"><h3>Kcal mỗi ngày</h3>'+bars()+'<span class="faint">TB 1.870 / mục tiêu 1.980 kcal</span></div><div class="card"><h3>Macro trung bình</h3>'+mac('Đạm','p',92,130,'tP','P')+mac('Tinh bột','c',201,220,'tC','C')+mac('Béo','f',55,60,'tF','F')+'</div><div class="card"><h3>Chất xơ · Đường · Natri</h3><table class="t"><tr><td>Chất xơ</td><td>22 g</td><td class="muted">≥ 25 g</td></tr><tr><td>Đường</td><td>48 g</td><td class="muted">≤ 50 g</td></tr><tr><td>Natri</td><td>2.600 mg</td><td class="muted">≤ 2.300 mg ⚠</td></tr></table></div><div class="card"><h3>Cân nặng</h3>'+trend()+'</div></div>',3)
d5=desk('5 · Báo cáo desktop',3,'<div style="display:flex"><h1 style="flex:1">Báo cáo</h1><div class="seg" style="width:240px"><span class=on>Tuần</span><span>Tháng</span></div></div><div class="grid g21"><div class="card"><h3>Kcal mỗi ngày</h3>'+bars()+'</div><div class="card"><h3>Macro trung bình</h3>'+mac('Đạm','p',92,130,'tP','P')+mac('Tinh bột','c',201,220,'tC','C')+mac('Béo','f',55,60,'tF','F')+'</div></div><div class="grid g2"><div class="card"><h3>Chất xơ · Đường · Natri</h3><table class="t"><tr><th>Chỉ số</th><th>TB/ngày</th><th>Khuyến nghị</th></tr><tr><td>Chất xơ</td><td>22 g</td><td>≥ 25 g</td></tr><tr><td>Đường</td><td>48 g</td><td>≤ 50 g</td></tr><tr><td>Natri</td><td>2.600 mg</td><td>≤ 2.300 mg ⚠</td></tr></table></div><div class="card"><h3>Cân nặng</h3>'+trend()+'</div></div>')

# ---------- 6 Recipes + meal plan ----------
m6=phone('6a · Công thức','<div class="top">Công thức</div><div class="scroll"><div class="seg"><span class=on>Công thức</span><span>Thực đơn tuần</span></div><div class="card"><b>Salad gà áp chảo</b><span class="faint">4 nguyên liệu · 2 khẩu phần</span>'+li('Ức gà','200 g','330',False)+li('Xà lách','100 g','15',False)+li('Dầu ô liu','10 ml','88',False)+'<span class="btn ghost" style="justify-content:flex-start">'+ic('plus',18)+' Thêm nguyên liệu</span><div class="card" style="background:var(--surface-2)"><b>Mỗi khẩu phần: 217 kcal</b>'+macs()+'</div><span class="btn block">Lưu công thức</span></div></div>',4)
m6+=phone('6b · Thực đơn tuần','<div class="top">Thực đơn tuần</div><div class="scroll"><div class="seg"><span>Công thức</span><span class=on>Thực đơn tuần</span></div><div style="display:flex;gap:6px"><span class="chip">T2</span><span class="chip on">T3</span><span class="chip">T4</span><span class="chip">T5</span><span class="chip">T6</span></div>'+''.join(f'<div class="card" style="padding:12px"><div class="li" style="padding:0;border:0"><div class="t"><b>{a}</b><span>{b}</span></div><span class="btn sec" style="min-height:36px;padding:0 10px">{ic("plus",18)}</span></div></div>' for a,b in [('Sáng','Yến mạch + chuối'),('Trưa','Salad gà áp chảo'),('Tối','Chưa lên kế hoạch'),('Phụ','—')])+'<span class="btn sec block">Ghi thực đơn này vào nhật ký</span></div>',4)
d6=desk('6 · Công thức + Thực đơn tuần desktop',4,'<div style="display:flex"><h1 style="flex:1">Công thức & thực đơn</h1><span class="btn">'+ic('plus',18)+' Công thức mới</span></div><div class="grid" style="grid-template-columns:1fr 1.4fr;align-items:start"><div class="card"><h3>Salad gà áp chảo</h3>'+li('Ức gà','200 g','330',False)+li('Xà lách','100 g','15',False)+li('Dầu ô liu','10 ml','88',False)+'<span class="btn ghost" style="justify-content:flex-start">+ Thêm nguyên liệu</span><b>Mỗi khẩu phần: 217 kcal</b>'+macs()+'</div><div class="card"><h3>Thực đơn tuần 3–9/11</h3><table class="t"><tr><th></th><th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>T6</th><th>T7</th><th>CN</th></tr>'+''.join(f'<tr><td><b>{r}</b></td>'+''.join('<td style="color:var(--text-faint)">'+('Salad gà' if (r=="Trưa" and i%2==0) else '+')+'</td>' for i in range(7))+'</tr>' for r in ['Sáng','Trưa','Tối','Phụ'])+'</table><span class="faint">Kéo-thả công thức vào ô. Tổng kcal/ngày hiển thị dưới mỗi cột.</span></div></div>')

# ---------- 7 Settings ----------
def row(t,s,right): return f'<div class="li" style="min-height:52px"><div class="t"><b>{t}</b><span>{s}</span></div>{right}</div>'
m7=phone('7a · Cài đặt','<div class="top">Cài đặt</div><div class="scroll"><div class="card" style="padding:4px 16px">'+row('Hồ sơ','Nữ · 28 tuổi · 165 cm · 58 kg',ic('back').replace('<svg','<svg style="transform:rotate(180deg)"'))+row('Mục tiêu','1.980 kcal · P130 C220 F60',ic('back').replace('<svg','<svg style="transform:rotate(180deg)"'))+'</div><div class="card" style="padding:4px 16px">'+row('Nhắc uống nước','Mỗi 2 giờ, 8:00–20:00','<div class="tog"></div>')+row('Nhắc ghi bữa','12:30 · 19:30','<div class="tog"></div>')+'</div><div class="card"><b>Giao diện</b><div class="seg"><span>Sáng</span><span class=on>Tối</span><span>Hệ thống</span></div><b>Đơn vị</b><div class="seg"><span class=on>kg · cm · ml</span><span>lb · ft · oz</span></div></div><span class="btn dng block">Đăng xuất</span></div>',4)
d7=desk('7 · Cài đặt desktop',5,'<h1>Cài đặt</h1><div class="grid g2"><div class="card"><h3>Hồ sơ</h3><div class="grid g2">'+fld('Tuổi','28')+fld('Giới tính','Nữ')+fld('Chiều cao','165 cm')+fld('Cân nặng','58 kg')+'</div></div><div class="card"><h3>Mục tiêu</h3><div class="grid g2">'+fld('Kcal / ngày','1.980')+fld('Nước (ml)','2.000')+fld('Đạm (g)','130')+fld('Béo (g)','60')+'</div></div><div class="card"><h3>Nhắc nhở</h3>'+row('Nước','Mỗi 2 giờ','<div class="tog"></div>')+row('Ghi bữa','12:30 · 19:30','<div class="tog off"></div>')+'</div><div class="card"><h3>Giao diện & đơn vị</h3><div class="seg"><span>Sáng</span><span class=on>Tối</span><span>Hệ thống</span></div><div class="seg"><span class=on>kg · cm · ml</span><span>lb · ft · oz</span></div></div></div>')

# write pages (mobile)
for i,(n,t,m,d) in enumerate([('1-onboarding','Onboarding / Hồ sơ / Kết quả mục tiêu',m1,d1),('2-dashboard','Dashboard hôm nay',m2,d2),('3-ghi-bua','Ghi bữa / tìm món',m3,d3),('4-nuoc-can','Nước & cân nặng',m4,d4),('5-bao-cao','Báo cáo tuần/tháng',m5,d5),('6-cong-thuc','Công thức + thực đơn tuần',m6,d6),('7-cai-dat','Cài đặt',m7,d7)]):
    sub='Wireframe low-fi · mobile 390px · token từ tokens.css (light)'
    page(f'mobile-{n}.html',f'{t} — Mobile',sub,f'<div class="row">{m}</div>')
    page(f'desktop-{n}.html',f'{t} — Desktop',sub.replace('mobile 390px','desktop 1440px'),d,width=1490)
# dark variant of dashboard
page('mobile-2-dashboard-dark.html','Dashboard — Mobile (dark mode)','Cùng layout, token dark','<div class="row">'+phone('2a · Dashboard (dark)',dash_m,0)+phone('7a · Cài đặt (dark)','<div class="top">Cài đặt</div><div class="scroll"><div class="card" style="padding:4px 16px">'+row('Nhắc uống nước','Mỗi 2 giờ','<div class="tog"></div>')+'</div><div class="card"><b>Giao diện</b><div class="seg"><span>Sáng</span><span class=on>Tối</span><span>Hệ thống</span></div></div></div>',4)+'</div>','dark')
page('desktop-2-dashboard-dark.html','Dashboard — Desktop (dark mode)','Cùng layout, token dark',d2,'dark',1490)

# ---------- Flow ----------
def node(t,s=''): return f'<div class="card" style="width:210px;min-height:96px;justify-content:center;text-align:center"><b>{t}</b><span class="faint">{s}</span></div>'
arrow='<div style="align-self:center;font-size:28px;color:var(--text-muted)">→</div>'
flow='<div class="row" style="align-items:stretch;flex-wrap:wrap;max-width:1500px">'+arrow.join([node('Đăng ký','email / Google'),node('Hồ sơ 4 bước','giới tính · tuổi · chiều cao/cân · vận động · mục tiêu'),node('Kết quả mục tiêu','kcal / macro / nước · chỉnh tay'),node('Dashboard hôm nay','vòng kcal · macro · nước · 4 bữa')])+'</div><div style="height:24px"></div><div class="row" style="align-items:stretch;flex-wrap:wrap;max-width:1500px">'+node('Dashboard','nhấn + hoặc nút bữa')+arrow+node('Tìm món','gần đây · hay dùng · tự tạo')+arrow+node('Chọn khẩu phần / gram','sheet · xem trước macro')+arrow+node('Thêm vào bữa','toast "Đã thêm" → về Dashboard, vòng kcal cập nhật')+'</div><div style="height:24px"></div><div class="card" style="max-width:900px"><h3>Nhánh phụ</h3><ul style="margin-left:18px"><li>Không tìm thấy món → Tạo món tự tạo → quay lại chọn khẩu phần.</li><li>Có bữa hôm trước → "Sao chép bữa hôm qua" → xác nhận → Dashboard.</li><li>Tab Nước & cân: ghi nhanh +250 ml / nhập cân nặng → xu hướng.</li><li>Báo cáo, Công thức, Thực đơn, Cài đặt: điều hướng qua bottom nav (mobile) / sidebar (desktop).</li></ul></div>'
page('user-flow.html','User flow chính: Onboarding → Dashboard → Ghi bữa','Sơ đồ luồng',flow,width=1500)
print('ok')
