const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const AdmZip = require("adm-zip");
const { XMLParser } = require("fast-xml-parser");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");
const { SignedXml } = require("xml-crypto");

const CERTS_DIR = path.join(process.cwd(), "certs");
const UIDAI_CERT_PATH =
  process.env.UIDAI_OFFLINE_CERT_PATH ||
  path.join(CERTS_DIR, "uidai_offline_publickey.cer");

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true
});

const normalizeName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const nameSimilarity = (a, b) => {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const leftParts = new Set(left.split(" "));
  const rightParts = new Set(right.split(" "));
  let overlap = 0;
  for (const part of leftParts) {
    if (rightParts.has(part)) overlap += 1;
  }
  return overlap / Math.max(leftParts.size, rightParts.size);
};

const formatAddress = (poa = {}) => {
  const parts = [
    poa.house,
    poa.street,
    poa.lm,
    poa.loc,
    poa.vtc,
    poa.subdist,
    poa.dist,
    poa.state,
    poa.pc ? `PIN ${poa.pc}` : null
  ]
    .filter(Boolean)
    .map((p) => String(p).trim());
  return parts.join(", ");
};

const formatGender = (gender) => {
  const g = String(gender || "").toUpperCase();
  if (g === "M") return "Male";
  if (g === "F") return "Female";
  if (g === "T") return "Transgender";
  return gender || null;
};

const bufferToPem = (raw) => {
  const asText = raw.toString("utf8");
  if (asText.includes("BEGIN CERTIFICATE")) {
    return asText;
  }
  const b64 = raw.toString("base64");
  return `-----BEGIN CERTIFICATE-----\n${b64.match(/.{1,64}/g).join("\n")}\n-----END CERTIFICATE-----`;
};

const listBundledCertPaths = () => {
  const paths = new Set();
  if (fs.existsSync(UIDAI_CERT_PATH)) paths.add(UIDAI_CERT_PATH);
  if (fs.existsSync(CERTS_DIR)) {
    for (const name of fs.readdirSync(CERTS_DIR)) {
      if (/\.cer$/i.test(name)) {
        paths.add(path.join(CERTS_DIR, name));
      }
    }
  }
  return [...paths];
};

const findSignatureNode = (doc) => {
  const withNs = doc.getElementsByTagNameNS(
    "http://www.w3.org/2000/09/xmldsig#",
    "Signature"
  );
  if (withNs?.length) return withNs[0];
  const plain = doc.getElementsByTagName("Signature");
  return plain?.length ? plain[0] : null;
};

const tryXmlDsig = (xmlString, { publicCertPem = null, useEmbeddedCert = false } = {}) => {
  const doc = new DOMParser().parseFromString(xmlString, "text/xml");
  const signatureNode = findSignatureNode(doc);
  if (!signatureNode) {
    return { ok: false, reason: "missing_signature_element" };
  }

  const options = useEmbeddedCert
    ? { getCertFromKeyInfo: SignedXml.getCertFromKeyInfo }
    : {
        publicCert: publicCertPem,
        getCertFromKeyInfo: () => null
      };

  const signedXml = new SignedXml(options);
  signedXml.loadSignature(signatureNode);

  try {
    const valid = signedXml.checkSignature(xmlString);
    return { ok: valid, errors: signedXml.validationErrors || [] };
  } catch (err) {
    return { ok: false, errors: [err.message] };
  }
};

const tryLegacySAttribute = (xmlString, publicCertPem) => {
  const doc = new DOMParser().parseFromString(xmlString, "text/xml");
  const root = doc.documentElement;
  if (!root) return false;

  const signatureValue = root.getAttribute("s");
  if (!signatureValue) return false;

  root.removeAttribute("s");
  const serializer = new XMLSerializer();
  const innerXml = Array.from(root.childNodes)
    .map((node) => serializer.serializeToString(node))
    .join("");

  try {
    const cert = new crypto.X509Certificate(publicCertPem);
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(innerXml, "utf8");
    return verifier.verify(cert.publicKey, signatureValue, "base64");
  } catch {
    return false;
  }
};

