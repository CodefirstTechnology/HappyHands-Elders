const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const formatDays = (wd) => {
  if (!wd) return '—'
  if (Array.isArray(wd)) return wd.join(', ')
  try {
    const p = JSON.parse(wd)
    return Array.isArray(p) ? p.join(', ') : String(wd)
  } catch {
    return String(wd)
  }
}

export function buildReportFromForm(form, skillsCatalog = [], files = {}) {
  const skillLabels = (form.skills || []).map(
    (code) => skillsCatalog.find((s) => s.code === code)?.label || code.replace(/_/g, ' '),
  )
  return {
    title: 'ChildCare — Caregiver onboarding report',
    generatedAt: new Date().toLocaleString('en-IN'),
    personal: {
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      passwordSet: Boolean(form.password),
    },
    skills: {
      list: skillLabels,
      experience: form.experience,
      bio: form.bio,
      hourlyRate: form.hourlyRate,
      monthlyRate: form.monthlyRate,
    },
    availability: {
      offersSession: form.offersSession,
      offersMonthly: form.offersMonthly,
      sessionHours:
        form.offersSession && form.availableFrom && form.availableTo
          ? `${form.availableFrom} – ${form.availableTo}`
          : null,
      workingDays: form.offersMonthly ? form.workingDays : [],
      hoursPerDay: form.hoursPerDay,
      notes: form.availabilityNotes,
    },
    documents: {
      idProofType: form.idProofType,
      idProofFile: files.idProof?.name || null,
      profilePhotoFile: files.profilePhoto?.name || null,
    },
    bank: {
      accountHolder: form.bankAccountHolder,
      accountNumber: form.bankAccountNumber,
      bankName: form.bankName,
      ifsc: form.bankIfsc,
      upiId: form.bankUpiId,
    },
    verificationStatus: 'Draft (not yet submitted)',
    caregiverId: null,
  }
}

export function buildReportFromFormSubmitted(form, skills, files, servant) {
  const base = buildReportFromForm(form, skills, files)
  if (!servant) return { ...base, verificationStatus: 'Pending verification (submitted)' }
  return {
    ...buildReportFromServant(servant),
    documents: {
      ...base.documents,
      idProofFile: servant.idProofUrl ? 'Uploaded on server' : base.documents.idProofFile,
      profilePhotoFile: servant.profilePhoto ? 'Uploaded on server' : base.documents.profilePhotoFile,
    },
  }
}

export function buildReportFromServant(servant) {
  const u = servant.user || {}
  return {
    title: 'ChildCare — Caregiver onboarding report',
    generatedAt: new Date().toLocaleString('en-IN'),
    caregiverId: servant.id,
    personal: {
      name: u.name,
      email: u.email,
      phone: u.phone,
      address: servant.address,
      passwordSet: true,
    },
    skills: {
      list: (servant.skills || []).map((s) => s.skillName?.replace(/_/g, ' ') || s.skillName),
      experience: servant.experience,
      bio: servant.bio,
      hourlyRate: servant.hourlyRate,
      monthlyRate: servant.monthlyRate,
    },
    availability: {
      offersSession: servant.offersSession !== false,
      offersMonthly: servant.offersMonthly !== false,
      sessionHours:
        servant.availableFrom && servant.availableTo
          ? `${servant.availableFrom} – ${servant.availableTo}`
          : null,
      workingDays: formatDays(servant.workingDays).split(', ').filter(Boolean),
      hoursPerDay: servant.hoursPerDay,
      notes: servant.availabilityNotes,
    },
    documents: {
      idProofType: servant.idProofType,
      idProofFile: servant.idProofUrl ? 'Uploaded on server' : null,
      profilePhotoFile: servant.profilePhoto ? 'Uploaded on server' : null,
    },
    bank: {
      accountHolder: servant.bankAccountHolder,
      accountNumber: servant.bankAccountNumber,
      bankName: servant.bankName,
      ifsc: servant.bankIfsc,
      upiId: servant.bankUpiId,
    },
    verificationStatus: servant.verificationStatus,
    verifiedAt: servant.verifiedAt
      ? new Date(servant.verifiedAt).toLocaleString('en-IN')
      : null,
    rejectionReason: servant.rejectionReason || null,
    zones: (servant.zones || []).map((z) => `${z.name}${z.city ? ` · ${z.city}` : ''}`),
    bookingsCount: servant.bookings?.length ?? 0,
  }
}

