export const ICON_NAMES = [
  "plus",
  "search",
  "check",
  "close",
  "minus",
  "info",
  "warning",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export function iconUrl(name: string): string {
  const file = (ICON_NAMES as readonly string[]).includes(name) ? name : "plus";
  return `/icons/${file}.svg`;
}

export function isIconName(value: string): value is IconName {
  return (ICON_NAMES as readonly string[]).includes(value);
}
