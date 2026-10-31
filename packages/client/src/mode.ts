/** Tarayıcı içi test modu (sunucusuz). Normal derlemede false; ölü kod olarak elenir. */
export const OFFLINE = import.meta.env.VITE_OFFLINE === '1';
