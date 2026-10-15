import React, { useState, useEffect } from "react";
import { type Restaurant, type FoodItem, type FoodCategory, type Role } from "../types";
import { apiRequest } from "../utils/api";

export interface EditRestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: Restaurant | null;
  destinationStatus?: string;
  onSaved: (updated: Restaurant, revertedToPending: boolean) => void;
  role: Role;
  userId: string;
  uploadImages: (files: File[], folder: string) => Promise<string[]>;
}

interface EditableFoodItem {
  id: string;
  isNew?: boolean;
  name: string;
  price: string;
  category: FoodCategory;
  imageUrl?: string;
  imageFile?: File | null;
  imagePreview?: string;
}

export const EditRestaurantModal: React.FC<EditRestaurantModalProps> = ({
  isOpen,
  onClose,
  restaurant,
  destinationStatus,
  onSaved,
  role,
  userId,
  uploadImages,
}) => {
  if (!isOpen || !restaurant) return null;

  const [name, setName] = useState(restaurant.name || "");
  const [location, setLocation] = useState(restaurant.location || "");
  const [contact, setContact] = useState(restaurant.contact || "");
  const [description, setDescription] = useState(restaurant.description || "");

  const [existingImages, setExistingImages] = useState<string[]>(restaurant.imageUrls || []);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  const [foodItems, setFoodItems] = useState<EditableFoodItem[]>([]);
  const [deletedFoodItemIds, setDeletedFoodItemIds] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name || "");
      setLocation(restaurant.location || "");
      setContact(restaurant.contact || "");
      setDescription(restaurant.description || "");
      setExistingImages(restaurant.imageUrls || []);
      setNewImageFiles([]);
      setNewImagePreviews([]);
      setDeletedFoodItemIds([]);
      setError(null);

      // Load existing food items
      if (restaurant.foodItems && restaurant.foodItems.length > 0) {
        setFoodItems(
          restaurant.foodItems.map(fi => ({
            id: fi.id,
            isNew: false,
            name: fi.name,
            price: String(fi.price),
            category: fi.category,
            imageUrl: fi.imageUrl,
            imagePreview: fi.imageUrl || "",
          }))
        );
      } else {
        // Fetch food items from API if not already attached
        apiRequest<FoodItem[]>(
          `/api/destinations/restaurants/${restaurant.id}/food-items`,
          {},
          role,
          userId
        )
          .then(items => {
            if (Array.isArray(items) && items.length > 0) {
              setFoodItems(
                items.map(fi => ({
                  id: fi.id,
                  isNew: false,
                  name: fi.name,
                  price: String(fi.price),
                  category: fi.category,
                  imageUrl: fi.imageUrl,
                  imagePreview: fi.imageUrl || "",
                }))
              );
            } else {
              setFoodItems([]);
            }
          })
          .catch(() => setFoodItems([]));
      }
    }
  }, [restaurant]);

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

  function addFoodItem() {
    setFoodItems(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        isNew: true,
        name: "",
        price: "",
        category: "Lunch",
        imageFile: null,
        imagePreview: "",
      },
    ]);
  }

  function removeFoodItem(item: EditableFoodItem) {
    if (!item.isNew) {
      setDeletedFoodItemIds(prev => [...prev, item.id]);
    }
    setFoodItems(prev => prev.filter(fi => fi.id !== item.id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Restaurant name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // 1. Upload new restaurant images
      let finalImages = [...existingImages];
      if (newImageFiles.length > 0) {
        const uploaded = await uploadImages(
          newImageFiles,
          `destinations/${restaurant.destinationId}/restaurants`
        );
        finalImages = [...finalImages, ...uploaded];
      }

      // 2. Update Restaurant
      const restPayload = {
        name: name.trim(),
        location: location.trim() || null,
        contact: contact.trim() || null,
        description: description.trim() || null,
        imageUrls: finalImages,
        isActive: true,
      };

      const updatedRest = await apiRequest<Restaurant>(
        `/api/destinations/restaurants/${restaurant.id}`,
        {
          method: "PUT",
          body: JSON.stringify(restPayload),
        },
        role,
        userId
      );

      // 3. Delete removed food items
      for (const delId of deletedFoodItemIds) {
        try {
          await apiRequest(
            `/api/destinations/food-items/${delId}`,
            { method: "DELETE" },
            role,
            userId
          );
        } catch (e) {
          console.warn("Error deleting food item", delId, e);
        }
      }

      // 4. Update or Create food items
      const updatedFoodItems: FoodItem[] = [];
      for (const fi of foodItems) {
        if (!fi.name.trim() || !fi.price) continue;

        let fiImageUrl = fi.imageUrl;
        if (fi.imageFile) {
          const uploaded = await uploadImages(
            [fi.imageFile],
            `destinations/${restaurant.destinationId}/food-items`
          );
          if (uploaded.length > 0) fiImageUrl = uploaded[0];
        }

        if (fi.isNew) {
          const createdFi = await apiRequest<FoodItem>(
            `/api/destinations/restaurants/${restaurant.id}/food-items`,
            {
              method: "POST",
              body: JSON.stringify({
                name: fi.name.trim(),
                price: Number(fi.price),
                category: fi.category,
                imageUrl: fiImageUrl || null,
              }),
            },
            role,
            userId
          );
          updatedFoodItems.push(createdFi);
        } else {
          const editedFi = await apiRequest<FoodItem>(
            `/api/destinations/food-items/${fi.id}`,
            {
              method: "PUT",
              body: JSON.stringify({
                name: fi.name.trim(),
                price: Number(fi.price),
                category: fi.category,
                imageUrl: fiImageUrl || null,
              }),
            },
            role,
            userId
          );
          updatedFoodItems.push(editedFi);
        }
      }

      const reverted = destinationStatus === "Verified";
      onSaved({ ...updatedRest, foodItems: updatedFoodItems }, reverted);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update restaurant.");
    } finally {
      setSaving(false);
    }
  }

  const isVerified = destinationStatus === "Verified";

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div className="modal-content" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">✏️ Edit Restaurant</div>
            <div className="modal-subtitle">Update details & menu for {restaurant.name}</div>
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
              <label>Restaurant Name <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                required
                className="form-control"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Cafe Chill"
              />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input
                className="form-control"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Main Street, Ella"
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Contact Number</label>
              <input
                className="form-control"
                value={contact}
                onChange={e => setContact(e.target.value)}
                placeholder="e.g. +94 57 222 8888"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input
                className="form-control"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Cozy cafe with western and local dishes"
              />
            </div>
          </div>

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
                      style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(251,191,36,0.3)" }}
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

          {/* Food Items section */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24" }}>🍛 Menu & Food Items ({foodItems.length})</div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={addFoodItem}
              >
                + Add Item
              </button>
            </div>

            {foodItems.map((fi, idx) => (
              <div key={fi.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div className="grid-2" style={{ gap: 8 }}>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 12 }}>Food Name</label>
                    <input
                      className="form-control"
                      value={fi.name}
                      placeholder="e.g. Rice & Curry"
                      onChange={e => setFoodItems(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 12 }}>Price (LKR)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={fi.price}
                      placeholder="350"
                      onChange={e => setFoodItems(prev => prev.map((item, i) => i === idx ? { ...item, price: e.target.value } : item))}
                    />
                  </div>
                </div>
                <div className="grid-2" style={{ gap: 8 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 12 }}>Category</label>
                    <select
                      className="form-control"
                      value={fi.category}
                      onChange={e => setFoodItems(prev => prev.map((item, i) => i === idx ? { ...item, category: e.target.value as FoodCategory } : item))}
                    >
                      {["Breakfast", "Lunch", "Dinner", "Snack", "Beverage"].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 12 }}>Item Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="form-control"
                      style={{ padding: "6px" }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const preview = URL.createObjectURL(file);
                        setFoodItems(prev => prev.map((item, i) => i === idx ? { ...item, imageFile: file, imagePreview: preview } : item));
                      }}
                    />
                  </div>
                </div>
                {fi.imagePreview && (
                  <div style={{ marginTop: 8 }}>
                    <img src={fi.imagePreview} alt="" style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 6 }} />
                  </div>
                )}
                <div style={{ textAlign: "right", marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => removeFoodItem(fi)}
                    style={{
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.25)",
                      color: "#f87171",
                      borderRadius: 6,
                      padding: "2px 8px",
                      cursor: "pointer",
                      fontSize: 11
                    }}
                  >
                    🗑️ Remove Item
                  </button>
                </div>
              </div>
            ))}
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
                  : "linear-gradient(135deg, #f59e0b, #d97706)",
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
