import React, { useState, useEffect } from "react";
import { type VisitingPlace, type Role } from "../types";
import { apiRequest } from "../utils/api";

export interface EditVisitingPlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitingPlace: VisitingPlace | null;
  destinationStatus?: string;
  onSaved: (updated: VisitingPlace, revertedToPending: boolean) => void;
  role: Role;
  userId: string;
  uploadImages: (files: File[], folder: string) => Promise<string[]>;
}

export const EditVisitingPlaceModal: React.FC<EditVisitingPlaceModalProps> = ({
  isOpen,
  onClose,
  visitingPlace,
  destinationStatus,
  onSaved,
  role,
  userId,
  uploadImages,
}) => {
  if (!isOpen || !visitingPlace) return null;

  const [name, setName] = useState(visitingPlace.name || "");
  const [description, setDescription] = useState(visitingPlace.description || "");
  const [location, setLocation] = useState(visitingPlace.location || "");
  const [openingHours, setOpeningHours] = useState(visitingPlace.openingHours || "");
  const [ticketRequired, setTicketRequired] = useState(visitingPlace.ticketRequired || false);
  const [ticketPrice, setTicketPrice] = useState(visitingPlace.ticketPrice ? String(visitingPlace.ticketPrice) : "");
  const [ticketType, setTicketType] = useState<VisitingPlace["ticketType"]>(visitingPlace.ticketType || "None");

  const [existingImages, setExistingImages] = useState<string[]>(visitingPlace.imageUrls || []);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visitingPlace) {
      setName(visitingPlace.name || "");
      setDescription(visitingPlace.description || "");
      setLocation(visitingPlace.location || "");
      setOpeningHours(visitingPlace.openingHours || "");
      setTicketRequired(visitingPlace.ticketRequired || false);
      setTicketPrice(visitingPlace.ticketPrice ? String(visitingPlace.ticketPrice) : "");
      setTicketType(visitingPlace.ticketType || "None");
      setExistingImages(visitingPlace.imageUrls || []);
      setNewImageFiles([]);
      setNewImagePreviews([]);
      setError(null);
    }
  }, [visitingPlace]);

  function handleFileSelect(files: FileList | null) {
    if (!files) return;
    const fileArr = Array.from(files);
    const previews = fileArr.map(f => URL.createObjectURL(f));
    setNewImageFiles(prev => [...prev, ...fileArr]);
    setNewImagePreviews(prev => [...prev, ...previews]);
  }

  function removeExistingImage(index: number) {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  }

  function removeNewImage(index: number) {
    setNewImageFiles(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Place name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let finalImages = [...existingImages];
      if (newImageFiles.length > 0) {
        const uploaded = await uploadImages(
          newImageFiles,
          `destinations/${visitingPlace.destinationId}/visiting-places`
        );
        finalImages = [...finalImages, ...uploaded];
      }

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        openingHours: openingHours.trim() || null,
        ticketRequired,
        ticketPrice: ticketRequired && ticketPrice ? Number(ticketPrice) : null,
        ticketType: ticketRequired ? ticketType : "None",
        imageUrls: finalImages,
        isActive: true,
      };

      const res = await apiRequest<VisitingPlace>(
        `/api/destinations/visiting-places/${visitingPlace.id}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
        role,
        userId
      );

      const reverted = destinationStatus === "Verified";
      onSaved(res, reverted);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update visiting place.");
    } finally {
      setSaving(false);
    }
  }

  const isVerified = destinationStatus === "Verified";

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div className="modal-content" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">✏️ Edit Visiting Place</div>
            <div className="modal-subtitle">Update details for {visitingPlace.name}</div>
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
              This listing is currently <strong>Verified</strong>. Editing and saving changes will revert the destination status to <strong>Pending Approval</strong> so administrators can review the update.
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-danger" style={{ margin: "12px 20px 0" }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <div className="grid-2">
            <div className="form-group">
              <label>Place Name <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                required
                className="form-control"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Nine Arch Bridge"
              />
            </div>
            <div className="form-group">
              <label>Location (GPS / Address)</label>
              <input
                className="form-control"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Ella, Uva Province"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description / Details</label>
            <textarea
              rows={3}
              className="form-control"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What makes this place special?"
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Opening Hours</label>
              <input
                className="form-control"
                value={openingHours}
                onChange={e => setOpeningHours(e.target.value)}
                placeholder="e.g. 6:00 AM – 6:00 PM"
              />
            </div>
            <div className="form-group">
              <label>Ticket Required?</label>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {["Yes", "No"].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setTicketRequired(opt === "Yes")}
                    style={{
                      padding: "8px 20px",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                      border: (opt === "Yes" ? ticketRequired : !ticketRequired)
                        ? "2px solid #14b8a6"
                        : "1px solid rgba(255,255,255,0.1)",
                      background: (opt === "Yes" ? ticketRequired : !ticketRequired)
                        ? "rgba(20,184,166,0.2)"
                        : "rgba(255,255,255,0.04)",
                      color: (opt === "Yes" ? ticketRequired : !ticketRequired) ? "#2dd4bf" : "var(--text-muted)",
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {ticketRequired && (
            <div className="grid-2">
              <div className="form-group">
                <label>Ticket Price (LKR)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={ticketPrice}
                  onChange={e => setTicketPrice(e.target.value)}
                  placeholder="500"
                />
              </div>
              <div className="form-group">
                <label>Ticket Type</label>
                <select
                  className="form-control"
                  value={ticketType}
                  onChange={e => setTicketType(e.target.value as any)}
                >
                  <option value="Foreigner">Foreigner</option>
                  <option value="Local">Local</option>
                  <option value="Student">Student</option>
                </select>
              </div>
            </div>
          )}

          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div className="form-group">
              <label style={{ fontSize: 13, color: "var(--text-muted)" }}>Current Images</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {existingImages.map((src, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img
                      src={src}
                      alt=""
                      style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(i)}
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "#ef4444",
                        border: "none",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: 11,
                        lineHeight: "20px",
                        textAlign: "center"
                      }}
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Images */}
          <div className="form-group">
            <label>Add New Images</label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="form-control"
              style={{ padding: "8px" }}
              onChange={e => handleFileSelect(e.target.files)}
            />
            {newImagePreviews.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {newImagePreviews.map((src, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img
                      src={src}
                      alt=""
                      style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(20,184,166,0.3)" }}
                    />
                    <button
                      type="button"
                      onClick={() => removeNewImage(i)}
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "#ef4444",
                        border: "none",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: 11,
                        lineHeight: "20px",
                        textAlign: "center"
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ padding: "16px 0 0", marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
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
