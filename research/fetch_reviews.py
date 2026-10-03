# 上位の買い切りカメラ(と大手の Dazz/Huji)の日本のレビュー RSS(新しい順・最大2ページ)を取る
import json, urllib.request, time
APPS={'6760838876':'オルディ Oldi','6741474933':'Berryフィルム','1313164055':'EE35','6443723657':'filmhwa','1436429074':'FILCA','1668551706':'Filmil',
'342115564':'Hipstamatic','679454835':'Rarevision VHS','406541444':'8ミリカメラ','1422471180':'Dazz','781383622':'Huji Cam','6755822636':'GIKA','6813093709':'ディカログ'}
out={}
for aid,name in APPS.items():
    rs=[]
    for page in (1,2):
        u=f'https://itunes.apple.com/jp/rss/customerreviews/page={page}/id={aid}/sortby=mostrecent/json'
        try: d=json.load(urllib.request.urlopen(u,timeout=30))
        except Exception as e: print(name,'err',e); break
        es=d.get('feed',{}).get('entry',[])
        if isinstance(es,dict): es=[es]
        for e in es:
            if 'im:rating' not in e: continue
            rs.append({'date':e['updated']['label'][:10],'rating':int(e['im:rating']['label']),'title':e['title']['label'],'body':e['content']['label']})
        time.sleep(1)
    out[aid]={'name':name,'reviews':rs}
    print(name,len(rs))
json.dump(out,open('reviews.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
