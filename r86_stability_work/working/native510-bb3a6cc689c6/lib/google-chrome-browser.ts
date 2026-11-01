type BrowserInfo = {
  userAgent: string;
  userAgentData?: { brands?: { brand: string }[] };
};

export function isGoogleChromeBrowser(browser: BrowserInfo): boolean {
  const ua = browser.userAgent;
  // Other Chromium browsers commonly include Chrome/ in their user agent.
  if (/Edg(?:A|iOS)?\/|OPR\/|OPiOS\/|Opera|Firefox\/|FxiOS\/|SamsungBrowser\/|Vivaldi\/|YaBrowser\/|Whale\/|Brave\/|DuckDuckGo\/|; wv[;) ]/i.test(ua)) return false;

  const brands = browser.userAgentData?.brands?.map(item => item.brand.toLowerCase()) ?? [];
  if (brands.some(brand => /edge|opera|brave|vivaldi|samsung|duckduckgo/.test(brand))) return false;
  if (brands.includes("google chrome")) return true;
  if (brands.length > 0) return false;

  return /(?:Chrome|CriOS)\/\d+/i.test(ua);
}
