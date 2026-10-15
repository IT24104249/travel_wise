import React from "react";
import { Role } from "../types";

export interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  role: Role;
  deleteConfirmInput: string;
  setDeleteConfirmInput: (val: string) => void;
  deleteReasonInput: string;
  setDeleteReasonInput: (val: string) => void;
  deleteSubmitting: boolean;
  deleteModalError: string | null;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  role,
  deleteConfirmInput,
  setDeleteConfirmInput,
  deleteReasonInput,
  setDeleteReasonInput,
  deleteSubmitting,
  deleteModalError,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: 520, border: "1px solid rgba(239, 68, 68, 0.5)", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.7)" }}>
        <div className="modal-header" style={{ borderBottom: "1px solid rgba(239, 68, 68, 0.2)", paddingBottom: 16 }}>
          <div>
            <div className="modal-title" style={{ color: "#f87171", display: "flex", alignItems: "center", gap: 8 }}>
              <span>⚠️</span> {role === "User" ? "Confirm Permanent Account Deletion" : "Confirm Account Deletion Request"}
            </div>
            <div className="modal-subtitle">
              {role === "User"
                ? "This action cannot be undone. All your trips and personal data will be wiped."
                : "Your request will be submitted to the Administrator for final review & approval."}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {deleteModalError && (
          <div className="alert alert-danger" style={{ margin: "16px 20px 0" }}>
            <span>⚠️</span> {deleteModalError}
          </div>
        )}

        <form onSubmit={onSubmit} style={{ padding: "20px" }}>
          <div style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 20
          }}>
            <div style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.5 }}>
              {role === "User" ? (
                <>
                  <strong>Double Verification Required:</strong> To prevent accidental deletion, please type <strong style={{ color: "#ef4444", letterSpacing: 1 }}>DELETE</strong> in the field below to verify your intent. Once confirmed, your account is purged immediately.
                </>
              ) : (
                <>
                  <strong>Service Provider Verification:</strong> To submit your deletion request to the Administrator, please type <strong style={{ color: "#ef4444", letterSpacing: 1 }}>DELETE</strong> below. An Admin will review and process your request.
                </>
              )}
            </div>
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 700, color: "var(--text-main)" }}>
              Type <span style={{ color: "#ef4444" }}>DELETE</span> to confirm:
            </label>
            <input
              required
              type="text"
              className="form-control"
              placeholder="DELETE"
              value={deleteConfirmInput}
              onChange={e => setDeleteConfirmInput(e.target.value)}
              autoFocus
              style={{
                borderColor: deleteConfirmInput.trim().toUpperCase() === "DELETE" ? "var(--danger)" : undefined,
                fontWeight: 700,
                letterSpacing: 1.5
              }}
            />
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label>Reason for deleting account <span style={{ color: "var(--text-muted)", fontSize: 12 }}>(optional)</span>:</label>
            <textarea
              rows={3}
              className="form-control"
              placeholder={role === "ServiceProvider" ? "e.g. Business ceased operations or changing business entity..." : "e.g. No longer planning to travel or creating a new account..."}
              value={deleteReasonInput}
              onChange={e => setDeleteReasonInput(e.target.value)}
            />
          </div>

          <div className="modal-footer" style={{ marginTop: 24, padding: 0 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={deleteSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={deleteConfirmInput.trim().toUpperCase() !== "DELETE" || deleteSubmitting}
              style={{ opacity: deleteConfirmInput.trim().toUpperCase() !== "DELETE" ? 0.5 : 1 }}
            >
              {deleteSubmitting
                ? "Processing..."
                : role === "User"
                ? "🗑️ Permanently Delete My Account Now"
                : "🚀 Submit Deletion Request to Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
