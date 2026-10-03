# ネガイロ(フィルム風・昔のカメラ風カメラ)公開までの状態と手順

広告なし・買い切りのカメラ/フィルター。撮影画面で効果を見ながら撮る/選んだ写真にかける。加工は全部端末の中(WebGL2)。

## 1. 市場(App Store 日本 写真/ビデオ、2026-10-03 取得)
取得: `research/fetch_rank.py`(有料・売上ランキング RSS と Lookup)、`research/fetch_reviews.py`(レビュー RSS、新しい順 最大100件)、`research/classify.py`(不満の分類)。生データは `research/rank.json` `research/reviews.json`。

### 有料ランキングに入っている「写りの味」を売るカメラ
| 有料順位 | アプリ | 値段 | 評価件数(平均) | 味 | 作り手 |
|---|---|---|---|---|---|
| 2 | オルディ Oldi | ¥150 | 19 (4.58) | 旧型 iPhone の写り | 個人(2026-03 公開) |
| 3 | Berryフィルム | ¥300 | 102 (4.86) | 韓国風フィルム(インフルエンサー) | 個人 |
| 6 | EE35 フィルムカメラ | ¥300 | 995 (3.84) | 1960年代フィルムカメラ・日付 | 小規模 |
| 7 | YoungPhoto | ¥350 | 10 (3.0) | エモい構図・色 | 個人 |
| 9 | filmhwa | ¥500 | 1,295 (4.78) | 落ち着いたフィルム(インフルエンサー) | 小規模 |
| 15 | Rarevision VHS | ¥1,000 | 472 (4.59) | VHS・日付 | 小規模 |
| 27 | IIWII | ¥300 | 2 | アナログフィルム | 個人 |
| 34 | 8ミリカメラ | ¥600 | 111 (4.30) | 8mm フィルム | 小規模 |
| 50 | ディカログ | ¥100 | 0 | 2000年代 CCD デジカメ(2026-09-23 公開) | 小規模 |
| 53 | FILCA | ¥600 | 1,412 (4.22) | 一眼レフ風フィルム | 小規模 |
| 66 | Hipstamatic | ¥800 | 246 (4.61) | トイカメラ | 小規模 |
| 87 | Rewind 96 | ¥150 | 1 | 90年代のカメラ | 個人(2026-10-01 公開) |
| 93 | Filmil | ¥300 | 80 (4.64) | 35mm フィルム | 個人 |
| 99 | GIKA | ¥200 | 9 (5.0) | オールドフォン | 個人 |
売上ランキング(無料+課金)では Dazz(フィルムカメラ)が56位。上位は大手の加工・AI アプリ。

どの味が払われているか: フィルム(使い捨て・35mm・日付入りを含む)が最多で長く売れている(EE35 2017年〜、FILCA 2018年〜、filmhwa 2022年〜)。2026年は「旧機種の写り」(オルディ2位、GIKA、ディカログ、Rewind 96)が新しく伸びている。→ 方向: 主はフィルムと使い捨て+日付、昔の機種(平成デジカメ・ガラケー)を完全版の目玉に足す。値段は実例の中心(¥300〜¥600)から ¥500。

### レビューの不満(★1〜2、新しい順最大100件のうち)
| アプリ | 件数 | 平均 | ★1〜2 | 多い不満 |
|---|---|---|---|---|
| FILCA | 100 | 2.50 | 55 | 課金(追加料金・買ったのに使えない)24、保存14、落ちる10、日付7 |
| Hipstamatic | 100 | 3.00 | 40 | 日付13、課金7、落ちる5 |
| EE35 | 100 | 3.23 | 32 | 課金して開けない(起動しない)11、落ちる8 |
| Huji Cam | 100 | 3.63 | 24 | 課金8、カメラロールの写真を加工できない・遅い5 |
| Rarevision VHS | 100 | 4.25 | 14 | 取り込んだ動画の加工で落ちる6 |
| filmhwa | 100 | 4.57 | 6 | 効果の%調整ができない、動画が読めない |
| Dazz | 100 | 4.38 | 7 | — |
声の例: 「効果の程度をパーセントで指定できるのが最高(FILCA)」「最後に使ったフィルターから始めたい(Berry)」「普通のカメラで撮った写真を読み込んで加工したい(EE35)」「日付をオフにしても反映されない(EE35)」「偽の撮影日に変えたい(VHS)」「3:2 のために買ったら追加料金(FILCA)」。