function reportHtml(data) {
  const row = (label, value) =>
    `<tr><th>${esc(label)}</th><td>${esc(value ?? '—')}</td></tr>`

  const skills = data.skills?.list?.length
    ? data.skills.list.join(', ')
    : '—'

  const bookingTypes = [
    data.availability?.offersSession && 'Session',
    data.availability?.offersMonthly && 'Monthly',
  ]
    .filter(Boolean)
    .join(', ')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(data.title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #1b1b21; max-width: 720px; }
    h1 { color: #1B6CA8; font-size: 1.5rem; margin-bottom: 0.25rem; }
    .meta { color: #464652; font-size: 0.875rem; margin-bottom: 1.5rem; }
    h2 { font-size: 1rem; color: #7d44a4; margin: 1.25rem 0 0.5rem; border-bottom: 1px solid #e5e5ef; padding-bottom: 0.25rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th { text-align: left; width: 38%; padding: 0.4rem 0.5rem 0.4rem 0; color: #464652; font-weight: 600; vertical-align: top; }
    td { padding: 0.4rem 0; }
    .status { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; background: #e1f0fa; color: #1B6CA8; font-size: 0.8rem; font-weight: 600; }
    @media print { body { margin: 1rem; } }
  </style>
</head>
<body>
  <h1>${esc(data.title)}</h1>
  <p class="meta">Generated ${esc(data.generatedAt)}${data.caregiverId ? ` · Servant ID ${data.caregiverId}` : ''}</p>
  <p><span class="status">${esc(data.verificationStatus)}</span></p>

  <h2>Personal information</h2>
  <table>
    ${row('Full name', data.personal?.name)}
    ${row('Email', data.personal?.email)}
    ${row('Mobile', data.personal?.phone)}
    ${row('Address', data.personal?.address)}
    ${row('Login password', data.personal?.passwordSet ? 'Set' : 'Not set')}
  </table>

  <h2>Skills &amp; rates</h2>
  <table>
    ${row('Skills', skills)}
    ${row('Experience', data.skills?.experience != null ? `${data.skills.experience} year(s)` : null)}
    ${row('Bio', data.skills?.bio)}
    ${row('Hourly rate', data.skills?.hourlyRate != null ? `₹${data.skills.hourlyRate}/hr` : null)}
    ${row('Monthly rate', data.skills?.monthlyRate != null ? `₹${data.skills.monthlyRate}/mo` : null)}
  </table>

  <h2>Availability</h2>
  <table>
    ${row('Booking types', bookingTypes || '—')}
    ${data.availability?.offersSession ? row('Session hours', data.availability.sessionHours) : ''}
    ${data.availability?.offersMonthly ? row('Working days', formatDays(data.availability.workingDays)) : ''}
    ${data.availability?.offersMonthly ? row('Hours per day', data.availability.hoursPerDay) : ''}
    ${row('Notes', data.availability?.notes)}
  </table>

  <h2>ID verification</h2>
  <table>
    ${row('ID type', data.documents?.idProofType?.replace(/_/g, ' '))}
    ${row('ID proof', data.documents?.idProofFile)}
    ${row('Profile photo', data.documents?.profilePhotoFile)}
  </table>

  <h2>Bank details</h2>
  <table>
    ${row('Account holder', data.bank?.accountHolder)}
    ${row('Account number', data.bank?.accountNumber)}
    ${row('Bank name', data.bank?.bankName)}
    ${row('IFSC', data.bank?.ifsc)}
    ${row('UPI ID', data.bank?.upiId)}
  </table>

  ${
    data.zones?.length
      ? `<h2>Service zones</h2><p>${data.zones.map(esc).join('<br />')}</p>`
      : ''
  }
  ${data.verifiedAt ? `<p class="meta">Verified on ${esc(data.verifiedAt)}</p>` : ''}
  ${data.rejectionReason ? `<p style="color:#ba1a1a"><strong>Rejection:</strong> ${esc(data.rejectionReason)}</p>` : ''}
  ${data.bookingsCount != null ? `<p class="meta">Bookings on record: ${data.bookingsCount}</p>` : ''}

  <p class="meta" style="margin-top:2rem">ChildCare Coordinator Portal — confidential</p>
</body>
</html>`
}

function safeReportFilename(data, filenameBase = 'onboarding-report') {
  return (data.personal?.name || filenameBase)
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
}

export function downloadOnboardingReport(data, filenameBase = 'onboarding-report') {
  const safeName = safeReportFilename(data, filenameBase)
  const html = reportHtml(data)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `childcare-${safeName || 'caregiver'}-report.html`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Opens the report in a new tab so the agent can print or save as PDF. */
export function printOnboardingReport(data) {
  const html = reportHtml(data)
  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) {
    downloadOnboardingReport(data)
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  win.onload = () => {
    win.print()
  }
}
