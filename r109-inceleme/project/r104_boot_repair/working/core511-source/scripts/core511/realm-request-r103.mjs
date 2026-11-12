// One request-scoped controller works on browsers without AbortSignal.any or
// AbortSignal.timeout. Cleanup runs for success, rejection and cancellation.
export async function requestRealmR103(fetcher, url, {signal, body, csrf, timeoutMs = 10000} = {}) {
  const controller = new AbortController();
  const cancel = () => controller.abort(signal?.reason);
  let timer;
  try {
    if (signal?.aborted) cancel();
    else signal?.addEventListener('abort', cancel, {once: true});
    if (controller.signal.aborted) throw Object.assign(new Error('Cancelled'), {name: 'AbortError'});
    timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetcher(url, {
      cache: 'no-store', credentials: 'same-origin', signal: controller.signal,
      ...(body ? {method: 'POST', headers: {'content-type': 'application/json', 'x-csrf-token': csrf}, body: JSON.stringify(body)} : {}),
    });
    const data = await response.json();
    if (!response.ok) throw Object.assign(Error(data?.error || 'Bağlantı kurulamadı. Yeniden dene.'), {status: response.status});
    return data;
  } catch (error) {
    if (controller.signal.aborted || error?.name === 'AbortError' || error?.name === 'TimeoutError') {
      throw Error('Bağlantı zaman aşımına uğradı. Yeniden dene.');
    }
    if (error?.name === 'SyntaxError') throw Error('Sunucu yanıtı okunamadı. Yeniden dene.');
    if (error instanceof TypeError) throw Error('Bağlantı kurulamadı. Yeniden dene.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}
