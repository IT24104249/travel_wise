import { describe, it, expect } from "vitest";
import {
  getDestinationImage,
  getCatalogTypeIcon,
  getCatalogTypeLabel,
  getRoleGreeting,
  computeWizardSettlementPreview,
} from "../utils/helpers";
import { initialTripWizardState } from "../types";

describe("TravelWise Web Helper Functions", () => {
  it("returns specific destination images for Sri Lankan hotspots", () => {
    const sigiriyaImg = getDestinationImage("Sigiriya Lion Rock");
    expect(sigiriyaImg).toContain("photo-1586861635167-e5223aadc9fe");

    const ellaImg = getDestinationImage("Ella Nine Arches");
    expect(ellaImg).toContain("photo-1546708973-b339540b5162");

    const mirissaImg = getDestinationImage("Mirissa Beach");
    expect(mirissaImg).toContain("photo-1507525428034-b723cf961d3e");

    const yalaImg = getDestinationImage("Yala National Park Safari");
    expect(yalaImg).toContain("photo-1534177616072-ef7dc120449d");
  });

  it("returns correct emoji icons for catalog item types", () => {
    expect(getCatalogTypeIcon("VisitingPlace")).toBe("📍");
    expect(getCatalogTypeIcon("Restaurant")).toBe("🍽️");
    expect(getCatalogTypeIcon("Accommodation")).toBe("🏨");
    expect(getCatalogTypeIcon("FoodPrice")).toBe("💰");
    expect(getCatalogTypeIcon("UnknownType")).toBe("✨");
  });

  it("returns human-readable labels for catalog item types", () => {
    expect(getCatalogTypeLabel("VisitingPlace")).toBe("Place to Visit");
    expect(getCatalogTypeLabel("Restaurant")).toBe("Restaurant");
    expect(getCatalogTypeLabel("Accommodation")).toBe("Stay");
    expect(getCatalogTypeLabel("FoodPrice")).toBe("Food Price");
    expect(getCatalogTypeLabel("Custom")).toBe("Custom");
  });

  it("returns a contextual greeting", () => {
    const greeting = getRoleGreeting("User");
    expect(["Good morning", "Good afternoon", "Good evening"]).toContain(greeting);
  });

  it("computes wizard debt settlement correctly for split bills", () => {
    const testWizard = {
      ...initialTripWizardState,
      groupMembers: [
        { id: "1", value: "Alice" },
        { id: "2", value: "Bob" },
      ],
      initialExpenses: [
        { id: "e1", description: "Van rental", paidBy: "Alice", amount: "6000", category: "Transport", date: "2026-10-15", receiptName: "" },
      ],
    };

    const settlement = computeWizardSettlementPreview(testWizard);
    expect(settlement.transfers.length).toBeGreaterThan(0);
    expect(settlement.transfers[0].from).toBe("Bob");
    expect(settlement.transfers[0].to).toBe("Alice");
    expect(settlement.transfers[0].amount).toBe(3000);
  });
});
