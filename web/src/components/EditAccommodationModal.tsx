import React, { useState, useEffect } from "react";
import { type Accommodation, type AccommodationType, type Role } from "../types";
import { apiRequest } from "../utils/api";

export interface EditAccommodationModalProps {
  isOpen: boolean;
  onClose: () => void;
  accommodation: Accommodation | null;
  destinationStatus?: string;
  onSaved: (updated: Accommodation, revertedToPending: boolean) => void;
  role: Role;
  userId: string;
  uploadImages: (files: File[], folder: string) => Promise<string[]>;
}

const COMMON_AMENITIES = [
  "WiFi",
  "AC",
  "Swimming Pool",
  "Free Parking",
  "Breakfast Included",
  "Hot Water",
  "Kitchenette",
  "Gym",
  "Sea View",
  "Mountain View",
  "Restaurant on-site",
  "Room Service"
];

export const EditAccommodationModal: React.FC<EditAccommodationModalProps> = ({
  isOpen,
  onClose,
  accommodation,
  destinationStatus,
  onSaved,
  role,
  userId,
  uploadImages,
}) => {
  if (!isOpen || !accommodation) return null;

  const [name, setName] = useState(accommodation.name || "");
  const [type, setType] = useState<AccommodationType>(accommodation.type || "Hotel");
  const [location, setLocation] = useState(accommodation.location || "");
  const [pricePerNight, setPricePerNight] = useState(
    accommodation.pricePerNight ? String(accommodation.pricePerNight) : ""
  );
  const [specialNotes, setSpecialNotes] = useState(accommodation.specialNotes || "");
  const [contactNumber, setContactNumber] = useState(accommodation.contactNumber || "");

  const [amenities, setAmenities] = useState<string[]>(accommodation.amenities || []);
  const [customAmenity, setCustomAmenity] = useState("");

  const [existingImages, setExistingImages] = useState<string[]>(accommodation.imageUrls || []);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accommodation) {
      setName(accommodation.name || "");
      setType(accommodation.type || "Hotel");
      setLocation(accommodation.location || "");
      setPricePerNight(accommodation.pricePerNight ? String(accommodation.pricePerNight) : "");
      setSpecialNotes(accommodation.specialNotes || "");
      setContactNumber(accommodation.contactNumber || "");
      setAmenities(accommodation.amenities || []);
      setExistingImages(accommodation.imageUrls || []);
      setNewImageFiles([]);
      setNewImagePreviews([]);
      setCustomAmenity("");
      setError(null);
    }
  }, [accommodation]);

  function toggleAmenity(amenity: string) {
    setAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  }

  function addCustomAmenity() {
    if (customAmenity.trim() && !amenities.includes(customAmenity.trim())) {
      setAmenities(prev => [...prev, customAmenity.trim()]);
      setCustomAmenity("");
    }
  }

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
      setError("Accommodation name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let finalImages = [...existingImages];
      if (newImageFiles.length > 0) {
        const uploaded = await uploadImages(
          newImageFiles,
          `destinations/${accommodation.destinationId}/accommodations`
        );
        finalImages = [...finalImages, ...uploaded];
      }

      const payload = {
        name: name.trim(),
        type,
        location: location.trim() || null,
        pricePerNight: pricePerNight ? Number(pricePerNight) : null,
        specialNotes: specialNotes.trim() || null,
        amenities,
        imageUrls: finalImages,
        contactNumber: contactNumber.trim() || null,
        isActive: true,
      };

      const res = await apiRequest<Accommodation>(
        `/api/destinations/accommodations/${accommodation.id}`,
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
      setError(err?.message || "Failed to update accommodation.");
    } finally {
      setSaving(false);
    }
  }

  const isVerified = destinationStatus === "Verified";

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div className="modal-content" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">✏️ Edit Accommodation</div>
            <div className="modal-subtitle">Update stay options for {accommodation.name}</div>
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
              <label>Accommodation Name <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                required
                className="form-control"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. 98 Acres Resort"
              />
            </div>
            <div className="form-group">
              <label>Property Type</label>
              <select
                className="form-control"
                value={type}
                onChange={e => setType(e.target.value as AccommodationType)}
              >
                {["Hotel", "GuestHouse", "Homestay", "Villa", "Hostel"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Location / Address</label>
              <input
                className="form-control"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Ella, Passara Road"
              />
            </div>
            <div className="form-group">
              <label>Price Per Night (LKR)</label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={pricePerNight}
                onChange={e => setPricePerNight(e.target.value)}
                placeholder="e.g. 15000"
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Contact Phone</label>
              <input
                className="form-control"
                value={contactNumber}
                onChange={e => setContactNumber(e.target.value)}
                placeholder="e.g. +94 57 222 9999"
              />
            </div>
            <div className="form-group">
              <label>Special Notes / Policies</label>
              <input
                className="form-control"
                value={specialNotes}
                onChange={e => setSpecialNotes(e.target.value)}
                placeholder="e.g. Free cancellation 24h prior"
              />
            </div>
          </div>

          {/* Amenities checklist */}
          <div className="form-group">
            <label style={{ fontSize: 13, marginBottom: 8, display: "block" }}>Amenities & Perks</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {COMMON_AMENITIES.map(amenity => {
                const active = amenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    style={{
                      background: active ? "rgba(167,139,250,0.25)" : "rgba(255,255,255,0.04)",
                      border: active ? "1px solid #a78bfa" : "1px solid rgba(255,255,255,0.1)",
                      color: active ? "#c4b5fd" : "var(--text-muted)",
                      borderRadius: 16,
                      padding: "4px 12px",
                      fontSize: 12,
                      cursor: "pointer",
                      fontWeight: active ? 600 : 400
                    }}
                  >
                    {active ? "✓ " : "+ "}{amenity}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="form-control"
                placeholder="Add other amenity (e.g. Fireplace)"
                value={customAmenity}
                onChange={e => setCustomAmenity(e.target.value)}
                style={{ fontSize: 13 }}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomAmenity();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={addCustomAmenity}
                style={{ whiteSpace: "nowrap" }}
              >
                + Add
              </button>
            </div>
          </div>

          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div className="form-group">
              <label style={{ fontSize: 13, color: "var(--text-muted)" }}>Current Photos</label>
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
            <label>Add New Photos</label>
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
                      style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(167,139,250,0.3)" }}
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
                  : "linear-gradient(135deg, #a78bfa, #8b5cf6)",
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
