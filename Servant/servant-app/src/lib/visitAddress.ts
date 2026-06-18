export type VisitAddressParts = {
  flatNo?: string | null;
  building?: string | null;
  area?: string | null;
  address?: string | null;
};

export function formatVisitAddressLines(parts: VisitAddressParts): string[] {
  const lines: string[] = [];
  const flat = parts.flatNo?.trim();
  const building = parts.building?.trim();
  const unitParts = [flat && `Flat ${flat}`, building].filter(Boolean);
  if (unitParts.length) lines.push(unitParts.join(' · '));
  if (parts.area?.trim()) lines.push(parts.area.trim());
  if (parts.address?.trim()) lines.push(parts.address.trim());
  return lines;
}

export function hasVisitAddressDetail(parts: VisitAddressParts): boolean {
  return formatVisitAddressLines(parts).length > 0;
}
