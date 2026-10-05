export type PointerWorld = "brand" | "farm" | "ride" | "dine" | "health" | "travel";
export interface WorldPointer { setWorld(world: PointerWorld): void; destroy(): void }
/** Replaces the mouse arrow with a glowing dot and a themed buddy that follows it (fine pointers only). */
export function createWorldPointer(options?: { world?: PointerWorld }): WorldPointer;
