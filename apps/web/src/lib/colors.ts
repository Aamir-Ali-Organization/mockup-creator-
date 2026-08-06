export type TeamColorOption = {
  name: string;
  hex: string;
};

/** Common athletic kit colors — tap to fill the field. */
export const TEAM_COLOR_PRESETS: readonly TeamColorOption[] = [
  { name: 'Black', hex: '#111111' },
  { name: 'White', hex: '#F5F5F5' },
  { name: 'Red', hex: '#E30613' },
  { name: 'Crimson', hex: '#9B1B30' },
  { name: 'Navy', hex: '#0B1F3A' },
  { name: 'Royal Blue', hex: '#1E4DD8' },
  { name: 'Sky Blue', hex: '#5AA9E6' },
  { name: 'Teal', hex: '#0F8B8D' },
  { name: 'Green', hex: '#1F7A3F' },
  { name: 'Forest', hex: '#0F3D2E' },
  { name: 'Gold', hex: '#FFD400' },
  { name: 'Yellow', hex: '#F5C518' },
  { name: 'Orange', hex: '#F36C00' },
  { name: 'Purple', hex: '#5B2C6F' },
  { name: 'Maroon', hex: '#5C0A0A' },
  { name: 'Gray', hex: '#6B7280' },
  { name: 'Silver', hex: '#C0C0C0' },
  { name: 'Pink', hex: '#E85D8C' },
] as const;

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: string): boolean {
  return HEX_RE.test(value.trim());
}

export function expandHex(hex: string): string {
  const raw = hex.trim();
  if (!HEX_RE.test(raw)) return '#000000';
  if (raw.length === 4) {
    const [, r, g, b] = raw;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return raw.toUpperCase();
}

export function findPresetByName(name: string): TeamColorOption | undefined {
  const needle = name.trim().toLowerCase();
  return TEAM_COLOR_PRESETS.find((preset) => preset.name.toLowerCase() === needle);
}

export function findPresetByHex(hex: string): TeamColorOption | undefined {
  if (!isHexColor(hex)) return undefined;
  const expanded = expandHex(hex);
  return TEAM_COLOR_PRESETS.find((preset) => expandHex(preset.hex) === expanded);
}

/** Best swatch/picker preview for whatever the user typed. */
export function colorPreviewHex(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '#222222';
  if (isHexColor(trimmed)) return expandHex(trimmed);
  const byName = findPresetByName(trimmed);
  if (byName) return byName.hex;
  return '#222222';
}
