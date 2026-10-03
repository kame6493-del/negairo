/**
 * 課金の設定をここにまとめる(RevenueCat)。
 * キーは公開APIキー(秘密鍵ではない)。空のままなら購入ボタンは「購入は準備中」になり、課金は走らない。
 */
export const BILLING = {
  /** App Store / Google Play の商品ID(非消耗型・買い切り) */
  productId: 'negairo_full',
  /** RevenueCat の権利(entitlement)名 */
  entitlement: 'full',
  /** 表示用の値段(ストアから取れないときの目安) */
  fallbackPrice: '¥500',
  revenuecat: { ios: '', android: '' },
};

export const APP_NAME = 'ネガイロ';
export const SUPPORT_URL = 'https://kame6493-del.github.io/negairo-site/';
export const PRIVACY_URL = 'https://kame6493-del.github.io/negairo-site/privacy.html';
