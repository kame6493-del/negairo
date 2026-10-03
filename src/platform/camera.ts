/** 端末のカメラ(WebView の getUserMedia)。映像はこの端末の中で描くだけで、どこにも送らない */
export async function openCamera(facing: 'environment' | 'user'): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('この端末ではカメラを使えません');
  const tries: MediaStreamConstraints[] = [
    { audio: false, video: { facingMode: facing, width: { ideal: 4032 }, height: { ideal: 3024 }, aspectRatio: { ideal: 4 / 3 } } },
    { audio: false, video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } } },
    { audio: false, video: { facingMode: facing } },
  ];
  let last: unknown;
  for (const c of tries) {
    try {
      return await navigator.mediaDevices.getUserMedia(c);
    } catch (e) {
      last = e;
      if ((e as Error)?.name === 'NotAllowedError') break;
    }
  }
  throw last instanceof Error ? last : new Error('カメラを開けませんでした');
}

export function stopCamera(s: MediaStream | null) {
  s?.getTracks().forEach((t) => t.stop());
}

export function cameraErrorMessage(e: unknown): string {
  const n = (e as Error)?.name;
  if (n === 'NotAllowedError') return 'カメラの使用が許可されていません。設定アプリでネガイロのカメラを許可してください。';
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return '使えるカメラが見つかりませんでした。';
  return 'カメラを開けませんでした。写真を選んで加工することはできます。';
}
