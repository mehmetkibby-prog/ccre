# 8 — Adı geçen scope'lar AsyncLocalStorage değil

command-failure-scope SQL hatasını güvenli kaydeder ve komut SAVEPOINT'i
yönetir. player-write-scope TEMP trigger ile değişen oyuncuları izler.
shared-refresh-scope yine TEMP trigger ile etkilenmiş tabloları belirler.
Bu üç katman AsyncLocalStorage kapsamları değildir; birleştirilmedi.

Gerçek combatContext AsyncLocalStorage, bellekte tutulabilen savaş işlemiyle
kalıcı ödülü ayırır. Bu sınırı kaldırmak davranış ve kalıcılık değiştirir.
CPU örneklerindeki propagate maliyeti tek başına hangi güvenlik bağlamının
gereksiz olduğunu kanıtlamaz. Bu öneride üretim kodu değiştirilmedi.
