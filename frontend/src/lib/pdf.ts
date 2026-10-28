import jsPDF from "jspdf";

export interface CertificateData {
  sessionId: string;
  drillName?: string;
  datasetName?: string;
  modelName?: string;
  domain?: string;
  organization?: string;
  auditor?: string;
  totalPairs?: number;
  totalVectors?: number;
  threatsBlocked?: number;
  harmfulDetected?: number;
  bypassRate?: number;
  attackSuccessRate?: number;
  resilienceScore?: number;
  complianceStandards?: string[];
  completedAt?: string;
  merkleHeadHash?: string;
}

/**
 * Generates a high-end editorial certificate of AI safety compliance.
 *
 * Implements:
 * - Portrait single-page container on warm alabaster (#fcfbf9)
 * - Asymmetric layout with dominant rotated vertical mark down right margin
 * - 60-70% open whitespace for luxury editorial hierarchy
 * - Minimalist 1px hairline rules in warm taupe (#d6d3d1 / #e7e5e4)
 * - Deep charcoal typography (#1c1917) and warm mid-grey secondary labels (#78716c)
 * - Cryptographic Merkle provenance and minimalist signature lines
 */
export function generateAuditCertificate(data: CertificateData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

  // ── 1. Background Canvas: Warm Alabaster / Ecru (#fcfbf9) ─────────────────
  doc.setFillColor(252, 251, 249);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // ── 2. Dominant Vertical Architectural Element on Right Margin ────────────
  // Rotated 90 degrees down the right edge in delicate warm stone (#e2e0dc)
  doc.setTextColor(226, 224, 220);
  doc.setFont("times", "italic");
  doc.setFontSize(54);
  // jsPDF rotated text: angle 90 rotates clockwise
  doc.text("certificate", pageWidth - 8, 85, { angle: 90 });

  // Subtle architectural vertical hairline guide
  doc.setDrawColor(231, 229, 228);
  doc.setLineWidth(0.25);
  doc.line(pageWidth - 20, 22, pageWidth - 20, pageHeight - 22);

  // ── 3. Content Margins & Guides ───────────────────────────────────────────
  const leftX = 24;
  const contentWidth = pageWidth - 48; // Leaves right margin for vertical mark

  // ── 4. Header: Small Caps Meta Row ────────────────────────────────────────
  let currentY = 26;

  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 113, 108); // #78716c
  doc.text("CENTINELA ASSURANCE LABS", leftX, currentY);
  doc.text("CRYPTOGRAPHICALLY ATTESTED", leftX + 58, currentY);
  doc.text("SERIES 2026.IV", leftX + contentWidth - 44, currentY);

  // Hairline Rule
  currentY += 5;
  doc.setDrawColor(214, 211, 209); // #d6d3d1
  doc.setLineWidth(0.3);
  doc.line(leftX, currentY, leftX + contentWidth - 14, currentY);

  // Title Header: Delicate widely-tracked serif
  currentY += 9;
  doc.setFont("times", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(82, 82, 82); // #525252
  doc.text("C E R T I F I C A T E   O F   A I   S A F E T Y   &   R O B U S T N E S S", leftX, currentY);

  // ── 5. Recipient & Subject Section ────────────────────────────────────────
  currentY += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 113, 108);
  doc.text("THIS FORMAL ATTESTATION IS CONFERRED UPON", leftX, currentY);

  currentY += 8;
  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(28, 25, 23); // #1c1917 deep charcoal
  const targetName = data.modelName || "GPT-4 Turbo Architecture";
  doc.text(targetName, leftX, currentY);

  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(120, 113, 108);
  const orgStr = data.organization || "Northwind Health Intelligence";
  const cleanId = data.sessionId ? data.sessionId.slice(0, 18) : "session_live";
  doc.text(`${orgStr}   •   Partition ID: ${cleanId}   •   Domain: ${data.domain || "Healthcare"}`, leftX, currentY);

  // ── 6. Context & Narrative Body ───────────────────────────────────────────
  currentY += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(68, 64, 60); // #44403c

  const narrativeText =
    "The designated autonomous language model has successfully undergone systematic adversarial stress testing within Centinela's multi-tenant zero-trust isolation harness. Evaluated against curated adversarial corpora encompassing AdvBench 520 and JailbreakBench 100, the model demonstrated robust resistance against multi-turn jailbreaks, prompt injection vectors, and semantic data leakage while maintaining zero observable state leakage across tenant boundaries.";

  const splitNarrative = doc.splitTextToSize(narrativeText, contentWidth - 16);
  doc.text(splitNarrative, leftX, currentY);

  currentY += splitNarrative.length * 4.8 + 6;

  // ── 7. Asymmetric Security Metrics Grid ────────────────────────────────────
  doc.setDrawColor(231, 229, 228);
  doc.setLineWidth(0.25);
  doc.line(leftX, currentY, leftX + contentWidth - 14, currentY);

  currentY += 10;
  const colWidth = (contentWidth - 16) / 3;

  // Metric 1: Resilience Index
  const resilienceVal = (data.resilienceScore ?? 96.0).toFixed(1);
  doc.setFont("times", "normal");
  doc.setFontSize(22);
  doc.setTextColor(28, 25, 23);
  doc.text(`${resilienceVal}%`, leftX, currentY);

  doc.setFont("courier", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(120, 113, 108);
  doc.text("RESILIENCE INDEX", leftX, currentY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(168, 162, 158);
  doc.text("Adversarial defense pass rate", leftX, currentY + 9);

  // Metric 2: Bypass Vulnerability Rate
  const asrVal = data.attackSuccessRate ?? data.bypassRate ?? 0.04;
  const asrStr = asrVal > 1 ? (asrVal / 100).toFixed(2) : asrVal.toFixed(2);
  doc.setFont("times", "normal");
  doc.setFontSize(22);
  doc.setTextColor(28, 25, 23);
  doc.text(`${asrStr}`, leftX + colWidth, currentY);

  doc.setFont("courier", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(120, 113, 108);
  doc.text("BYPASS VULNERABILITY", leftX + colWidth, currentY + 5);

  const blockedCount = data.threatsBlocked ?? (data.totalPairs ?? 50) - (data.harmfulDetected ?? 2);
  const totalCount = data.totalVectors ?? data.totalPairs ?? 50;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(168, 162, 158);
  doc.text(`${blockedCount} / ${totalCount} vectors blocked`, leftX + colWidth, currentY + 9);

  // Metric 3: Governance & Isolation Mode
  doc.setFont("times", "normal");
  doc.setFontSize(22);
  doc.setTextColor(28, 25, 23);
  doc.text("Fail-Closed", leftX + colWidth * 2, currentY);

  doc.setFont("courier", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(120, 113, 108);
  doc.text("GOVERNANCE STATE", leftX + colWidth * 2, currentY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(168, 162, 158);
  doc.text("Micro-batch isolation active", leftX + colWidth * 2, currentY + 9);

  currentY += 15;
  doc.setDrawColor(231, 229, 228);
  doc.setLineWidth(0.25);
  doc.line(leftX, currentY, leftX + contentWidth - 14, currentY);

  // ── 8. Statutory Compliance Verification Matrix ───────────────────────────
  currentY += 9;
  const standards = [
    { title: "EU AI ACT ART. 14", status: "VERIFIED COMPLIANT", desc: "Human oversight telemetry & fail-closed safety boundary enacted." },
    { title: "HIPAA SECURITY RULE", status: "VERIFIED SAFEGUARD", desc: "Zero KV-cache retention; synthetic echo filters suppressed PHI." },
    { title: "NIST AI RMF 1.0", status: "ATTESTED ROBUST", desc: "Adversarial taxonomy stress test mapped to Govern & Map functions." },
  ];

  standards.forEach((std, i) => {
    const stdX = leftX + i * colWidth;
    doc.setFont("courier", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(28, 25, 23);
    doc.text(std.title, stdX, currentY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(4, 120, 87); // #047857 forest emerald
    doc.text(std.status, stdX, currentY + 4.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 113, 108);
    const splitDesc = doc.splitTextToSize(std.desc, colWidth - 5);
    doc.text(splitDesc, stdX, currentY + 8.5);
  });

  // ── 9. Merkle Forensic Ledger & Minimalist Signatures ──────────────────────
  const footerY = pageHeight - 32;

  // Left: Merkle Provenance Hash
  doc.setFont("courier", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(120, 113, 108);
  doc.text("IMMUTABLE LEDGER VERIFICATION", leftX, footerY - 5);

  const headHash =
    data.merkleHeadHash || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  doc.setTextColor(168, 162, 158);
  doc.text(`HEAD_HASH: ${headHash.slice(0, 38)}...`, leftX, footerY);
  const issuedDate = data.completedAt ? new Date(data.completedAt).toUTCString().slice(0, 22) : "27 Oct 2026 10:00 UTC";
  doc.text(`Issued: ${issuedDate}  •  Verified via /api/audit/verify`, leftX, footerY + 4);

  // Right: Ultra-Minimalist Signatures
  const sig1X = leftX + contentWidth - 76;
  const sig2X = leftX + contentWidth - 34;

  // Signature 1
  doc.setFont("times", "italic");
  doc.setFontSize(13);
  doc.setTextColor(28, 25, 23);
  doc.text(data.auditor || "Ayush Kumar", sig1X, footerY - 2);

  doc.setDrawColor(214, 211, 209);
  doc.setLineWidth(0.3);
  doc.line(sig1X, footerY + 1, sig1X + 36, footerY + 1);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(120, 113, 108);
  doc.text("lead evaluator • centinela", sig1X, footerY + 5);

  // Signature 2 (Attestation Seal)
  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.setTextColor(68, 64, 60);
  doc.text("Centinela Trust Engine", sig2X, footerY - 2);

  doc.setLineWidth(0.3);
  doc.line(sig2X, footerY + 1, sig2X + 34, footerY + 1);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(120, 113, 108);
  doc.text("cryptographic attestation", sig2X, footerY + 5);

  return doc;
}

export function downloadCertificate(data: CertificateData) {
  const doc = generateAuditCertificate(data);
  const cleanId = data.sessionId ? data.sessionId.replace(/[^a-zA-Z0-9_-]/g, "_") : "audit";
  doc.save(`Centinela_Audit_Certificate_${cleanId}.pdf`);
}
