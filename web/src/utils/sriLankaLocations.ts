// Comprehensive dataset of real Sri Lankan cities, towns, and top tourist destinations
export interface SriLankaLocation {
  name: string;
  region: string;
  province: string;
  category: "City" | "Tourist Destination" | "Town" | "Heritage" | "Beach" | "Hill Country" | "Wildlife";
}

export const SRI_LANKA_DATABASE: SriLankaLocation[] = [
  // Central Province
  { name: "Kandy", region: "Kandy District", province: "Central", category: "City" },
  { name: "Matale", region: "Matale District", province: "Central", category: "City" },
  { name: "Nuwara Eliya", region: "Nuwara Eliya District", province: "Central", category: "Hill Country" },
  { name: "Dambulla", region: "Matale District", province: "Central", category: "Heritage" },
  { name: "Sigiriya", region: "Matale District", province: "Central", category: "Heritage" },
  { name: "Ella", region: "Badulla District", province: "Uva", category: "Hill Country" },
  { name: "Hatton", region: "Nuwara Eliya District", province: "Central", category: "Hill Country" },
  { name: "Gampola", region: "Kandy District", province: "Central", category: "Town" },
  { name: "Nawalapitiya", region: "Kandy District", province: "Central", category: "Town" },
  { name: "Peradeniya", region: "Kandy District", province: "Central", category: "Tourist Destination" },
  { name: "Knuckles Range", region: "Matale/Kandy", province: "Central", category: "Tourist Destination" },

  // Western Province
  { name: "Colombo", region: "Colombo District", province: "Western", category: "City" },
  { name: "Negombo", region: "Gampaha District", province: "Western", category: "Beach" },
  { name: "Dehiwala-Mount Lavinia", region: "Colombo District", province: "Western", category: "City" },
  { name: "Moratuwa", region: "Colombo District", province: "Western", category: "City" },
  { name: "Kalutara", region: "Kalutara District", province: "Western", category: "Town" },
  { name: "Panadura", region: "Kalutara District", province: "Western", category: "Town" },
  { name: "Gampaha", region: "Gampaha District", province: "Western", category: "City" },
  { name: "Kelaniya", region: "Gampaha District", province: "Western", category: "Heritage" },
  { name: "Wattala", region: "Gampaha District", province: "Western", category: "Town" },
  { name: "Ja-Ela", region: "Gampaha District", province: "Western", category: "Town" },
  { name: "Bentota", region: "Galle/Kalutara", province: "Western/Southern", category: "Beach" },
  { name: "Beruwala", region: "Kalutara District", province: "Western", category: "Beach" },
  { name: "Aluthgama", region: "Kalutara District", province: "Western", category: "Town" },

  // Southern Province
  { name: "Galle", region: "Galle District", province: "Southern", category: "Heritage" },
  { name: "Matara", region: "Matara District", province: "Southern", category: "City" },
  { name: "Mirissa", region: "Matara District", province: "Southern", category: "Beach" },
  { name: "Hikkaduwa", region: "Galle District", province: "Southern", category: "Beach" },
  { name: "Unawatuna", region: "Galle District", province: "Southern", category: "Beach" },
  { name: "Weligama", region: "Matara District", province: "Southern", category: "Beach" },
  { name: "Tangalle", region: "Hambantota District", province: "Southern", category: "Beach" },
  { name: "Hambantota", region: "Hambantota District", province: "Southern", category: "City" },
  { name: "Yala National Park", region: "Hambantota District", province: "Southern", category: "Wildlife" },
  { name: "Tissamaharama", region: "Hambantota District", province: "Southern", category: "Tourist Destination" },
  { name: "Kataragama", region: "Monaragala District", province: "Uva", category: "Heritage" },
  { name: "Ambalangoda", region: "Galle District", province: "Southern", category: "Town" },
  { name: "Koggala", region: "Galle District", province: "Southern", category: "Beach" },

  // Uva Province
  { name: "Badulla", region: "Badulla District", province: "Uva", category: "City" },
  { name: "Bandarawela", region: "Badulla District", province: "Uva", category: "Hill Country" },
  { name: "Haputale", region: "Badulla District", province: "Uva", category: "Hill Country" },
  { name: "Mahiyanganaya", region: "Badulla District", province: "Uva", category: "Heritage" },
  { name: "Monaragala", region: "Monaragala District", province: "Uva", category: "City" },
  { name: "Wellawaya", region: "Monaragala District", province: "Uva", category: "Town" },
  { name: "Buttala", region: "Monaragala District", province: "Uva", category: "Town" },

  // Sabaragamuwa Province
  { name: "Ratnapura", region: "Ratnapura District", province: "Sabaragamuwa", category: "City" },
  { name: "Kegalle", region: "Kegalle District", province: "Sabaragamuwa", category: "City" },
  { name: "Balangoda", region: "Ratnapura District", province: "Sabaragamuwa", category: "Town" },
  { name: "Embilipitiya", region: "Ratnapura District", province: "Sabaragamuwa", category: "Town" },
  { name: "Kitulgala", region: "Kegalle District", province: "Sabaragamuwa", category: "Tourist Destination" },
  { name: "Sinharaja Forest", region: "Ratnapura/Galle", province: "Sabaragamuwa", category: "Wildlife" },
  { name: "Adams Peak (Sri Pada)", region: "Ratnapura/Nuwara Eliya", province: "Sabaragamuwa", category: "Heritage" },
  { name: "Udawalawe National Park", region: "Ratnapura/Monaragala", province: "Sabaragamuwa", category: "Wildlife" },

  // North Central Province
  { name: "Anuradhapura", region: "Anuradhapura District", province: "North Central", category: "Heritage" },
  { name: "Polonnaruwa", region: "Polonnaruwa District", province: "North Central", category: "Heritage" },
  { name: "Habarana", region: "Anuradhapura District", province: "North Central", category: "Wildlife" },
  { name: "Mihintale", region: "Anuradhapura District", province: "North Central", category: "Heritage" },
  { name: "Minneriya National Park", region: "Polonnaruwa District", province: "North Central", category: "Wildlife" },
  { name: "Medawachchiya", region: "Anuradhapura District", province: "North Central", category: "Town" },

  // Eastern Province
  { name: "Trincomalee", region: "Trincomalee District", province: "Eastern", category: "Beach" },
  { name: "Nilaveli", region: "Trincomalee District", province: "Eastern", category: "Beach" },
  { name: "Batticaloa", region: "Batticaloa District", province: "Eastern", category: "City" },
  { name: "Pasikudah", region: "Batticaloa District", province: "Eastern", category: "Beach" },
  { name: "Arugam Bay", region: "Ampara District", province: "Eastern", category: "Beach" },
  { name: "Ampara", region: "Ampara District", province: "Eastern", category: "City" },
  { name: "Kalmunai", region: "Ampara District", province: "Eastern", category: "City" },

  // Northern Province
  { name: "Jaffna", region: "Jaffna District", province: "Northern", category: "City" },
  { name: "Point Pedro", region: "Jaffna District", province: "Northern", category: "Beach" },
  { name: "Mannar", region: "Mannar District", province: "Northern", category: "Town" },
  { name: "Vavuniya", region: "Vavuniya District", province: "Northern", category: "City" },
  { name: "Kilinochchi", region: "Kilinochchi District", province: "Northern", category: "Town" },
  { name: "Mullaitivu", region: "Mullaitivu District", province: "Northern", category: "Town" },

  // North Western Province
  { name: "Kurunegala", region: "Kurunegala District", province: "North Western", category: "City" },
  { name: "Chilaw", region: "Puttalam District", province: "North Western", category: "Beach" },
  { name: "Puttalam", region: "Puttalam District", province: "North Western", category: "Town" },
  { name: "Kalpitiya", region: "Puttalam District", province: "North Western", category: "Beach" },
  { name: "Kuliyapitiya", region: "Kurunegala District", province: "North Western", category: "Town" },
  { name: "Wilpattu National Park", region: "Puttalam/Anuradhapura", province: "North Western", category: "Wildlife" }
];

