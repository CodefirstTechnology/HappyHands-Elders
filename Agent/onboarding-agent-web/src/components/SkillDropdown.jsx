function inputClassName() {
  return 'w-full rounded-lg border px-3 py-2'
}

export function SkillDropdown({ skills = [], skillsLoading, value = [], onChange }) {
  const addSkill = (code) => {
    if (!code || value.includes(code)) return
    onChange([...value, code])
  }

  const removeSkill = (code) => onChange(value.filter((c) => c !== code))

  if (skillsLoading) {
    return <p className="text-sm text-subtext">Loading skills…</p>
  }

  if (skills.length === 0) {
    return (
      <p className="text-sm text-subtext">
        No skills available. Ask an admin to add skills first.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <select
        className={inputClassName()}
        value=""
        onChange={(e) => addSkill(e.target.value)}
        aria-label="Select skill"
      >
        <option value="">Select a skill…</option>
        {skills.map((s) => (
          <option key={s.code} value={s.code} disabled={value.includes(s.code)}>
            {s.label}
          </option>
        ))}
      </select>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((code) => {
            const label = skills.find((s) => s.code === code)?.label || code.replace(/_/g, ' ')
            return (
              <span
                key={code}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
              >
                {label}
                <button
                  type="button"
                  className="ml-0.5 font-bold leading-none opacity-70 hover:opacity-100"
                  onClick={() => removeSkill(code)}
                  aria-label={`Remove ${label}`}
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-subtext">Select at least one skill from the list.</p>
      )}
    </div>
  )
}
