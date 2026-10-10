"""ネイティブ設定を書き換える(何度流しても同じ結果)。npx cap add の直後と、作り直したときに1回流す。
python scripts/patch_native.py
- Android: 縦固定・カメラの権限・古い機種だけ写真保存の権限・版番号 3 / 1.1.0・公開用の署名(鍵は環境変数で渡す)
- iOS: 表示名・日本語・iPhone専用・縦固定・暗号化の申告・カメラと写真の説明文"""
import re
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
NAME = 'ネガイロ'


def patch(path: Path, pairs):
    s = path.read_text(encoding='utf-8')
    for old, new in pairs:
        if new in s:
            continue
        assert old in s, (path.name, old[:70])
        s = s.replace(old, new, 1)
    path.write_text(s, encoding='utf-8', newline='\n')


# ---------- Android ----------
man = APP / 'android/app/src/main/AndroidManifest.xml'
patch(man, [
    ('            android:launchMode="singleTask"\n',
     '            android:launchMode="singleTask"\n            android:screenOrientation="portrait"\n'),
    ('    <uses-permission android:name="android.permission.INTERNET" />\n',
     '    <uses-permission android:name="android.permission.INTERNET" />\n'
     '    <!-- 撮影画面(WebView のカメラ)。写真はこの端末の中で加工するだけ -->\n'
     '    <uses-permission android:name="android.permission.CAMERA" />\n'
     '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n'
     '    <!-- Android 9 以前だけ、写真の保存に必要 -->\n'
     '    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />\n'),
])
strings = APP / 'android/app/src/main/res/values/strings.xml'
s = strings.read_text(encoding='utf-8')
s = re.sub(r'<string name="app_name">[^<]*</string>', f'<string name="app_name">{NAME}</string>', s)
s = re.sub(r'<string name="title_activity_main">[^<]*</string>', f'<string name="title_activity_main">{NAME}</string>', s)
strings.write_text(s, encoding='utf-8', newline='\n')

gradle = APP / 'android/app/build.gradle'
s = gradle.read_text(encoding='utf-8')
s = re.sub(r'versionCode \d+', 'versionCode 3', s)
s = re.sub(r'versionName "[^"]*"', 'versionName "1.1.0"', s)
gradle.write_text(s, encoding='utf-8', newline='\n')
patch(gradle, [
    ('    buildTypes {\n        release {\n',
     '    // 公開用の署名。鍵とパスワードは scripts/build-android.ps1 が環境変数で渡す(リポジトリには置かない)\n'
     '    signingConfigs {\n        release {\n            if (System.getenv("NEGAIRO_UPLOAD_STORE")) {\n'
     '                storeFile file(System.getenv("NEGAIRO_UPLOAD_STORE"))\n'
     '                storePassword System.getenv("NEGAIRO_UPLOAD_PASSWORD")\n'
     '                keyAlias "negairo-upload"\n'
     '                keyPassword System.getenv("NEGAIRO_UPLOAD_PASSWORD")\n            }\n        }\n    }\n'
     '    buildTypes {\n        release {\n            if (System.getenv("NEGAIRO_UPLOAD_STORE")) signingConfig signingConfigs.release\n'),
])

# ---------- iOS ----------
plist = APP / 'ios/App/App/Info.plist'
s = plist.read_text(encoding='utf-8')
s = re.sub(r'(<key>CFBundleDisplayName</key>\s*<string>)[^<]*(</string>)', rf'\g<1>{NAME}\g<2>', s)
plist.write_text(s, encoding='utf-8', newline='\n')
patch(plist, [
    ('\t<key>CFBundleDevelopmentRegion</key>\n\t<string>en</string>',
     '\t<key>CFBundleDevelopmentRegion</key>\n\t<string>ja</string>'),
    ('\t<key>LSRequiresIPhoneOS</key>\n',
     '\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>\n'
     '\t<key>NSCameraUsageDescription</key>\n\t<string>写真を撮って、その場でフィルム風の効果をかけるためにカメラを使います。映像は端末の外へ送りません。</string>\n'
     '\t<key>NSPhotoLibraryAddUsageDescription</key>\n\t<string>効果をかけた写真を、新しい写真として「写真」に保存します。元の写真は書き換えません。</string>\n'
     # 写真ライブラリ全体の許可(NSPhotoLibraryUsageDescription)は使わないので入れない(2026-10-07)
     '\t<key>LSRequiresIPhoneOS</key>\n'),
    ('\t\t<string>armv7</string>', '\t\t<string>arm64</string>'),
])
# 縦固定(iPhone の並びだけ。iPad 用の並びは iPhone 専用にするので触らない)
s = plist.read_text(encoding='utf-8')
s = s.replace('\t<key>UISupportedInterfaceOrientations</key>\n\t<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t\t<string>UIInterfaceOrientationLandscapeLeft</string>\n\t\t<string>UIInterfaceOrientationLandscapeRight</string>\n\t</array>',
              '\t<key>UISupportedInterfaceOrientations</key>\n\t<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t</array>')
plist.write_text(s, encoding='utf-8', newline='\n')
pbx = APP / 'ios/App/App.xcodeproj/project.pbxproj'
s = pbx.read_text(encoding='utf-8')
s = s.replace('TARGETED_DEVICE_FAMILY = "1,2";', 'TARGETED_DEVICE_FAMILY = 1;').replace('MARKETING_VERSION = 1.0;', 'MARKETING_VERSION = 1.0.0;')
pbx.write_text(s, encoding='utf-8', newline='\n')

export = APP / 'ios/ExportOptions.plist'
export.write_text('''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<!-- Export straight to App Store Connect (TestFlight). teamID is filled in by CI. -->
	<key>method</key>
	<string>app-store-connect</string>
	<key>destination</key>
	<string>upload</string>
	<key>signingStyle</key>
	<string>automatic</string>
	<key>teamID</key>
	<string>SET_BY_CI</string>
	<key>uploadSymbols</key>
	<true/>
	<key>manageAppVersionAndBuildNumber</key>
	<false/>
</dict>
</plist>
''', encoding='utf-8', newline='\n')
print('ok')
