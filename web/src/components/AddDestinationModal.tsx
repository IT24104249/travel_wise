import React from "react";

export interface AddDestinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  destNameInput: string;
  setDestNameInput: (val: string) => void;
  destRegionInput: string;
  setDestRegionInput: (val: string) => void;
  destDescInput: string;
  setDestDescInput: (val: string) => void;
  destSaving: boolean;
  destTabError: string | null;
  role?: string;
}

export const AddDestinationModal: React.FC<AddDestinationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  destNameInput,
  setDestNameInput,
  destRegionInput,
  setDestRegionInput,
  destDescInput,
  setDestDescInput,
  destSaving,
  destTabError,
  role,
}) => {
  if (!isOpen) return null;
  const isAdmin = role === "StaffAdmin";

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div className="modal-content" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">
              {isAdmin ? "🛡️ Add Admin Destination" : "🗺️ Add a New Destination"}
            </div>
            <div className="modal-subtitle">
              {isAdmin
                ? "Create an official admin-curated destination listing (Published & Live immediately)"
                : "Create a destination to start adding visiting places, restaurants & accommodations"}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {destTabError && (
          <div className="alert alert-danger" style={{ margin: "12px 20px 0" }}>⚠️ {destTabError}</div>
        )}
        {isAdmin && (
          <div style={{
            margin: "12px 20px 0",
            background: "rgba(139, 92, 246, 0.12)",
            border: "1px solid rgba(139, 92, 246, 0.35)",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 12,
            color: "#c4b5fd",
            display: "flex",
            alignItems: "center",
            gap: 8
          }}>
            <span>👑</span>
            <span><strong>Admin Listing:</strong> Saved directly to the central catalog as <strong>Verified</strong> without requiring approval.</span>
          </div>
        )}
        <form onSubmit={onSubmit} style={{ padding: 20 }}>
          <div className="form-group">
            <label>Destination Name <span style={{ color: "var(--danger)" }}>*</span></label>
            <input
              required autoFocus
              className="form-control"
              placeholder='e.g. Ella, Kandy, Galle, Mirissa'
              value={destNameInput}
              onChange={e => setDestNameInput(e.target.value)}
              style={{ fontSize: 16 }}
            />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Region <span style={{ color: "var(--text-muted)", fontSize: 12 }}>(optional)</span></label>
              <input
                className="form-control"
                placeholder='e.g. Uva Province'
                value={destRegionInput}
                onChange={e => setDestRegionInput(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Brief Description <span style={{ color: "var(--text-muted)", fontSize: 12 }}>(optional)</span></label>
              <input
                className="form-control"
                placeholder='e.g. Scenic hill country town'
                value={destDescInput}
                onChange={e => setDestDescInput(e.target.value)}
              />
            </div>
          </div>
          <div style={{
            background: "rgba(20,184,166,0.08)",
            border: "1px solid rgba(20,184,166,0.2)",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 20,
            fontSize: 13,
            color: "var(--text-soft)"
          }}>
            💡 After creating the destination, you can add <strong>Visiting Places</strong>, <strong>Restaurants</strong>,
            <strong> Accommodations</strong> and <strong>Food Prices</strong> using the tab-based form below.
          </div>
          <div className="modal-footer" style={{ padding: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={destSaving || !destNameInput.trim()}
              style={{ background: "linear-gradient(135deg,#14b8a6,#0d9488)", minWidth: 160 }}
            >
              {destSaving ? "Creating..." : "✅ Create Destination"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
