export type NavView = "overview" | "attack" | "trade" | "ledger";

export const NAV_ITEMS: { id: NavView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "attack", label: "Attack Lab" },
  { id: "trade", label: "AI Trade" },
  { id: "ledger", label: "Proof Ledger" },
];
