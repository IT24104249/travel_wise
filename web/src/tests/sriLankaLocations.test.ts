import { describe, it, expect } from "vitest";
import { searchSriLankaLocations, isValidSriLankanLocation, SRI_LANKA_DATABASE } from "../utils/sriLankaLocations";

describe("Sri Lanka Locations Utility", () => {
  it("contains curated database of Sri Lankan hotspots", () => {
    expect(SRI_LANKA_DATABASE.length).toBeGreaterThan(30);
    expect(SRI_LANKA_DATABASE.some((l) => l.name === "Sigiriya")).toBe(true);
    expect(SRI_LANKA_DATABASE.some((l) => l.name === "Ella")).toBe(true);
  });

  it("finds matching destinations for keywords asynchronously", async () => {
    const results = await searchSriLankaLocations("ella");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.displayName.toLowerCase().includes("ella"))).toBe(true);
  });

  it("validates known Sri Lankan places correctly", () => {
    expect(isValidSriLankanLocation("Sigiriya")).toBe(true);
    expect(isValidSriLankanLocation("Kandy")).toBe(true);
    expect(isValidSriLankanLocation("Mirissa, Sri Lanka")).toBe(true);
    expect(isValidSriLankanLocation("NonExistentUnknownPlaceXYZ999")).toBe(false);
  });
});
