import { jsPDF } from "jspdf";
import { demoData } from "@capstone/demo-data";
import { formatINR, formatDate } from "@capstone/ui";

export function generateCAExportPDF(mismatchId?: string) {
  const doc = new jsPDF();
  const margin = 20;
  let y = margin;

  const addLine = (text: string, size = 10, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, 170);
    if (y + lines.length * 6 > 280) {
      doc.addPage();
      y = margin;
    }
    doc.text(lines, margin, y);
    y += lines.length * 6 + 2;
  };

  addLine("CAPSTONE — Tax Reconciliation Memo", 16, true);
  addLine(`Generated: ${formatDate(new Date().toISOString())}`, 9);
  addLine(`Family: ${demoData.family.name}`, 10);
  addLine(`PAN (Principal): ABCPR1234A`, 10);
  y += 4;

  addLine("AIS RECONCILIATION SUMMARY", 12, true);
  addLine(
    `Entries checked: ${demoData.firewall.status.ais_entries_checked} | Matched: ${demoData.firewall.status.matched} | Needs attention: ${demoData.firewall.status.needs_attention}`,
    10
  );
  y += 4;

  const mismatches = mismatchId
    ? demoData.firewall.mismatches.filter((m) => m.id === mismatchId)
    : demoData.firewall.mismatches;

  mismatches.forEach((m, i) => {
    addLine(`${i + 1}. ${m.title}`, 11, true);
    addLine(`Severity: ${m.severity.toUpperCase()} | Amount: ${formatINR(m.amount_inr)}`, 9);
    addLine(`Institution: ${m.institution}`, 9);
    addLine(m.description, 9);
    addLine(`Suggested fix: ${m.suggested_fix}`, 9);
    if (m.ais_reference) addLine(`AIS Ref: ${m.ais_reference}`, 8);
    y += 4;
  });

  y += 4;
  addLine("DISCLAIMER", 10, true);
  addLine(
    "This memo is prepared by CAPSTONE for reconciliation purposes only. Consult your CA before filing. CAPSTONE does not provide tax filing services.",
    8
  );

  doc.save(`capstone-ca-export-${mismatchId ?? "full"}-${Date.now()}.pdf`);
}

export function generateHarvestExportPDF(cardId: string) {
  const card = demoData.action_cards.find((c) => c.id === cardId);
  if (!card) return;

  const doc = new jsPDF();
  const margin = 20;
  let y = margin;

  const addLine = (text: string, size = 10, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, 170);
    doc.text(lines, margin, y);
    y += lines.length * 6 + 2;
  };

  addLine("CAPSTONE — Tax Harvest Instruction", 16, true);
  addLine(card.title, 12, true);
  addLine(`Estimated savings: ${formatINR(card.savings_inr)}`, 11);
  addLine(`Execute by: ${card.deadline}`, 10);
  y += 4;

  if (card.instructions) {
    card.instructions.forEach((inst, i) => {
      addLine(`Instruction ${i + 1}:`, 11, true);
      addLine(`${inst.action.toUpperCase()} ${inst.quantity} ${inst.symbol} on ${inst.account}`, 10);
      if (inst.loss_inr) addLine(`Loss: ${formatINR(inst.loss_inr)}`, 10);
      if (inst.offsets) addLine(`Offsets: ${inst.offsets}`, 10);
      y += 2;
    });
  }

  if (card.details) addLine(card.details, 9);
  y += 4;
  addLine("CAPSTONE does not execute trades. Execute via your broker.", 8);

  doc.save(`capstone-harvest-${cardId}.pdf`);
}
