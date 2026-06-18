import i18n from '@/lib/i18n';
import type { Skill } from '@/hooks/useSkills';

const skillI18nKey = (raw: string) => `skills.${raw.trim().toUpperCase().replace(/\s+/g, '_')}`;

/** Prefer locale `skills.CODE`, then API label. */
export function localizedSkillLabel(
  code: string,
  skills: Skill[] = [],
): string {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, '_');
  const match = skills.find(
    (s) =>
      s.code === code ||
      s.code === normalized ||
      s.label.toLowerCase() === code.trim().toLowerCase(),
  );
  const keys = [
    skillI18nKey(normalized),
    match ? skillI18nKey(match.code) : '',
    skillI18nKey(code),
  ].filter(Boolean);
  for (const key of keys) {
    if (i18n.exists(key)) return i18n.t(key);
  }
  if (match) return match.label;
  return formatSkillLabel(code, skills);
}

export function formatSkillLabel(skillName: string, skills: Skill[] = []) {
  const normalized = skillName.trim();
  const asCode = normalized.toUpperCase().replace(/\s+/g, '_');
  const match = skills.find(
    (s) =>
      s.code === asCode ||
      s.label.toLowerCase() === normalized.toLowerCase() ||
      s.code.toLowerCase() === normalized.toLowerCase(),
  );
  if (match) return match.label;
  return normalized
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
