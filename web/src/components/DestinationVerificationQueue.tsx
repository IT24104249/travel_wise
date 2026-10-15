import React, { useState, useCallback } from "react";
import { Destination } from "../types";

export interface DestinationVerificationQueueProps {
  pendingDestinations: Destination[];
  loadingPendingDest: boolean;
  onRefresh: () => void;
  expandedPendingDestId: string | null;
  setExpandedPendingDestId: (id: string | null) => void;
  onVerify: (destId: string) => void;
  onReject: (destId: string) => void;
  rejectFeedback: Record<string, string>;
  setRejectFeedback: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  token?: string | null;
}

// Robust helper to parse arrays or JSON strings or comma-separated lists
function safeArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch {}
    }
    if (trimmed.includes(",")) {
      return trimmed.split(",").map(s => s.trim()).filter(Boolean);
    }
    if (trimmed.length > 0) return [trimmed];
  }
  return [];
}

interface ProviderInfo {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  serviceType?: string;
  isActive: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

export const DestinationVerificationQueue: React.FC<DestinationVerificationQueueProps> = ({
  pendingDestinations,
  loadingPendingDest,
  onRefresh,
  expandedPendingDestId,
  setExpandedPendingDestId,
  onVerify,
  onReject,
  rejectFeedback,
  setRejectFeedback,
  token,
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Per-destination provider info cache
  const [providerInfoMap, setProviderInfoMap] = useState<Record<string, ProviderInfo | "loading" | "error">>({});

  // Warning modal state
  const [warningModal, setWarningModal] = useState<{ destId: string; providerId: string; providerName: string } | null>(null);
  const [warningMessage, setWarningMessage] = useState("");
  const [warningSending, setWarningSending] = useState(false);
  const [warningFeedback, setWarningFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Suspend state per provider
  const [suspendModal, setSuspendModal] = useState<{ providerId: string; providerName: string; isActive: boolean } | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspending, setSuspending] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<Record<string, { type: "success" | "error"; msg: string }>>({});

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5127";

  const authHeaders = useCallback((): Record<string, string> => {
    const stored = token
      || localStorage.getItem("travelwise_access_token")
      || localStorage.getItem("sb-token")
      || localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      ...(stored ? { Authorization: `Bearer ${stored}` } : {}),
      "X-User-Role": "Admin",
      "X-Role": "Admin",
    };
  }, [token]);

  const loadProviderInfo = useCallback(async (createdBy: string) => {
    if (!createdBy || providerInfoMap[createdBy]) return;
    setProviderInfoMap(prev => ({ ...prev, [createdBy]: "loading" }));
    try {
      const res = await fetch(`${apiBase}/api/auth/provider-info/${encodeURIComponent(createdBy)}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("not found");
      const data = await res.json();
      setProviderInfoMap(prev => ({ ...prev, [createdBy]: data }));
    } catch {
      setProviderInfoMap(prev => ({ ...prev, [createdBy]: "error" }));
    }
  }, [providerInfoMap, apiBase, authHeaders]);

  const handleToggleExpand = (dest: Destination) => {
    if (expandedPendingDestId === dest.id) {
      setExpandedPendingDestId(null);
    } else {
      setExpandedPendingDestId(dest.id);
      if (dest.createdBy) loadProviderInfo(dest.createdBy);
    }
  };

  const handleSendWarning = async () => {
    if (!warningModal || !warningMessage.trim()) return;
    setWarningSending(true);
    setWarningFeedback(null);
    try {
      const res = await fetch(`${apiBase}/api/auth/providers/${warningModal.providerId}/warn`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ message: warningMessage.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send warning");
      setWarningFeedback({ type: "success", msg: `✅ Warning sent to ${warningModal.providerName}` });
      setWarningMessage("");
      setTimeout(() => { setWarningModal(null); setWarningFeedback(null); }, 2500);
    } catch (e: any) {
      setWarningFeedback({ type: "error", msg: `❌ ${e.message}` });
    } finally {
      setWarningSending(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendModal) return;
    setSuspending(true);
    try {
      const endpoint = suspendModal.isActive ? "suspend" : "unsuspend";
      const body = suspendModal.isActive ? JSON.stringify({ reason: suspendReason.trim() || undefined }) : JSON.stringify({});
      const res = await fetch(`${apiBase}/api/auth/providers/${suspendModal.providerId}/${endpoint}`, {
        method: "POST",
        headers: authHeaders(),
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update account");
      const msg = suspendModal.isActive
        ? `🚫 ${suspendModal.providerName}'s account suspended`
        : `✅ ${suspendModal.providerName}'s account reinstated`;
      setActionFeedback(prev => ({ ...prev, [suspendModal.providerId]: { type: "success", msg } }));
      // Update local provider info
      setProviderInfoMap(prev => {
        const existing = prev[suspendModal.providerId];
        if (typeof existing === "object") {
          return { ...prev, [suspendModal.providerId]: { ...existing, isActive: !suspendModal.isActive } };
        }
        return prev;
      });
      setSuspendModal(null);
      setSuspendReason("");
      setTimeout(() => setActionFeedback(prev => { const n = { ...prev }; delete n[suspendModal!.providerId]; return n; }), 4000);
    } catch (e: any) {
      setActionFeedback(prev => ({ ...prev, [suspendModal.providerId]: { type: "error", msg: `❌ ${e.message}` } }));
    } finally {
      setSuspending(false);
    }
  };

  return (
    <section className="card" style={{ overflow: "hidden" }}>
      {/* Lightbox Image Preview Modal */}
      {previewImage && (
        <div
          className="modal-overlay"
          style={{ zIndex: 4000, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setPreviewImage(null)}
        >
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <img
              src={previewImage}
              alt="Enlarged preview"
              style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 12, objectFit: "contain", boxShadow: "0 20px 50px rgba(0,0,0,0.8)" }}
            />
            <button
              onClick={() => setPreviewImage(null)}
              style={{
                position: "absolute", top: -12, right: -12, width: 36, height: 36, borderRadius: "50%",
                background: "#ef4444", border: "2px solid #fff", color: "#fff", fontSize: 16, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)"
              }}
            >✕</button>
          </div>
        </div>
      )}

      {/* Warning Message Modal */}
      {warningModal && (
        <div className="modal-overlay" style={{ zIndex: 3500 }}>
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">⚠️ Send Warning to Provider</div>
                <div className="modal-subtitle">Warning will be logged against {warningModal.providerName}'s account</div>
              </div>
              <button className="modal-close" onClick={() => { setWarningModal(null); setWarningMessage(""); setWarningFeedback(null); }}>✕</button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <div style={{
                background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#fbbf24"
              }}>
                ⚠️ This warning will be stored on the provider's account record and visible to all admins.
              </div>
              <div className="form-group">
                <label>Warning Message <span style={{ color: "var(--danger)" }}>*</span></label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="e.g. Your listing for 'kaduwela' contains inaccurate pricing information. Please update it within 48 hours or the listing will be rejected."
                  value={warningMessage}
                  onChange={e => setWarningMessage(e.target.value)}
                />
              </div>
              {warningFeedback && (
                <div style={{
                  padding: "10px 14px", borderRadius: 8, marginTop: 12, fontSize: 13,
                  background: warningFeedback.type === "success" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                  color: warningFeedback.type === "success" ? "#4ade80" : "#f87171",
                  border: `1px solid ${warningFeedback.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`
                }}>
                  {warningFeedback.msg}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setWarningModal(null); setWarningMessage(""); setWarningFeedback(null); }}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={warningSending || !warningMessage.trim()}
                onClick={handleSendWarning}
                style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
              >
                {warningSending ? "Sending..." : "📤 Send Warning"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend / Unsuspend Modal */}
      {suspendModal && (
        <div className="modal-overlay" style={{ zIndex: 3500 }}>
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{suspendModal.isActive ? "🚫 Suspend Account" : "✅ Reinstate Account"}</div>
                <div className="modal-subtitle">{suspendModal.providerName}</div>
              </div>
              <button className="modal-close" onClick={() => { setSuspendModal(null); setSuspendReason(""); }}>✕</button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              {suspendModal.isActive ? (
                <>
                  <div style={{
                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#f87171"
                  }}>
                    🚫 Suspending this account will prevent the provider from logging in. They will see a "Your account has been deactivated" message.
                  </div>
                  <div className="form-group">
                    <label>Reason for Suspension (optional)</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="e.g. Repeated submission of inaccurate listing information"
                      value={suspendReason}
                      onChange={e => setSuspendReason(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div style={{
                  background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
                  borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#4ade80"
                }}>
                  ✅ Reinstating this account will allow the provider to log in again.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setSuspendModal(null); setSuspendReason(""); }}>Cancel</button>
              <button
                className="btn"
                disabled={suspending}
                onClick={handleSuspend}
                style={{
                  background: suspendModal.isActive ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)",
                  border: `1px solid ${suspendModal.isActive ? "rgba(239,68,68,0.4)" : "rgba(34,197,94,0.4)"}`,
                  color: suspendModal.isActive ? "#f87171" : "#4ade80",
                  fontWeight: 700, padding: "8px 20px"
                }}
              >
                {suspending ? "Processing..." : suspendModal.isActive ? "🚫 Suspend Account" : "✅ Reinstate Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card-header">
        <div className="card-title">
          <div className="card-title-icon" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>🛡️</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Destination Verification Queue</div>
            <div className="card-subtitle">
              Review and verify partner-submitted destinations, visiting places, restaurants, food menus, and accommodations.
            </div>
          </div>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onRefresh}
          style={{ whiteSpace: "nowrap" }}
        >
          🔄 Refresh Queue
        </button>
      </div>

      {loadingPendingDest ? (
        <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div>Loading pending destinations...</div>
        </div>
      ) : pendingDestinations.length === 0 ? (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-white)" }}>All caught up!</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>No destinations pending verification at this time.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {pendingDestinations.map(dest => {
            const isExpanded = expandedPendingDestId === dest.id;
            const vpList = dest.visitingPlaces || [];
            const restList = dest.restaurants || [];
            const accomList = dest.accommodations || [];
            const totalFoodItems = restList.reduce((acc, r) => acc + (r.foodItems?.length || 0), 0);
            const isUpdate = Boolean(dest.verifiedAt);

            // Provider info from cache
            const provInfo = dest.createdBy ? providerInfoMap[dest.createdBy] : undefined;
            const providerData = provInfo && typeof provInfo === "object" ? provInfo : null;

            return (
              <div key={dest.id} style={{
                background: "rgba(15, 23, 42, 0.65)",
                border: isUpdate ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(59, 130, 246, 0.35)",
                borderRadius: "var(--r-lg)",
                padding: 24,
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
              }}>
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <h3 style={{ margin: 0, fontSize: 22, color: "var(--text-white)", fontWeight: 800 }}>
                        📍 {dest.name}
                      </h3>
                      {dest.region && (
                        <span style={{ fontSize: 12, background: "rgba(255,255,255,0.08)", padding: "4px 12px", borderRadius: 20, color: "var(--brand-teal-light)", fontWeight: 600 }}>
                          🗺️ {dest.region}
                        </span>
                      )}
                      {isUpdate ? (
                        <span style={{
                          fontSize: 12, background: "rgba(245, 158, 11, 0.18)", color: "#fbbf24",
                          border: "1px solid rgba(245, 158, 11, 0.4)", padding: "4px 12px", borderRadius: 20, fontWeight: 700,
                          display: "inline-flex", alignItems: "center", gap: 6
                        }}>
                          🔄 Updated Listing (Re-verification)
                        </span>
                      ) : (
                        <span style={{
                          fontSize: 12, background: "rgba(59, 130, 246, 0.18)", color: "#60a5fa",
                          border: "1px solid rgba(59, 130, 246, 0.4)", padding: "4px 12px", borderRadius: 20, fontWeight: 700,
                          display: "inline-flex", alignItems: "center", gap: 6
                        }}>
                          ⏳ Pending Verification
                        </span>
                      )}
                    </div>

                    {dest.description && (
                      <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8, marginBottom: 6, maxWidth: 800, lineHeight: 1.5 }}>
                        {dest.description}
                      </p>
                    )}

                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6, display: "flex", flexWrap: "wrap", gap: 14 }}>
                      <span>👤 Partner ID: <strong>{dest.createdBy || "Provider"}</strong></span>
                      <span>📅 Last Updated: <strong>{dest.updatedAt ? new Date(dest.updatedAt).toLocaleString() : "Recently"}</strong></span>
                      {dest.verifiedAt && (
                        <span>🛡️ Previously Verified: {new Date(dest.verifiedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Summary Badges */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.3)", color: "var(--brand-teal-light)", padding: "6px 14px", borderRadius: 20, fontWeight: 600 }}>
                      📍 {vpList.length} Places
                    </span>
                    <span style={{ fontSize: 12, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24", padding: "6px 14px", borderRadius: 20, fontWeight: 600 }}>
                      🍽️ {restList.length} Dining ({totalFoodItems} menu items)
                    </span>
                    <span style={{ fontSize: 12, background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa", padding: "6px 14px", borderRadius: 20, fontWeight: 600 }}>
                      🏨 {accomList.length} Stays
                    </span>
                  </div>
                </div>

                {/* ============================================================ */}
                {/* PROVIDER INFO PANEL                                           */}
                {/* ============================================================ */}
                {isExpanded && dest.createdBy && (
                  <div style={{
                    background: "rgba(99,102,241,0.06)",
                    border: "1px solid rgba(99,102,241,0.25)",
                    borderRadius: 12,
                    padding: "14px 18px",
                    marginBottom: 16,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      👤 Service Provider Details
                    </div>

                    {provInfo === "loading" && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Loading provider info…</div>
                    )}
                    {provInfo === "error" && (
                      <div style={{ fontSize: 12, color: "#f87171" }}>⚠️ Could not load provider info (ID: {dest.createdBy})</div>
                    )}
                    {providerData && (
                      <>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 12 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>Business Name</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-white)" }}>{providerData.displayName}</div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>Email</div>
                            <div style={{ fontSize: 13, color: "#93c5fd" }}>
                              <a href={`mailto:${providerData.email}`} style={{ color: "#93c5fd", textDecoration: "none" }}>
                                ✉️ {providerData.email}
                              </a>
                            </div>
                          </div>
                          {providerData.phone && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>Phone</div>
                              <div style={{ fontSize: 13, color: "var(--text-soft)" }}>📞 {providerData.phone}</div>
                            </div>
                          )}
                          {providerData.serviceType && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>Service Type</div>
                              <div style={{ fontSize: 13, color: "var(--text-soft)" }}>🏢 {providerData.serviceType}</div>
                            </div>
                          )}
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>Account Status</div>
                            <div>
                              <span style={{
                                fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
                                background: providerData.isActive ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                                color: providerData.isActive ? "#4ade80" : "#f87171",
                                border: `1px solid ${providerData.isActive ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`
                              }}>
                                {providerData.isActive ? "✅ Active" : "🚫 Suspended"}
                              </span>
                            </div>
                          </div>
                          {providerData.lastLoginAt && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>Last Login</div>
                              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(providerData.lastLoginAt).toLocaleString()}</div>
                            </div>
                          )}
                        </div>

                        {/* Provider Action Buttons */}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => setWarningModal({ destId: dest.id, providerId: providerData.id, providerName: providerData.displayName })}
                            style={{
                              background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)",
                              color: "#fbbf24", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                              display: "inline-flex", alignItems: "center", gap: 6
                            }}
                          >
                            ⚠️ Send Warning
                          </button>
                          <button
                            type="button"
                            onClick={() => setSuspendModal({ providerId: providerData.id, providerName: providerData.displayName, isActive: providerData.isActive })}
                            style={{
                              background: providerData.isActive ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
                              border: `1px solid ${providerData.isActive ? "rgba(239,68,68,0.35)" : "rgba(34,197,94,0.35)"}`,
                              color: providerData.isActive ? "#f87171" : "#4ade80",
                              borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                              display: "inline-flex", alignItems: "center", gap: 6
                            }}
                          >
                            {providerData.isActive ? "🚫 Suspend Account" : "✅ Reinstate Account"}
                          </button>
                        </div>

                        {/* Per-provider action feedback */}
                        {actionFeedback[providerData.id] && (
                          <div style={{
                            marginTop: 10, padding: "8px 12px", borderRadius: 8, fontSize: 12,
                            background: actionFeedback[providerData.id].type === "success" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                            color: actionFeedback[providerData.id].type === "success" ? "#4ade80" : "#f87171",
                            border: `1px solid ${actionFeedback[providerData.id].type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`
                          }}>
                            {actionFeedback[providerData.id].msg}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Toggle Details Button */}
                <div style={{ marginBottom: 16 }}>
                  <button
                    type="button"
                    onClick={() => handleToggleExpand(dest)}
                    style={{
                      background: isExpanded ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.08)",
                      border: isExpanded ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.15)",
                      color: isExpanded ? "#93c5fd" : "var(--text-white)",
                      borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600, fontSize: 13,
                      display: "inline-flex", alignItems: "center", gap: 8, transition: "all 0.2s"
                    }}
                  >
                    {isExpanded ? "▲" : "▼"} Review Submitted Details ({vpList.length + restList.length + accomList.length} items)
                  </button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ marginBottom: 16 }}>
                    {/* ─── Visiting Places ─── */}
                    {vpList.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#2dd4bf", marginBottom: 10 }}>
                          🏞️ Visiting Places ({vpList.length})
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {vpList.map(vp => {
                            const imgs = safeArray(vp.imageUrls);
                            return (
                              <div key={vp.id} style={{ background: "rgba(20,184,166,0.06)", border: "1px solid rgba(20,184,166,0.2)", borderRadius: 10, padding: 14 }}>
                                <div style={{ fontWeight: 700, color: "var(--text-white)", marginBottom: 4 }}>{vp.name}</div>
                                {vp.location && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>📍 {vp.location}</div>}
                                {vp.openingHours && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>🕐 {vp.openingHours}</div>}
                                {vp.ticketRequired && (
                                  <div style={{ fontSize: 12, marginTop: 4 }}>
                                    🎟️ Ticket: <strong style={{ color: "#fbbf24" }}>LKR {vp.ticketPrice}</strong> ({vp.ticketType})
                                  </div>
                                )}
                                {vp.description && <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 6, lineHeight: 1.4 }}>{vp.description}</div>}
                                {imgs.length > 0 && (
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                                    {imgs.map((url, i) => (
                                      <img key={i} src={url} alt="" onClick={() => setPreviewImage(url)}
                                        style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, cursor: "zoom-in", border: "1px solid rgba(255,255,255,0.1)" }} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ─── Restaurants ─── */}
                    {restList.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24", marginBottom: 10 }}>
                          🍽️ Restaurants ({restList.length})
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {restList.map(rest => {
                            const imgs = safeArray(rest.imageUrls);
                            return (
                              <div key={rest.id} style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: 14 }}>
                                <div style={{ fontWeight: 700, color: "var(--text-white)", marginBottom: 4 }}>{rest.name}</div>
                                {rest.location && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>📍 {rest.location}</div>}
                                {rest.contact && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>📞 {rest.contact}</div>}
                                {rest.description && <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 4, lineHeight: 1.4 }}>{rest.description}</div>}
                                {imgs.length > 0 && (
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                                    {imgs.map((url, i) => (
                                      <img key={i} src={url} alt="" onClick={() => setPreviewImage(url)}
                                        style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, cursor: "zoom-in", border: "1px solid rgba(255,255,255,0.1)" }} />
                                    ))}
                                  </div>
                                )}
                                {(rest.foodItems || []).length > 0 && (
                                  <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Menu Items</div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                      {(rest.foodItems || []).map((fi: any) => (
                                        <span key={fi.id} style={{
                                          fontSize: 11, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)",
                                          color: "#fbbf24", borderRadius: 20, padding: "3px 10px"
                                        }}>
                                          {fi.name} {fi.price ? `— LKR ${fi.price}` : ""} {fi.category ? `(${fi.category})` : ""}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ─── Accommodations ─── */}
                    {accomList.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", marginBottom: 10 }}>
                          🏨 Accommodations ({accomList.length})
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {accomList.map((acc: any) => {
                            const imgs = safeArray(acc.imageUrls);
                            const amenities = safeArray(acc.amenities);
                            return (
                              <div key={acc.id} style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 10, padding: 14 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                                  <div style={{ fontWeight: 700, color: "var(--text-white)" }}>{acc.name}</div>
                                  {acc.pricePerNight && (
                                    <span style={{ fontSize: 12, color: "#fbbf24", fontWeight: 700 }}>LKR {acc.pricePerNight} / night</span>
                                  )}
                                </div>
                                {acc.type && <div style={{ fontSize: 12, color: "#a78bfa", marginTop: 2 }}>🏠 {acc.type}</div>}
                                {acc.location && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>📍 {acc.location}</div>}
                                {acc.contactNumber && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>📞 {acc.contactNumber}</div>}
                                {amenities.length > 0 && (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                                    {amenities.map((a, i) => (
                                      <span key={i} style={{
                                        fontSize: 10, background: "rgba(167,139,250,0.12)",
                                        border: "1px solid rgba(167,139,250,0.25)", color: "#c4b5fd",
                                        borderRadius: 14, padding: "2px 8px"
                                      }}>✓ {a}</span>
                                    ))}
                                  </div>
                                )}
                                {acc.specialNotes && (
                                  <div style={{ fontSize: 12, color: "var(--text-soft)", background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "8px 10px", lineHeight: 1.4, fontStyle: "italic", marginTop: 6 }}>
                                    ℹ️ {acc.specialNotes}
                                  </div>
                                )}
                                {imgs.length > 0 && (
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                                    {imgs.map((url, i) => (
                                      <img key={i} src={url} alt="" onClick={() => setPreviewImage(url)}
                                        style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, cursor: "zoom-in", border: "1px solid rgba(255,255,255,0.1)" }} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Admin Action Bar */}
                <div style={{
                  display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap",
                  paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.07)"
                }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onVerify(dest.id)}
                    style={{
                      background: "linear-gradient(135deg, #22c55e, #16a34a)",
                      boxShadow: "0 4px 12px rgba(34,197,94,0.3)",
                      fontWeight: 700, padding: "10px 22px"
                    }}
                  >
                    ✅ Approve & Verify Destination
                  </button>

                  <div style={{ display: "flex", gap: 8, flex: 1, minWidth: 280, alignItems: "center" }}>
                    <input
                      className="form-control"
                      placeholder="Optional feedback or note if rejecting..."
                      style={{ fontSize: 12, height: 38 }}
                      value={rejectFeedback[dest.id] || ""}
                      onChange={e => setRejectFeedback(prev => ({ ...prev, [dest.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => onReject(dest.id)}
                      style={{
                        background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)",
                        color: "#f87171", fontWeight: 600, whiteSpace: "nowrap", padding: "8px 16px"
                      }}
                    >
                      ❌ Reject Listing
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
