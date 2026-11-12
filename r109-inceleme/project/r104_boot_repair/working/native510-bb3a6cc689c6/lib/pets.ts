export const PET_DEFINITIONS = {
  starter: {name:"Başlangıç Tilkisi",price:0,attack:10,experienceMultiplier:1},
  dragon: {name:"Çekirdek Ejderhası",price:0,attack:45,experienceMultiplier:1},
  bird: { name: "Işık Kanadı", price: 200, attack: 20, experienceMultiplier: 1.1 },
  monkey: { name: "Minik Usta", price: 200, attack: 20, experienceMultiplier: 1.1 },
  dog: { name: "Orman Bekçisi", price: 200, attack: 20, experienceMultiplier: 1.1 },
} as const;

export type PetKind = keyof typeof PET_DEFINITIONS;

export function isPetKind(value: unknown): value is PetKind {
  return typeof value === "string" && value in PET_DEFINITIONS;
}

export function validPetName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.normalize("NFC").trim().replace(/\s+/g," ");
  return /^[\p{L}\p{N}][\p{L}\p{N} '’-]{1,17}$/u.test(name) ? name : null;
}

export function petExperienceReward(reward: number, hasEquippedPet: boolean) {
  return Math.max(0, Math.round(reward * (hasEquippedPet ? 1.1 : 1)));
}

// UI totals mirror the existing combat rules without applying the pet twice in combat.
export function petBonuses(kind: unknown) {
  const pet=isPetKind(kind)?PET_DEFINITIONS[kind]:null;
  return {hp:kind==="starter"?350:0,attack:pet?.attack??0,strongPlayers:kind==="dragon"?10:0,resistantPlayers:kind==="dragon"?10:0,experiencePercent:pet?Math.round((pet.experienceMultiplier-1)*100):0};
}