→ 入れたもの: 効果の強さ 0〜100%、最後の味から始める、写真を選んで加工、日付のあり/なしと日付の変更、追加の課金なし(1回だけ)、元の写真は書き換えない。

## 2. 作ったもの
- 効果10種(自作の式。他社の LUT・素材は使っていない): `src/fx/presets.ts`
  - 無料: ナツイロ(カラーネガ)/ステカメ(使い捨て・フラッシュ・日付)/モノクロ400
  - 完全版: スキトオリ/マナツ/ヨルノヒカリ(ハレーション)/アセタ/インスタント(白枠)/平成デジカメ(2048px・輪郭強調・色ノイズ)/ガラケー(640px で作って 1280px に拡大)
- 描画: `src/fx/renderer.ts` + `src/fx/shaders.ts`(WebGL2)。色の転がしは式から作る 33³ の 3D LUT(`src/fx/color.ts`、RGBA16F)。粒子(写真の短辺に比例した大きさ・明るさで量を変える)、周辺減光、光もれ(写真ごとに形が変わる)、ハレーション(縮小前にしきい値→ぼかし、周りの平均の明るさで抑える)、色ずれ、四隅の甘さ、日付(7セグメントをシェーダーで描く。書体ファイル不使用)
- 保存: 長辺最大 4032px の JPEG(品質 0.95)。iOS は「写真」、Android は「ネガイロ」アルバムへ新しい写真として追加(@capacitor-community/media)。元の写真は読むだけ
- 課金: `src/config.ts` に集約。商品ID `negairo_full`(非消耗型・¥500)、entitlement `full`。RevenueCat キーは空 → 製品ビルドでは「購入は準備中です」(押せない)。疑似購入は開発ビルド(ブラウザ)だけ
- 無料版の保存には左下に小さく「ネガイロ」。広告はどちらにも無い

## 3. 画質の確かめ方と直したこと
見本写真は CC0・パブリックドメインのみ(`samples/SOURCES.md` に出典)。`scripts/fx_compare.py`(全効果×見本の比較)と `scripts/fx_detail.py`(原寸の切り抜き)で、本物の描画処理を通した画像を目で見た。比較画像は `research/compare/`(最終: v2_a.jpg / v2_b.jpg)。
- ヨルノヒカリ: 1回目は昼の空がピンクに染まり、2回目は窓枠が赤い線になった → 縮小前に明るさで切る方式+周りの平均の明るさで抑える方式に変えて、夜の街灯だけが赤くにじむようにした
- 平成デジカメ: 色ノイズが虹色の砂のようで安っぽかった → 色ノイズを大きく・弱く、輪郭強調と色ずれを下げた
- ガラケー: ただのくすんだ写真で味が無かった → 低画素の角を少し残す拡大・緑がかった色・飛んだ明部・ノイズを足した
- 光もれ: 緑の上で黄緑に濁った → 赤〜橙に寄せた
- スキトオリ: ナツイロと見分けがつかなかった → 明るさ・黒の浮き・にじみを上げた

## 4. 確かめたこと(2026-10-04)
1. 単体テスト 26件 全部通過(`npx vitest run`): 色の式・LUT・半精度・全味で灰色の階調が反転しない・日付の形と7セグメント・出力の大きさ・枠・無料/完全版・設定の検査
2. `npm run build` 通過
3. E2E `scripts/e2e.py`(Playwright・偽のカメラ映像)
   - 製品ビルド(vite preview で dist): 15/15 OK。撮影画面に効果つきの映像(1280px・真っ黒でない)→ 撮る → 保存(JPEG 3840x2160)→ 写真を選ぶ → 強さ60%・光もれ・日付 1999-07-21 → 保存(原寸 2048x1563 のまま)→ 元のファイルが変わっていない → 完全版の味で保存 → 課金画面(「購入は準備中です」で押せない)→ 戻る → 設定 → 開き直して最後の味が残る → console error 0
   - 開発ビルド(疑似購入): 13/13 OK。購入 → インスタントを白枠つき(2236x2001)で保存
