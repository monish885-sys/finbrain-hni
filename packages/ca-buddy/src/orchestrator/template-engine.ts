export function renderTemplate(template: string, vars: Record<string, string | number | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = vars[key];
    return val !== undefined && val !== null ? String(val) : "";
  });
}

export function formatInr(n: number): string {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `${(n / 100_000).toFixed(2)} L`;
  return n.toLocaleString("en-IN");
}

export function formatCitations(citations: Array<{ section: string; text: string }>): string {
  return citations.map((c) => `**${c.section}:** ${c.text}`).join("\n");
}
