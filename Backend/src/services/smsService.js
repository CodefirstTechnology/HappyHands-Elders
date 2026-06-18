const logger = require("../utils/logger");

const SMS_PROVIDER = process.env.SMS_PROVIDER || "log";
const DEFAULT_COUNTRY = process.env.SMS_DEFAULT_COUNTRY_CODE || "91";

const templates = {
  careStartOtp: ({ otp, caregiverName }) =>
    `Your care-start OTP for ${caregiverName || "your caregiver"} is ${otp}. Share this with your caregiver to begin the session.`,

  bookingConfirmation: ({ caregiverName, dateTime }) =>
    `Your eldercare booking with ${caregiverName || "your caregiver"} is confirmed for ${dateTime || "the scheduled time"}. They will arrive at your home.`,

  newBookingAlert: () =>
    "New eldercare request near you! Open the ElderCare app to accept."
};

const normalizePhone = (phone) => {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `${DEFAULT_COUNTRY}${digits}`;
  return digits;
};

const sendViaMsg91 = async ({ phone, message }) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) {
    logger.warn("MSG91_AUTH_KEY not set; skipping SMS");
    return { sent: false, provider: "msg91", reason: "missing_auth_key" };
  }

  const templateId = process.env.MSG91_TEMPLATE_ID_CARE_OTP;
  const payload = {
    template_id: templateId || undefined,
    short_url: "0",
    recipients: [
      {
        mobiles: phone,
        message: templateId ? undefined : message,
        var: message
      }
    ]
  };

  const response = await fetch("https://control.msg91.com/api/v5/flow/", {
    method: "POST",
    headers: {
      authkey: authKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...payload,
      sender: process.env.MSG91_SENDER_ID || "CHLDRA",
      route: process.env.MSG91_ROUTE || "4"
    })
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error("MSG91 SMS failed", { status: response.status, body });
    return { sent: false, provider: "msg91", reason: "api_error" };
  }

  return { sent: true, provider: "msg91" };
};

const sendSms = async ({ to, message, template = "careStartOtp" }) => {
  const phone = normalizePhone(to);
  if (!phone) {
    return { sent: false, provider: SMS_PROVIDER, reason: "invalid_phone" };
  }

  if (SMS_PROVIDER === "log") {
    logger.info("SMS (log provider)", { to: phone, template, message });
    return { sent: true, provider: "log" };
  }

  if (SMS_PROVIDER === "msg91") {
    return sendViaMsg91({ phone, message });
  }

  logger.warn("Unsupported SMS provider", { provider: SMS_PROVIDER });
  return { sent: false, provider: SMS_PROVIDER, reason: "unsupported_provider" };
};

const sendCareStartOtpSms = async ({ phone, otp, caregiverName, bookingId }) =>
  sendSms({
    to: phone,
    template: "careStartOtp",
    message: templates.careStartOtp({ otp, caregiverName, bookingId })
  });

const sendBookingConfirmationSms = async ({ phone, caregiverName, dateTime }) =>
  sendSms({
    to: phone,
    template: "bookingConfirmation",
    message: templates.bookingConfirmation({ caregiverName, dateTime })
  });

const sendNewBookingAlertSms = async ({ phone }) =>
  sendSms({
    to: phone,
    template: "newBookingAlert",
    message: templates.newBookingAlert()
  });

module.exports = {
  templates,
  sendSms,
  sendCareStartOtpSms,
  sendBookingConfirmationSms,
  sendNewBookingAlertSms
};