4. 画面写真を目で見て直した: トーストの改行、課金画面の効果名の改行、効果の一言の折り返し(短くした)、選んだ味が帯の外に隠れる、加工画面の下の空白
5. ストア素材 `store/`: icon_1024.png、ios_shot_1〜5.png(1290x2796)、listing_ios.md、privacy.md、tester_post.txt / `store/play/`: icon_512.png、feature_1024x500.png、play_shot_1〜5.png(1080x1920)、listing.md、privacy.md、data_safety.md、content_rating.md
6. Android: 署名済み AAB と APK。`jarsigner -verify` → jar verified(署名者 CN=Negairo)。AAB の中の画面ファイルが最新の dist と同じ名前であることを確認

## 5. アプリの情報
| | |
|---|---|
| appId(iOS・Android 共通) | jp.negairo.app |
| 表示名 | ネガイロ |
| 版 | versionCode 1 / versionName 1.0.0(iOS MARKETING_VERSION 1.0.0) |
| AAB | releases/negairo-release.aab |
| APK(動作確認用) | releases/negairo-release.apk |
| 署名鍵 | %LOCALAPPDATA%\NegairoBuild\signing\negairo-upload.jks(別名 negairo-upload。パスワードは同じフォルダの upload-password.dpapi に DPAPI で保存。PC を替える前にフォルダごと控える。作り直さない) |
| targetSdk / minSdk | 36 / 24 |
| 権限 | CAMERA、WRITE_EXTERNAL_STORAGE(Android 9 以前だけ)、INTERNET、BILLING ほか |
| iOS の説明文 | NSCameraUsageDescription / NSPhotoLibraryAddUsageDescription / NSPhotoLibraryUsageDescription(日本語) |

作り直すとき: `npm run build` → `npx cap sync` → `python scripts/patch_native.py` → `python scripts/make_icon.py` → `powershell -File scripts/build-android.ps1`(version を上げるときは patch_native.py の versionCode を直す)。

## 6. 持ち主がやること(順番どおり)
1. Play Console でアプリを作る(jp.negairo.app)→ アプリ内アイテム negairo_full ¥500 → クローズドテストに releases/negairo-release.aab を上げる → `store/play/` の掲載文・画像・データセーフティ・レーティングを入れる → `store/tester_post.txt` でテスター募集(12人×14日)
2. RevenueCat にアプリを足し、entitlement `full` と Offering(パッケージ1つ)を作って、公開 API キーを `src/config.ts` の revenuecat へ → 作り直して AAB を上げ直す(versionCode を2へ)
3. プライバシーポリシーの公開ページ(negairo-site。privacy.md の中身)と連絡先メールを決めて、listing の空欄を埋める
4. iOS: App Store Connect でアプリを作り(Bundle ID jp.negairo.app、非消耗型 negairo_full ¥500)、`.github/workflows/ios-testflight.yml` を GitHub に置いて Actions から実行(まず compile_only で1回)。シークレットはニガテ帳と同じ4つ

## 7. 残り・注意
- 実機で未確認: Android はエミュレーターが無く、APK を実機で開いていない。iOS は Windows では組めない。実機で必ず見ること: カメラの許可ダイアログ、撮影画面の速さ(1280px で毎フレーム描画)、getUserMedia が出す画素数(iOS の WebView は 1920x1440 程度の可能性。足りなければ @capacitor/camera で原寸撮影に替える)、写真への保存、前面カメラの左右
- 撮影はシャッター音が出ない(WebView の映像から切り出すため)。日本の端末の慣習とずれるので、気になるなら撮影時に小さな音を鳴らす設定を足す
- サーバー・アカウント・解析・広告は無い。外部 API・外部データは使っていない(RevenueCat のみ)
