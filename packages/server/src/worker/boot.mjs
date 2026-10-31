// Geliştirme modunda worker'ı TypeScript kaynağından başlatır. Üretimde derlenmiş dist/channel.js kullanılır.
import { register } from 'tsx/esm/api';
register();
await import('./channel.ts');
