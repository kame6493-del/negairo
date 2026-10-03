import { Capacitor } from '@capacitor/core';
import { Media } from '@capacitor-community/media';

const ALBUM = 'ネガイロ';

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });
}

async function androidAlbum(): Promise<string> {
  const find = async () => (await Media.getAlbums()).albums.find((a) => a.name === ALBUM)?.identifier;
  let id = await find();
  if (!id) {
    await Media.createAlbum({ name: ALBUM });
    id = await find();
  }
  if (!id) throw new Error('アルバムを作れませんでした');
  return id;
}

/** 新しい写真として端末の写真に加える。元の写真には触れない */
export async function savePhoto(blob: Blob, fileName: string): Promise<'photos' | 'download'> {
  if (Capacitor.isNativePlatform()) {
    const path = await blobToDataUrl(blob);
    if (Capacitor.getPlatform() === 'android') await Media.savePhoto({ path, albumIdentifier: await androidAlbum(), fileName });
    else await Media.savePhoto({ path });
    return 'photos';
  }
  // ブラウザ(開発・確認用): ダウンロードにする
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.jpg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'download';
}

export function photoFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `negairo_${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
}
