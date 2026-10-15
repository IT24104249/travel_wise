import React, { useState, useEffect } from "react";
import { type Destination, type Role } from "../types";
import { apiRequest } from "../utils/api";

export interface EditDestinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: Destination | null;
  onSaved: (updated: Destination, revertedToPending: boolean) => void;
  role: Role;
  userId: string;
}

export const EditDestinationModal: React.FC<EditDestinationModalProps> = ({
  isOpen,
  onClose,
  destination,
  onSaved,
  role,
  userId,
}) => {
  if (!isOpen || !destination) return null;

  const [name, setName] = useState(destination.name || "");
  const [region, setRegion] = useState(destination.region || "");
  const [description, setDescription] = useState(destination.description || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (destination) {
      setName(destination.name || "");
      setRegion(destination.region || "");
      setDescription(destination.description || "");
      setError(null);
    }
  }, [destination]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Destination name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await apiRequest<Destination>(
        `/api/destinations/${destination.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: name.trim(),
            region: region.trim() || null,
            description: description.trim() || null,
          }),
        },
        role,
        userId
      );

      const reverted = destination.status === "Verified";
      onSaved(res, reverted);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update destination.");
    } finally {
      setSaving(false);
    }
  }

  const isVerified = destination.status === "Verified";

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div className="modal-content" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">✏️ Edit Destination Overview</div>
            <div className="modal-subtitle">Update name, region, or description</div>
          </div>
          <button className="modal-close" onClick={onClose} disabled={saving}>✕</button>
        </div>

        {isVerified && (
          <div style={{
            margin: "12px 20px 0",
            background: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13,
            color: "#fde68a",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            lineHeight: 1.5
          }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <strong style={{ color: "#fbbf24" }}>Admin Re-Verification Required:</strong><br />
              This destination is currently <strong>Verified</strong>. Saving changes will revert its status to <strong>Pending Approval</strong> so administrators can review the update.
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-danger" style={{ margin: "12px 20px 0" }}>⚠️ {error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <div className="form-group">
            <label>Destination Name <span style={{ color: "var(--danger)" }}>*</span></label>
            <input
              required
              className="form-control"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Ella"
              style={{ fontSize: 16 }}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Region <span style={{ color: "var(--text-muted)", fontSize: 12 }}>(optional)</span></label>
              <input
                className="form-control"
                value={region}
                onChange={e => setRegion(e.target.value)}
                placeholder="e.g. Uva Province"
              />
            </div>
            <div className="form-group">
              <label>Brief Description <span style={{ color: "var(--text-muted)", fontSize: 12 }}>(optional)</span></label>
              <input
                className="form-control"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Scenic hill country town"
              />
            </div>
          </div>

          <div className="modal-footer" style={{ padding: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !name.trim()}
              style={{
                background: isVerified
                  ? "linear-gradient(135deg, #f59e0b, #d97706)"
                  : "linear-gradient(135deg, #14b8a6, #0d9488)",
                minWidth: 160
              }}
            >
              {saving ? "Saving..." : isVerified ? "💾 Save & Re-verify" : "💾 Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
