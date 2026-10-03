# App Store 日本 写真/ビデオ(6008) の有料・売上ランキングと、上位カメラの詳細・レビューを取る
import json, urllib.request, time
def get(u):
    for i in range(3):
        try: return json.load(urllib.request.urlopen(u, timeout=30))
        except Exception as e: err=e; time.sleep(2)
    raise err
out={}
for kind in ['toppaidapplications','topgrossingapplications']:
    d=get(f'https://itunes.apple.com/jp/rss/{kind}/limit=100/genre=6008/json')
    out[kind]=[{'rank':i+1,'id':e['id']['attributes']['im:id'],'name':e['im:name']['label'],'price':e['im:price']['label'],'artist':e['im:artist']['label']} for i,e in enumerate(d['feed']['entry'])]
ids=[x['id'] for x in out['toppaidapplications']]
look={}
for i in range(0,len(ids),50):
    d=get('https://itunes.apple.com/lookup?country=jp&id='+','.join(ids[i:i+50]))
    for r in d['results']:
        look[str(r['trackId'])]={k:r.get(k) for k in ['trackName','price','averageUserRating','userRatingCount','releaseDate','currentVersionReleaseDate','description','sellerName','genres']}
out['lookup']=look
json.dump(out,open('rank.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('ok',len(look))