exports.verifyXmlSignature = (xmlString) => {
  const attempts = [];

  const embedded = tryXmlDsig(xmlString, { useEmbeddedCert: true });
  if (embedded.ok) return true;
  attempts.push(`embedded certificate: ${(embedded.errors || []).join(", ") || "failed"}`);

  for (const certPath of listBundledCertPaths()) {
    const pem = bufferToPem(fs.readFileSync(certPath));
    const result = tryXmlDsig(xmlString, { publicCertPem: pem });
    if (result.ok) return true;
    attempts.push(`${path.basename(certPath)}: ${(result.errors || []).join(", ") || "failed"}`);

    if (tryLegacySAttribute(xmlString, pem)) {
      return true;
    }
  }

  const hasSignatureElement = !!findSignatureNode(
    new DOMParser().parseFromString(xmlString, "text/xml")
  );
  const hasLegacyS = !!new DOMParser()
    .parseFromString(xmlString, "text/xml")
    .documentElement?.getAttribute?.("s");

  if (!hasSignatureElement && !hasLegacyS) {
    throw new Error(
      "Digital signature missing in Aadhaar XML. Re-download Offline e-KYC from myAadhaar."
    );
  }

  throw new Error(
    "Invalid Aadhaar XML — UIDAI signature could not be verified. Re-download a fresh ZIP from myAadhaar and try again."
  );
};

const findXmlEntryName = (zip) => {
  const entries = zip.getEntries();
  const xmlEntry = entries.find((entry) => /\.xml$/i.test(entry.entryName));
  if (!xmlEntry) {
    throw new Error("No XML file found inside the ZIP. Download Offline e-KYC from myAadhaar.");
  }
  return xmlEntry.entryName;
};

exports.extractZipWithShareCode = (zipBuffer, shareCode) => {
  const code = String(shareCode || "").trim();
  if (!/^\d{4}$/.test(code)) {
    throw new Error("Share code must be exactly 4 digits");
  }

  const zip = new AdmZip(zipBuffer);
  const xmlEntryName = findXmlEntryName(zip);
  const xmlBuffer = zip.readFile(xmlEntryName, code);
  if (!xmlBuffer || xmlBuffer.length === 0) {
    throw new Error("Could not decrypt ZIP. Check the 4-digit share code.");
  }

  return xmlBuffer.toString("utf8");
};

exports.parseOfflineKycXml = (xmlString) => {
  const parsed = xmlParser.parse(xmlString);
  const root =
    parsed.OfflinePaperlessKyc ||
    parsed.Certificate ||
    parsed.PrintLetterBarcodeData ||
    parsed;

  if (!root) {
    throw new Error("Unrecognized Aadhaar XML format");
  }

  const uidData = root.UidData || root;
  const poi = uidData.Poi || {};
  const poa = uidData.Poa || {};
  const photoNode = uidData.Pht;
  const photo =
    typeof photoNode === "string"
      ? photoNode
      : photoNode?.["#text"] || photoNode?.text || null;

  const referenceId = root.referenceId || root.referenceID || null;

  return {
    referenceId: referenceId ? String(referenceId) : null,
    name: poi.name || null,
    dob: poi.dob || null,
    gender: poi.gender || null,
    address: formatAddress(poa),
    photoBase64: photo ? String(photo).replace(/\s+/g, "") : null
  };
};

exports.saveAadhaarPhoto = (photoBase64, uploadDir) => {
  if (!photoBase64) return null;
  const dir = uploadDir || path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `aadhaar-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, Buffer.from(photoBase64, "base64"));
  return `/uploads/${filename}`;
};

exports.processOfflineAadhaarZip = async ({
  zipBuffer,
  shareCode,
  expectedName,
  uploadDir
}) => {
  const xmlString = exports.extractZipWithShareCode(zipBuffer, shareCode);
  exports.verifyXmlSignature(xmlString);
  const extracted = exports.parseOfflineKycXml(xmlString);
  const photoUrl = exports.saveAadhaarPhoto(extracted.photoBase64, uploadDir);
  const matchScore = expectedName ? nameSimilarity(expectedName, extracted.name) : null;

  return {
    ...extracted,
    photoUrl,
    genderLabel: formatGender(extracted.gender),
    nameMatch: matchScore == null ? null : matchScore >= 0.6,
    nameMatchScore: matchScore
  };
};

exports.nameSimilarity = nameSimilarity;
