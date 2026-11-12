// Decode once at the transport boundary. Reuse this object for handshake,
// lease, ping and gameplay processing instead of reparsing the same packet.
export function readRealtimeMessage(data: unknown): Record<string, unknown> | null {
  if (typeof data !== 'string') return null;
  try {
    const value: unknown = JSON.parse(data);
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown> : null;
  } catch { return null; }
}