export interface LocationSuggestion {
  displayName: string;
  subTitle: string;
  source: "Database" | "OpenStreetMap";
}

// Search locations matching query in Sri Lanka
export async function searchSriLankaLocations(query: string): Promise<LocationSuggestion[]> {
  const cleanQ = query.trim().toLowerCase();
  if (cleanQ.length < 1) return [];

  // 1. Instant match from verified Sri Lanka database
  const localMatches: LocationSuggestion[] = SRI_LANKA_DATABASE.filter(loc =>
    loc.name.toLowerCase().includes(cleanQ) ||
    loc.region.toLowerCase().includes(cleanQ) ||
    loc.province.toLowerCase().includes(cleanQ)
  ).slice(0, 8).map(loc => ({
    displayName: `${loc.name}, Sri Lanka`,
    subTitle: `${loc.region} · ${loc.province} Province (${loc.category})`,
    source: "Database" as const
  }));

  // 2. Query OpenStreetMap Nominatim for Sri Lanka
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=lk&limit=5&q=${encodeURIComponent(cleanQ)}`,
      { signal: controller.signal, headers: { Accept: "application/json" } }
    );
    clearTimeout(timeoutId);

    if (resp.ok) {
      const items = await resp.json();
      if (Array.isArray(items)) {
        const osmMatches: LocationSuggestion[] = items.map((item: any) => {
          const parts = (item.display_name || "").split(",");
          const mainTitle = parts.slice(0, 2).join(",").trim() + ", Sri Lanka";
          const sub = parts.slice(2, 4).join(",").trim() || "Sri Lanka";
          return {
            displayName: mainTitle,
            subTitle: sub,
            source: "OpenStreetMap" as const
          };
        });

        // Merge without duplicates
        const seen = new Set(localMatches.map(m => m.displayName.toLowerCase()));
        for (const osm of osmMatches) {
          if (!seen.has(osm.displayName.toLowerCase())) {
            seen.add(osm.displayName.toLowerCase());
            localMatches.push(osm);
          }
        }
      }
    }
  } catch {
    // If network API fails or times out, local Sri Lanka database matches are returned
  }

  return localMatches.slice(0, 8);
}

// Validate if a destination is a recognized location in Sri Lanka
export function isValidSriLankanLocation(dest: string): boolean {
  if (!dest || !dest.trim()) return false;
  const d = dest.trim().toLowerCase();

  // Explicit check against database
  const match = SRI_LANKA_DATABASE.some(loc =>
    d.includes(loc.name.toLowerCase()) || loc.name.toLowerCase().includes(d)
  );
  if (match) return true;

  // Check if string specifies Sri Lanka
  if (d.includes("sri lanka") || d.includes(", sl") || d.includes("ceylon")) {
    return true;
  }

  // Also check if matches any district or province
  const districts = [
    "colombo", "gampaha", "kalutara", "kandy", "matale", "nuwara eliya",
    "galle", "matara", "hambantota", "jaffna", "kilinochchi", "mannar",
    "vavuniya", "mullaitivu", "batticaloa", "ampara", "trincomalee",
    "kurunegala", "puttalam", "anuradhapura", "polonnaruwa", "badulla",
    "monaragala", "ratnapura", "kegalle"
  ];
  return districts.some(dist => d.includes(dist));
}
