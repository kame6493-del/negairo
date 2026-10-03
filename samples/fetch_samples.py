# 見本写真: Wikimedia Commons の CC0 写真(2000px に縮小して取得)と scikit-image 同梱の CC0/パブリックドメイン画像
import json, urllib.request, urllib.parse, re, os, shutil
import skimage, skimage.io as io
UA={'User-Agent':'NegairoSampleFetch/0.1 (kame6493@gmail.com)'}
FILES={
 'night_tower':'File:Tokyo Tower Christmas illumination.jpg',
 'sunset_beach':'File:La Fajana beach sunset, La Palma.jpg',
 'portrait':'File:Portrait (90606475).jpeg',
 'cat_cafe':'File:Cat on table at a cat cafe.jpg',
 'flowers':'File:20250818 garden flowers Katowice.jpg',
 'tokyo_building':'File:Aging Office Building, Tokyo, Japan (51947121339).jpg',
}
lines=['# 見本写真の出典','','比較画像・ストア画面写真に使う見本。すべて著作権の制約なし(CC0 またはパブリックドメイン)。','','| ファイル | 出典 | 作者 | ライセンス |','|---|---|---|---|']
for key,title in FILES.items():
    u='https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode({'action':'query','titles':title,'prop':'imageinfo','iiprop':'url|extmetadata','iiurlwidth':2000,'format':'json'})
    d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=30))
    p=list(d['query']['pages'].values())[0]; ii=p['imageinfo'][0]; m=ii['extmetadata']
    lic=m['LicenseShortName']['value']; artist=re.sub('<[^>]+>','',m.get('Artist',{}).get('value','')).strip()
    assert lic in ('CC0','Public domain'), (title,lic)
    src=ii.get('thumburl') or ii['url']
    data=urllib.request.urlopen(urllib.request.Request(src,headers=UA),timeout=60).read()
    open(key+'.jpg','wb').write(data)
    lines.append(f"| {key}.jpg | {ii['descriptionurl']} | {artist} | {lic} |")
    print(key,len(data),lic)
SK={'astronaut':'NASA(パブリックドメイン) https://flic.kr/p/r9qvLn','coffee':'Rachel Michetti(CC0)','chelsea':'Stefan van der Walt(CC0)','rocket':'SpaceX(パブリックドメイン)'}
import skimage.data as sd
for k,s in SK.items():
    io.imsave(k+'.png',getattr(sd,k)())
    lines.append(f'| {k}.png | scikit-image {skimage.__version__} 同梱データ skimage.data.{k} | {s.split("(")[0]} | {s.split("(")[1].rstrip(")").split(")")[0]} |')
open('SOURCES.md','w',encoding='utf-8').write('\n'.join(lines)+'\n')
