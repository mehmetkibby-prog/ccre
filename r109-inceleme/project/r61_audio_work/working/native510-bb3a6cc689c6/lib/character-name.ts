export function characterNameKey(name: string) {
  return name.normalize("NFKC").toLocaleLowerCase("tr-TR").replace(/ı/g, "i").replace(/\s+/gu, "");
}
