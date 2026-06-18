/** Elder age ranges stored on caregivers and used in family browse filters. */
export const ELDER_AGE_RANGES = [
  { value: '60-70', label: '60–70 years' },
  { value: '70-80', label: '70–80 years' },
  { value: '80-90', label: '80–90 years' },
  { value: '90+', label: '90+ years' },
] as const;

export const ELDER_AGE_RANGE_VALUES = ELDER_AGE_RANGES.map((r) => r.value);

export const MOBILITY_LEVELS = [
  { value: 'independent', labelKey: 'profile.mobilityIndependent' },
  { value: 'assisted', labelKey: 'profile.mobilityAssisted' },
  { value: 'bedridden', labelKey: 'profile.mobilityBedridden' },
] as const;
