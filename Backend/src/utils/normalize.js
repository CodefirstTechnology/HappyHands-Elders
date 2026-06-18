const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : email;

const normalizePhone = (phone) => {
  if (phone === undefined || phone === null) return null;
  const trimmed = String(phone).trim();
  return trimmed.length > 0 ? trimmed : null;
};

module.exports = { normalizeEmail, normalizePhone };
