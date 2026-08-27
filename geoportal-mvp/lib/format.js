export const money = (value = 0, currency = "USD") => new Intl.NumberFormat("es-HN", {
  style: "currency", currency, maximumFractionDigits: 0,
}).format(Number(value || 0));

export const compactMoney = (value = 0) => new Intl.NumberFormat("es-HN", {
  notation: "compact", style: "currency", currency: "USD", maximumFractionDigits: 1,
}).format(Number(value || 0));

export const number = (value = 0) => new Intl.NumberFormat("es-HN").format(Number(value || 0));
export const percent = (value = 0) => `${Number(value || 0).toFixed(1)}%`;
export const date = (value) => value ? new Intl.DateTimeFormat("es-HN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`)) : "—";

export const statusLabel = {
  draft: "Borrador", active: "En curso", attention: "Atención", critical: "Crítico", closing: "En cierre", closed: "Cerrado",
};
