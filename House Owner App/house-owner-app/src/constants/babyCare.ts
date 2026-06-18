/** Baby age ranges stored on caregivers and used in parent browse filters. */
export const BABY_AGE_RANGES = [
  { value: '0-3m', label: '0–3 months' },
  { value: '3-6m', label: '3–6 months' },
  { value: '6-12m', label: '6–12 months' },
  { value: '12-24m', label: '12–24 months' },
  { value: '24-36m', label: '2–3 years' },
] as const;

export const BABY_AGE_RANGE_VALUES = BABY_AGE_RANGES.map((r) => r.value);
