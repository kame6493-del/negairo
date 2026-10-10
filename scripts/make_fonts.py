"""画面の手書き風の文字(Klee One)と題字(Zen Old Mincho)を、アプリで使う字だけに絞って woff2 にする。
どちらも SIL Open Font License 1.1(src/assets/fonts/OFL.txt)。元の ttf は %LOCALAPPDATA%/NegairoBuild/fonts に置く
(https://github.com/google/fonts の ofl/kleeone と ofl/zenoldmincho)。文言を変えたら流し直す。
python scripts/make_fonts.py"""
import glob, os
from fontTools import subset

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(os.environ['LOCALAPPDATA'], 'NegairoBuild', 'fonts')
OUT = os.path.join(APP, 'src', 'assets', 'fonts')
os.makedirs(OUT, exist_ok=True)

text = ''
for p in glob.glob(os.path.join(APP, 'src', '**', '*.ts*'), recursive=True):
    text += open(p, encoding='utf-8').read()
chars = sorted({c for c in text if ord(c) > 0x2000}) + [chr(c) for c in range(0x20, 0x7f)]
chars = ''.join(chars) + '「」『』、。・…ー〜！？０１２３４５６７８９'
print(len(chars), 'chars')

for src, name in (('KleeOne-SemiBold.ttf', 'klee-semibold.woff2'), ('ZenOldMincho-Black.ttf', 'zenold-black.woff2')):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    font = subset.load_font(os.path.join(SRC, src), opts)
    s = subset.Subsetter(opts)
    s.populate(text=chars)
    s.subset(font)
    subset.save_font(font, os.path.join(OUT, name), opts)
    print(name, os.path.getsize(os.path.join(OUT, name)))

with open(os.path.join(OUT, 'OFL.txt'), 'w', encoding='utf-8') as f:
    f.write('Klee One: ' + open(os.path.join(SRC, 'OFL_klee.txt'), encoding='utf-8').read().split('\n')[0] + '\n')
    f.write('Zen Old Mincho: ' + open(os.path.join(SRC, 'OFL_zen.txt'), encoding='utf-8').read().split('\n')[0] + '\n\n')
    f.write(open(os.path.join(SRC, 'OFL_klee.txt'), encoding='utf-8').read().split('\n', 2)[2])
