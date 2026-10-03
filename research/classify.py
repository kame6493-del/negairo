# レビューを不満の種類ごとに数える(キーワード一致。1件が複数に入る)
import json, re
R=json.load(open('reviews.json',encoding='utf-8'))
CATS={
 '画質が悪い・荒い':r'画質|荒い|粗い|ガビガビ|解像度|ぼやけ|低画質|劣化',
 '保存・書き出しの不具合':r'保存|書き出|消え|保存でき',
 '落ちる・動かない':r'落ちる|クラッシュ|起動しな|フリーズ|動かな|開かな|バグ',
 '課金・サブスク':r'課金|サブスク|有料|返金|お金|買った|購入',
 '広告':r'広告',
 '日付の不満':r'日付|日時|デート',
 '加工の選択(後から)':r'カメラロール|後から|既存|ライブラリ|インポート|読み込',
 '効果が強すぎ・調整したい':r'強すぎ|調整|強さ|濃すぎ|薄く',
 'シャッター音・遅い':r'シャッター音|音が|遅い|ラグ|もっさり',
}
rows=[]
for aid,v in R.items():
    rs=v['reviews']
    if not rs: continue
    low=[r for r in rs if r['rating']<=2]
    cnt={k:sum(1 for r in low if re.search(p,r['title']+r['body'])) for k,p in CATS.items()}
    avg=sum(r['rating'] for r in rs)/len(rs)
    rows.append((v['name'],len(rs),round(avg,2),len(low),cnt,rs[0]['date'],rs[-1]['date']))
    print(v['name'],len(rs),round(avg,2),'low',len(low),{k:c for k,c in cnt.items() if c},rs[-1]['date'],'~',rs[0]['date'])
json.dump(rows,open('review_summary.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
