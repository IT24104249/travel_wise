import { Role, TripWizardState } from "../types";

export function getDestinationImage(destination: string, type?: string): string {
  const dest = (destination || "").toLowerCase().trim();
  const t = (type || "").toLowerCase();
  
  // Specific Sri Lankan destinations
  if (dest.includes("sigiriya") || dest.includes("lion rock") || dest.includes("dambulla") || dest.includes("pidurangala")) {
    return "https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&w=800&q=80";
  }
  if (dest.includes("ella") || dest.includes("nine arches") || dest.includes("nine arch") || dest.includes("nuwara") || dest.includes("horton") || dest.includes("haputale")) {
    return "https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&w=800&q=80";
  }
  if (dest.includes("mirissa") || dest.includes("arugam") || dest.includes("trincomalee") || dest.includes("nilaveli") || dest.includes("weligama") || dest.includes("tangalle") || dest.includes("bentota") || dest.includes("hikkaduwa") || t.includes("beach")) {
    return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80";
  }
  if (dest.includes("galle") || dest.includes("dutch fort") || dest.includes("colombo") || dest.includes("unawatuna")) {
    return "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=800&q=80";
  }
  if (dest.includes("kandy") || dest.includes("temple") || dest.includes("tooth") || dest.includes("peradeniya")) {
    return "https://images.unsplash.com/photo-1588598198321-9735fd52455f?auto=format&fit=crop&w=800&q=80";
  }
  if (dest.includes("yala") || dest.includes("safari") || dest.includes("park") || dest.includes("wilpattu") || dest.includes("udawalawe") || dest.includes("minneriya")) {
    return "https://images.unsplash.com/photo-1534177616072-ef7dc120449d?auto=format&fit=crop&w=800&q=80";
  }
  if (dest.includes("anuradhapura") || dest.includes("polonnaruwa") || dest.includes("ancient") || dest.includes("mihintale")) {
    return "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80";
  }

  // Generic categories
  if (t.includes("accommodation") || t.includes("hotel") || t.includes("resort") || t.includes("villa") || t.includes("stay")) {
    return "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80";
  }
  if (t.includes("restaurant") || t.includes("food") || t.includes("cafe") || t.includes("dining")) {
    return "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80";
  }

  // Default scenic Sri Lanka
  return "https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&w=800&q=80";
}

export function getCatalogTypeIcon(type: string): string {
  switch (type) {
    case "VisitingPlace": return "📍";
    case "Restaurant": return "🍽️";
    case "Accommodation": return "🏨";
    case "FoodPrice": return "💰";
    default: return "✨";
  }
}

export function getCatalogTypeLabel(type: string): string {
  switch (type) {
    case "VisitingPlace": return "Place to Visit";
    case "Restaurant": return "Restaurant";
    case "Accommodation": return "Stay";
    case "FoodPrice": return "Food Price";
    default: return type;
  }
}

export function getRoleGreeting(role: Role): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function computeWizardSettlementPreview(wizard: TripWizardState) {
  const members = wizard.groupMembers.map(m => m.value.trim()).filter(Boolean);
  const sharedAmt = Number(wizard.sharedExpenseAmount) || 0;
  const initialSum = wizard.initialExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalAmount = sharedAmt + initialSum;

  if (members.length === 0) {
    return {
      transfers: [],
      totalAmount,
      payer: "",
      message: "Add group members in Step 1 to generate an AI settlement plan preview."
    };
  }

  if (totalAmount <= 0) {
    return {
      transfers: [],
      totalAmount: 0,
      payer: "",
      message: "Enter shared or initial expense amounts above to calculate AI settlement plan preview."
    };
  }

  const payer = wizard.sharedExpensePaidBy.trim() || members[0] || "Primary Member";
  const balances: Record<string, number> = {};
  members.forEach(m => { balances[m] = 0; });
  if (balances[payer] === undefined) {
    balances[payer] = 0;
  }

  balances[payer] += totalAmount;

  if (wizard.splitStrategy === "EQUAL") {
    const perPerson = totalAmount / members.length;
    members.forEach(m => {
      balances[m] -= perPerson;
    });
  } else if (wizard.splitStrategy === "PERCENTAGE") {
    members.forEach(m => {
      const pct = Number(wizard.splitAllocations[m]) || (100 / members.length);
      balances[m] -= (totalAmount * pct) / 100;
    });
  } else if (wizard.splitStrategy === "CUSTOM") {
    members.forEach(m => {
      const customVal = Number(wizard.splitAllocations[m]) || (totalAmount / members.length);
      balances[m] -= customVal;
    });
  }

  const creditors: { name: string; amount: number }[] = [];
  const debtors: { name: string; amount: number }[] = [];

  Object.entries(balances).forEach(([name, val]) => {
    if (val > 0.01) creditors.push({ name, amount: val });
    else if (val < -0.01) debtors.push({ name, amount: -val });
  });

  const transfers: { from: string; to: string; amount: number; currency: string }[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(debtors[i].amount, creditors[j].amount);
    transfers.push({
      from: debtors[i].name,
      to: creditors[j].name,
      amount: Math.round(amt * 100) / 100,
      currency: wizard.currency || "LKR"
    });
    debtors[i].amount -= amt;
    creditors[j].amount -= amt;
    if (debtors[i].amount <= 0.01) i++;
    if (creditors[j].amount <= 0.01) j++;
  }

  return { transfers, totalAmount, payer, message: null };
}
