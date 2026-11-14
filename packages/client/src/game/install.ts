/**
 * "Ana ekrana ekle": Chrome'un kendiliğinden çıkan "uygulamayı yükle" şeridi bastırılır; istek saklanır ve
 * yalnız oyuncu Ayarlar'daki düğmeye basınca gösterilir.
 */
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let pending: InstallEvent | null = null;
const subs = new Set<() => void>();
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pending = e as InstallEvent; subs.forEach((f) => f()); });
window.addEventListener('appinstalled', () => { pending = null; subs.forEach((f) => f()); });
export const installAvailable = () => !!pending;
export const onInstallChange = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export async function promptInstall(): Promise<boolean> {
  if (!pending) return false;
  const e = pending; pending = null; subs.forEach((f) => f());
  await e.prompt();
  return (await e.userChoice).outcome === 'accepted';
}
