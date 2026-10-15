import React from "react";
import { CatalogItem, CatalogItemType } from "../types";

export interface CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  editItem: CatalogItem | null;
  catalogForm: {
    type: CatalogItemType;
    name: string;
    destination: string;
    description: string;
    price: string;
    currency: string;
  };
  setCatalogForm: React.Dispatch<React.SetStateAction<{
    type: CatalogItemType;
    name: string;
    destination: string;
    description: string;
    price: string;
    currency: string;
  }>>;
}

export const CatalogModal: React.FC<CatalogModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editItem,
  catalogForm,
  setCatalogForm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <div className="modal-title">🏝️ {editItem ? "Edit Listing" : "Add Travel Listing"}</div>
            <div className="modal-subtitle">Share a destination experience with travelers</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Listing Type</label>
            <select
              className="form-control"
              value={catalogForm.type}
              onChange={e => setCatalogForm({ ...catalogForm, type: e.target.value as CatalogItemType })}
            >
              <option value="VisitingPlace">📍 Visiting Place (Attraction)</option>
              <option value="Restaurant">🍽️ Restaurant & Dining</option>
              <option value="Accommodation">🏨 Accommodation (Hotel/Resort)</option>
              <option value="FoodPrice">💰 Food Price Details</option>
            </select>
          </div>
          <div className="form-group">
            <label>Listing Name</label>
            <input
              required
              className="form-control"
              placeholder="e.g. Cafe Chill or 98 Acres Resort"
              value={catalogForm.name}
              onChange={e => setCatalogForm({ ...catalogForm, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Destination City</label>
            <input
              required
              className="form-control"
              placeholder="e.g. Ella"
              value={catalogForm.destination}
              onChange={e => setCatalogForm({ ...catalogForm, destination: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Description & Pricing Details</label>
            <textarea
              required
              className="form-control"
              placeholder="Description of place, amenities, special offers or menu item prices..."
              value={catalogForm.description}
              onChange={e => setCatalogForm({ ...catalogForm, description: e.target.value })}
            />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Price (LKR)</label>
              <input
                type="number"
                min="0"
                className="form-control"
                placeholder="1500"
                value={catalogForm.price}
                onChange={e => setCatalogForm({ ...catalogForm, price: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Currency</label>
              <input
                className="form-control"
                value={catalogForm.currency}
                onChange={e => setCatalogForm({ ...catalogForm, currency: e.target.value })}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Listing</button>
          </div>
        </form>
      </div>
    </div>
  );
};
