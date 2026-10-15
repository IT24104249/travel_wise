import React, { useState, useEffect, useMemo } from "react";
import { CatalogItem, Role } from "../types";
import { apiRequest } from "../utils/api";

interface ExploreSriLankaViewProps {
  role: Role;
  currentUserId: string;
  onPlanTrip?: (destinationName: string) => void;
}

const CATEGORIES = [
  { id: "ALL", label: "All Attractions", icon: "🌟" },
  { id: "Beaches", label: "Beaches & Coastal", icon: "🏖️" },
  { id: "Historical Ruins", label: "Ancient Ruins & UNESCO", icon: "🏛️" },
  { id: "Natural Waterfalls", label: "Natural Waterfalls", icon: "🌊" },
  { id: "Hiking & Peaks", label: "Hiking & Misty Peaks", icon: "🥾" },
  { id: "Wildlife & Nature", label: "Wildlife Safaris & Nature", icon: "🌿" },
];

export const ExploreSriLankaView: React.FC<ExploreSriLankaViewProps> = ({
  role,
  currentUserId,
  onPlanTrip,
}) => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search and Filter State
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"rating" | "name" | "price-asc" | "price-desc">("rating");

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);

  // Admin Publish & Edit Modal State - Accessible by ANY Admin account
  const isAdmin =
    role === "StaffAdmin" ||
    role?.toLowerCase().includes("admin") ||
    (currentUserId && currentUserId.toLowerCase().includes("admin")) ||
    (typeof window !== "undefined" && (() => {
      try {
        const s = JSON.parse(localStorage.getItem("travelwise_session") || "{}");
        const r = String(s?.role || s?.user?.role || "").toLowerCase();
        const em = String(s?.user?.email || s?.email || "").toLowerCase();
        return r.includes("admin") || em.includes("admin");
      } catch {
        return false;
      }
    })());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    category: "Historical Ruins",
    customCategory: "",
    destination: "",
    description: "",
    imageUrl: "",
    tips: "",
    price: "",
    currency: "LKR",
    rating: "4.8",
  });

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch public approved catalog items
      const data = await apiRequest<CatalogItem[]>("/api/catalog", {}, role, currentUserId);
      setItems(data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load Explore Sri Lanka attractions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [role, currentUserId]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      category: "Historical Ruins",
      customCategory: "",
      destination: "",
      description: "",
      imageUrl: "",
      tips: "",
      price: "",
      currency: "LKR",
      rating: "4.8",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: CatalogItem) => {
    setEditingItem(item);
    const existingCat = item.cuisineOrCategory || "Historical Ruins";
    const isStandard = CATEGORIES.some(c => c.id !== "ALL" && c.id.toLowerCase() === existingCat.toLowerCase());

    setFormData({
      name: item.name,
      category: isStandard ? existingCat : "Other",
      customCategory: isStandard ? "" : existingCat,
      destination: item.destination,
      description: item.description,
      imageUrl: item.address || "",
      tips: item.contact || "",
      price: item.price !== null && item.price !== undefined ? String(item.price) : "",
      currency: item.currency || "LKR",
      rating: item.rating ? String(item.rating) : "4.8",
    });
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image file size should be less than 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.destination.trim() || !formData.description.trim()) {
      alert("Please fill in the attraction name, location, and description.");
      return;
    }

    const finalCategory =
      formData.category === "Other" && formData.customCategory.trim()
        ? formData.customCategory.trim()
        : formData.category;

    const payload = {
      type: 0, // VisitingPlace
      name: formData.name.trim(),
      destination: formData.destination.trim(),
      description: formData.description.trim(),
      address: formData.imageUrl.trim() || null,
      contact: formData.tips.trim() || null,
      price: formData.price ? Number(formData.price) : 0,
      currency: formData.currency || "LKR",
      cuisineOrCategory: finalCategory,
      rating: formData.rating ? Number(formData.rating) : 4.8,
    };

    setSubmitting(true);
    try {
      if (editingItem) {
        const reqRole = isAdmin ? "StaffAdmin" : role;
        await apiRequest(`/api/catalog/${editingItem.id}`, {
          method: "PUT",
          body: JSON.stringify({ ...payload, isActive: true }),
        }, reqRole, currentUserId);
        setSuccess(`"${formData.name}" successfully updated.`);
      } else {
        const reqRole = isAdmin ? "StaffAdmin" : role;
        await apiRequest("/api/catalog", {
          method: "POST",
          body: JSON.stringify(payload),
        }, reqRole, currentUserId);
        setSuccess(`"${formData.name}" successfully published to Explore Sri Lanka.`);
      }
      setIsModalOpen(false);
      await fetchItems();
    } catch (err: any) {
      alert(err?.message || "Failed to save attraction.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: CatalogItem) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}" from Explore Sri Lanka?`)) {
      return;
    }
    try {
      const reqRole = isAdmin ? "StaffAdmin" : role;
      await apiRequest(`/api/catalog/${item.id}`, { method: "DELETE" }, reqRole, currentUserId);
      setSuccess(`"${item.name}" was successfully removed.`);
      await fetchItems();
    } catch (err: any) {
      alert(err?.message || "Failed to delete attraction.");
    }
  };

  // Filtered and Sorted Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Category filter
      if (selectedCategory !== "ALL") {
        const cat = (item.cuisineOrCategory || "").toLowerCase();
        const target = selectedCategory.toLowerCase();
        if (!cat.includes(target) && !target.includes(cat)) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inName = item.name.toLowerCase().includes(q);
        const inDest = item.destination.toLowerCase().includes(q);
        const inDesc = item.description.toLowerCase().includes(q);
        const inTips = (item.contact || "").toLowerCase().includes(q);
        if (!inName && !inDest && !inDesc && !inTips) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "rating") {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "price-asc") {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortBy === "price-desc") {
        return (b.price || 0) - (a.price || 0);
      }
      return 0;
    });
  }, [items, selectedCategory, searchQuery, sortBy]);

  const getCategoryCount = (catId: string) => {
    if (catId === "ALL") return items.length;
    return items.filter(item => {
      const cat = (item.cuisineOrCategory || "").toLowerCase();
      const target = catId.toLowerCase();
      return cat.includes(target) || target.includes(cat);
    }).length;
  };

  const getDefaultImageForCategory = (category?: string) => {
    const c = (category || "").toLowerCase();
    if (c.includes("beach")) return "/images/beach-resort.jpg";
    if (c.includes("ruin") || c.includes("fort") || c.includes("temple")) return "/images/sigiriya-aerial.jpg";
    if (c.includes("waterfall")) return "/images/coastal-aerial.jpg";
    if (c.includes("hik") || c.includes("peak") || c.includes("rock")) return "/images/sigiriya-golden.jpg";
    if (c.includes("wildlife") || c.includes("safari") || c.includes("park")) return "/images/wildlife-peacock.jpg";
    return "/images/sigiriya-golden.jpg";
  };

  const getAuthenticSriLankaImage = (name?: string, destination?: string, category?: string, address?: string) => {
    if (address && address.trim()) {
      const addr = address.trim();
      if (!addr.includes("images.unsplash.com")) {
        return addr;
      }
    }
    const combined = `${name || ""} ${destination || ""} ${category || ""}`.toLowerCase();
    if (combined.includes("resort") || combined.includes("bentota") || combined.includes("cliff") || combined.includes("saman") || combined.includes("villa") || combined.includes("hotel")) {
      return "/images/beach-resort.jpg";
    }
    if (combined.includes("sigiriya") || combined.includes("kashyapa") || combined.includes("lion rock") || combined.includes("citadel") || combined.includes("ruin") || combined.includes("fortress") || combined.includes("water garden") || combined.includes("polonnaruwa")) {
      return combined.includes("citadel") || combined.includes("water garden") || combined.includes("aerial")
        ? "/images/sigiriya-aerial.jpg"
        : "/images/sigiriya-golden.jpg";
    }
    if (combined.includes("beach") || combined.includes("mirissa") || combined.includes("hiriketiya") || combined.includes("coastal") || combined.includes("surf") || combined.includes("waterfall") || combined.includes("diyaluma")) {
      return "/images/coastal-aerial.jpg";
    }
    if (combined.includes("wildlife") || combined.includes("safari") || combined.includes("yala") || combined.includes("wilpattu") || combined.includes("peacock") || combined.includes("leopard") || combined.includes("elephant") || combined.includes("udawalawe")) {
      return "/images/wildlife-peacock.jpg";
    }
    return getDefaultImageForCategory(category);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", paddingBottom: 48 }}>
      {/* ========================================================================= */}
      {/* HERO BANNER SECTION (LUXURY EDITORIAL COVER)                              */}
      {/* ========================================================================= */}
      <div
        style={{
          position: "relative",
          borderRadius: 24,
          overflow: "hidden",
          background: "linear-gradient(90deg, rgba(11, 19, 32, 0.96) 0%, rgba(15, 23, 42, 0.90) 50%, rgba(15, 23, 42, 0.65) 100%), url('/images/sigiriya-golden.jpg') right center / cover no-repeat",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
          padding: "42px 36px",
          color: "#fff",
        }}
      >
        {/* Subtle background glow */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(20, 184, 166, 0.25) 0%, rgba(20, 184, 166, 0) 70%)",
            filter: "blur(50px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -60,
            left: 40,
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0) 70%)",
            filter: "blur(50px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 920 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(245, 158, 11, 0.2)", border: "1px solid rgba(245, 158, 11, 0.5)", borderRadius: 30, padding: "5px 16px", marginBottom: 18 }}>
            <span style={{ fontSize: 12, color: "#fbbf24", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}>
              ✨ Wonder of Asia • Sri Lanka Tourism & Heritage
            </span>
          </div>

          <h1 style={{ fontSize: "clamp(28px, 4.5vw, 44px)", fontWeight: 800, margin: "0 0 14px 0", letterSpacing: "-0.8px", lineHeight: 1.15, textShadow: "0 4px 16px rgba(0,0,0,0.7)" }}>
            Explore Sri Lanka — Wonder of Asia
          </h1>
          <p style={{ fontSize: 15, color: "#e2e8f0", lineHeight: 1.7, margin: "0 0 22px 0", maxWidth: 820, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
            Curated destination showcase for global travelers. From the dramatic 5th-century royal fortress of Sigiriya to sun-drenched Indian Ocean beaches, cascading waterfalls, and world-class wildlife safaris.
          </p>

          {/* Quick Highlight Pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: "5px 14px", fontSize: 12, color: "#f8fafc" }}>
              🏛️ 8 UNESCO World Heritage Sites
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: "5px 14px", fontSize: 12, color: "#f8fafc" }}>
              🏖️ 1,340 km Golden Coastline
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: "5px 14px", fontSize: 12, color: "#f8fafc" }}>
              🐆 Highest Global Leopard Density
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: "5px 14px", fontSize: 12, color: "#f8fafc" }}>
              🛡️ Certified Local Partners
            </span>
          </div>

          {/* Search Bar & Actions */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <div style={{ flex: "1 1 340px", position: "relative" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search destinations (e.g. Sigiriya, Mirissa, Ella, Yala, Bentota)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "13px 18px 13px 44px",
                  borderRadius: 14,
                  fontSize: 14,
                  background: "rgba(15, 23, 42, 0.85)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  color: "#fff",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                }}
              />
              <span style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", fontSize: 17, opacity: 0.8 }}>
                🔍
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <select
                className="form-control"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                style={{
                  padding: "13px 16px",
                  borderRadius: 14,
                  fontSize: 13,
                  background: "rgba(15, 23, 42, 0.85)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }}
              >
                <option value="rating">Sort: Highest Rated ⭐</option>
                <option value="name">Sort: Name (A to Z)</option>
                <option value="price-asc">Sort: Entry Fee (Lowest / Free)</option>
                <option value="price-desc">Sort: Entry Fee (Highest)</option>
              </select>

              {isAdmin && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleOpenAdd}
                  style={{
                    padding: "13px 22px",
                    borderRadius: 14,
                    fontWeight: 700,
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    border: "none",
                    boxShadow: "0 4px 18px rgba(245, 158, 11, 0.4)",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <span>✨</span> Publish New Attraction
                </button>
              )}
            </div>
          </div>

          {/* Quick Destination Tags */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Quick Jump:</span>
            {["Sigiriya", "Mirissa", "Ella", "Yala", "Bentota", "Galle", "Polonnaruwa"].map(dest => (
              <button
                key={dest}
                type="button"
                onClick={() => setSearchQuery(dest)}
                style={{
                  background: searchQuery === dest ? "rgba(245, 158, 11, 0.3)" : "rgba(255, 255, 255, 0.08)",
                  border: searchQuery === dest ? "1px solid #f59e0b" : "1px solid rgba(255, 255, 255, 0.15)",
                  color: searchQuery === dest ? "#fbbf24" : "#e2e8f0",
                  borderRadius: 16,
                  padding: "3px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {dest}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Success / Error Alerts */}

      {success && (
        <div style={{ background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.4)", borderRadius: 12, padding: "12px 18px", color: "#4ade80", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>✓ {success}</span>
          <button type="button" onClick={() => setSuccess(null)} style={{ background: "none", border: "none", color: "#4ade80", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
      )}
      {error && (
        <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: 12, padding: "12px 18px", color: "#f87171", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CATEGORY FILTER TABS                                                      */}
      {/* ========================================================================= */}
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "thin" }}>
        {CATEGORIES.map(cat => {
          const isSelected = selectedCategory === cat.id;
          const count = getCategoryCount(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 50,
                fontSize: 13,
                fontWeight: isSelected ? 700 : 500,
                whiteSpace: "nowrap",
                cursor: "pointer",
                transition: "all 0.2s ease",
                border: isSelected ? "2px solid #14b8a6" : "1px solid rgba(255, 255, 255, 0.1)",
                background: isSelected ? "rgba(20, 184, 166, 0.22)" : "rgba(255, 255, 255, 0.04)",
                color: isSelected ? "#2dd4bf" : "#cbd5e1",
                boxShadow: isSelected ? "0 4px 12px rgba(20, 184, 166, 0.2)" : "none",
              }}
            >
              <span style={{ fontSize: 16 }}>{cat.icon}</span>
              <span>{cat.label}</span>
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 7px",
                  borderRadius: 20,
                  background: isSelected ? "rgba(20, 184, 166, 0.4)" : "rgba(255, 255, 255, 0.08)",
                  color: isSelected ? "#fff" : "#94a3b8",
                  fontWeight: 600,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* ATTRACTIONS GRID                                                          */}
      {/* ========================================================================= */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌏</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Loading Sri Lankan destinations...</div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "rgba(255, 255, 255, 0.02)",
            borderRadius: 16,
            border: "1px dashed rgba(255, 255, 255, 0.15)",
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 14 }}>🏝️</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px 0" }}>No destinations found</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 16px 0" }}>
            No attractions matched your search query or selected category.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => { setSelectedCategory("ALL"); setSearchQuery(""); }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 22,
          }}
        >
          {filteredItems.map(item => {
            const displayImg = getAuthenticSriLankaImage(item.name, item.destination, item.cuisineOrCategory, item.address);
            const isFree = !item.price || item.price === 0;

            return (
              <div
                key={item.id}
                style={{
                  background: "var(--bg-card, #1e293b)",
                  borderRadius: 16,
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.borderColor = "rgba(20, 184, 166, 0.4)";
                  e.currentTarget.style.boxShadow = "0 16px 32px -6px rgba(0, 0, 0, 0.45)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.3)";
                }}
              >
                {/* Photo Header */}
                <div style={{ position: "relative", width: "100%", height: 210, overflow: "hidden", background: "#0f172a" }}>
                  <img
                    src={displayImg}
                    alt={item.name}
                    loading="lazy"
                    onError={(e) => {
                      // Fallback image if remote url fails
                      e.currentTarget.src = "/images/sigiriya-golden.jpg";
                    }}

                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transition: "transform 0.4s ease",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
                    onMouseLeave={e => (e.currentTarget.style.transform = "scale(1.0)")}
                  />

                  {/* Gradient overlay for readability */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.7) 100%)",
                      pointerEvents: "none",
                    }}
                  />

                  {/* Category Badge */}
                  <div style={{ position: "absolute", top: 12, left: 12 }}>
                    <span
                      style={{
                        background: "rgba(15, 23, 42, 0.85)",
                        backdropFilter: "blur(6px)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        color: "#2dd4bf",
                        borderRadius: 20,
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.4px",
                      }}
                    >
                      {item.cuisineOrCategory || "Visiting Place"}
                    </span>
                  </div>

                  {/* Rating Badge */}
                  {item.rating && (
                    <div style={{ position: "absolute", top: 12, right: 12 }}>
                      <span
                        style={{
                          background: "rgba(245, 158, 11, 0.95)",
                          color: "#1e1b4b",
                          borderRadius: 20,
                          padding: "4px 9px",
                          fontSize: 12,
                          fontWeight: 800,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                        }}
                      >
                        ⭐ {item.rating.toFixed(1)}
                      </span>
                    </div>
                  )}

                  {/* Destination Location Over Image */}
                  <div style={{ position: "absolute", bottom: 10, left: 14, right: 14 }}>
                    <span
                      style={{
                        color: "#f1f5f9",
                        fontSize: 12,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                      }}
                    >
                      📍 {item.destination}
                    </span>
                  </div>
                </div>

                {/* Card Content Body */}
                <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", flex: 1, gap: 12 }}>
                  <div>
                    <h3
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        margin: "0 0 6px 0",
                        color: "#f8fafc",
                        lineHeight: 1.3,
                      }}
                    >
                      {item.name}
                    </h3>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-muted, #94a3b8)",
                        lineHeight: 1.6,
                        margin: 0,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {item.description}
                    </p>
                  </div>

                  {/* Practical Travel Tips / Best Season */}
                  {item.contact && (
                    <div
                      style={{
                        background: "rgba(245, 158, 11, 0.08)",
                        border: "1px solid rgba(245, 158, 11, 0.2)",
                        borderRadius: 8,
                        padding: "8px 12px",
                        fontSize: 12,
                        color: "#fcd34d",
                        lineHeight: 1.4,
                      }}
                    >
                      <strong>💡 Tip:</strong> {item.contact}
                    </div>
                  )}

                  {/* Meta Details: Entry Fee & Action */}
                  <div
                    style={{
                      marginTop: "auto",
                      paddingTop: 14,
                      borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-dim, #64748b)", textTransform: "uppercase", fontWeight: 600 }}>
                        Foreigner Entry Fee
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
                        {isFree ? (
                          <span style={{ color: "#4ade80" }}>🎟️ Free Public Access</span>
                        ) : (
                          <span style={{ color: "#fbbf24" }}>
                            🎟️ {item.price?.toLocaleString()} {item.currency}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        style={{
                          background: "rgba(255, 255, 255, 0.06)",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          color: "#cbd5e1",
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Details
                      </button>

                      <button
                        type="button"
                        onClick={() => onPlanTrip && onPlanTrip(item.destination || item.name)}
                        style={{
                          background: "linear-gradient(135deg, #14b8a6, #0d9488)",
                          border: "none",
                          color: "#fff",
                          borderRadius: 8,
                          padding: "6px 14px",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Plan Trip
                      </button>
                    </div>
                  </div>

                  {/* Admin Specific Action Controls */}
                  {isAdmin && (
                    <div
                      style={{
                        paddingTop: 8,
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 8,
                        borderTop: "1px dashed rgba(245, 158, 11, 0.25)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        style={{
                          background: "rgba(56, 189, 248, 0.15)",
                          border: "1px solid rgba(56, 189, 248, 0.3)",
                          color: "#38bdf8",
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        ✏️ Edit Listing
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        style={{
                          background: "rgba(239, 68, 68, 0.15)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          color: "#f87171",
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ATTRACTION DETAIL MODAL                                                    */}
      {/* ========================================================================= */}
      {selectedItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setSelectedItem(null)}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 20,
              maxWidth: 680,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
              position: "relative",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Image Header */}
            <div style={{ position: "relative", height: 260, width: "100%", overflow: "hidden" }}>
              <img
                src={selectedItem.address || getDefaultImageForCategory(selectedItem.cuisineOrCategory)}
                alt={selectedItem.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(15,23,42,1) 100%)",
                }}
              />
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  background: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#fff",
                  borderRadius: "50%",
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                ✕
              </button>
              <div style={{ position: "absolute", bottom: 16, left: 24, right: 24 }}>
                <span
                  style={{
                    background: "rgba(20, 184, 166, 0.9)",
                    color: "#fff",
                    borderRadius: 20,
                    padding: "3px 12px",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {selectedItem.cuisineOrCategory || "Attraction"}
                </span>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: "8px 0 2px 0", color: "#fff" }}>
                  {selectedItem.name}
                </h2>
                <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 500 }}>
                  📍 {selectedItem.destination} {selectedItem.rating ? `• ⭐ ${selectedItem.rating.toFixed(1)} / 5.0` : ""}
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <h4 style={{ fontSize: 13, color: "var(--brand-teal, #2dd4bf)", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 6px 0" }}>
                  Overview for Travelers
                </h4>
                <p style={{ fontSize: 14, color: "#e2e8f0", lineHeight: 1.7, margin: 0 }}>
                  {selectedItem.description}
                </p>
              </div>

              {selectedItem.contact && (
                <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>
                    🌟 Best Season & Visiting Advice
                  </div>
                  <div style={{ fontSize: 13, color: "#fef3c7", lineHeight: 1.5 }}>
                    {selectedItem.contact}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 12, padding: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Foreign Tourist Ticket</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fbbf24", marginTop: 2 }}>
                    {!selectedItem.price || selectedItem.price === 0 ? "Free Entry" : `${selectedItem.price.toLocaleString()} ${selectedItem.currency}`}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Location Region</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginTop: 2 }}>
                    {selectedItem.destination}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedItem(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const dest = selectedItem.destination || selectedItem.name;
                    setSelectedItem(null);
                    if (onPlanTrip) onPlanTrip(dest);
                  }}
                  style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}
                >
                  ✈️ Plan Trip to {selectedItem.name}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADMIN PUBLISH & EDIT MODAL                                                */}
      {/* ========================================================================= */}
      {isAdmin && isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              borderRadius: 20,
              maxWidth: 640,
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
              padding: "28px 32px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#fbbf24" }}>
                  {editingItem ? "✏️ Edit Sri Lankan Attraction" : "✨ Publish New Attraction"}
                </h2>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                  Add authentic tourist information to the public Explore Sri Lanka showcase
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="grid-2">
                <div className="form-group">
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
                    Attraction Name <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    required
                    className="form-control"
                    placeholder="e.g. Sigiriya Rock Fortress"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
                    Category <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <select
                    className="form-control"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Beaches">🏖️ Beaches & Coastal</option>
                    <option value="Historical Ruins">🏛️ Historical Ruins & UNESCO</option>
                    <option value="Natural Waterfalls">🌊 Natural Waterfalls</option>
                    <option value="Hiking & Peaks">🥾 Hiking & Peaks</option>
                    <option value="Wildlife & Nature">🌿 Wildlife & Nature</option>
                    <option value="Other">Other Category...</option>
                  </select>
                </div>
              </div>

              {formData.category === "Other" && (
                <div className="form-group">
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
                    Custom Category Name
                  </label>
                  <input
                    className="form-control"
                    placeholder="e.g. Cultural & Heritage Festivals"
                    value={formData.customCategory}
                    onChange={e => setFormData({ ...formData, customCategory: e.target.value })}
                  />
                </div>
              )}

              <div className="grid-2">
                <div className="form-group">
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
                    Location (Town & Province) <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    required
                    className="form-control"
                    placeholder="e.g. Matale, Central Province"
                    value={formData.destination}
                    onChange={e => setFormData({ ...formData, destination: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
                    Foreigner Ticket Fee (LKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    className="form-control"
                    placeholder="0 for Free entry, or e.g. 11000"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              </div>

              {/* Photo Input: URL or File Upload */}
              <div className="form-group">
                <label style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
                  Attraction Image (Real High-Res Photo)
                </label>
                <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <input
                    className="form-control"
                    placeholder="Paste image URL (https://...)"
                    value={formData.imageUrl}
                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <label
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: 8,
                      padding: "8px 14px",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#cbd5e1",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      whiteSpace: "nowrap",
                    }}
                  >
                    📁 Upload File
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>

                {formData.imageUrl && (
                  <div style={{ width: "100%", height: 120, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255, 255, 255, 0.15)", background: "#000" }}>
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="form-group">
                <label style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
                  Brief Tourist Explanation & Significance <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  className="form-control"
                  placeholder="Explain why this place is iconic, historical background, what international tourists can experience, and key sights..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
                    Best Season & Travel Advice
                  </label>
                  <input
                    className="form-control"
                    placeholder="e.g. Best Season: Dec - Apr • Sunrise climb recommended"
                    value={formData.tips}
                    onChange={e => setFormData({ ...formData, tips: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
                    Rating (0 - 5.0)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    className="form-control"
                    value={formData.rating}
                    onChange={e => setFormData({ ...formData, rating: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    border: "none",
                    fontWeight: 700,
                  }}
                >
                  {submitting ? "Saving..." : editingItem ? "Update Listing" : "Publish Attraction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
