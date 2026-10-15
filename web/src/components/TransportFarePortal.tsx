import React, { useState, useEffect, useRef } from "react";
import { Role, TransportCategory, TransportFareFile } from "../types";
import { API_BASE, apiRequest } from "../utils/api";

interface TransportFarePortalProps {
  role: Role;
  userId?: string;
  userEmail?: string;
}

export const TransportFarePortal: React.FC<TransportFarePortalProps> = ({
  role,
  userId = "",
  userEmail = "",
}) => {
  const [selectedCategory, setSelectedCategory] = useState<TransportCategory>("Railway");
  const [fareFiles, setFareFiles] = useState<TransportFareFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sample Rows Preview modal state
  const [previewFile, setPreviewFile] = useState<TransportFareFile | null>(null);

  // Review modal state (Admin Approve/Reject)
  const [reviewingFile, setReviewingFile] = useState<TransportFareFile | null>(null);
  const [reviewAction, setReviewAction] = useState<"Approve" | "Reject" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Delete confirmation modal state
  const [fileToDelete, setFileToDelete] = useState<TransportFareFile | null>(null);
  const [deletingFile, setDeletingFile] = useState(false);

  const isAdmin = role === "StaffAdmin";
  const isProvider = role === "ServiceProvider";

  // Helpers
  const getDisplayName = (f: TransportFareFile) => f.fileName || f.originalFileName || "dataset.csv";
  const getRowCount = (f: TransportFareFile) => f.parsedRowCount ?? f.rowCount ?? 0;
  const getUploaderRole = (f: TransportFareFile) => f.uploadedByRole || f.uploaderRole || "ServiceProvider";
  const getFeedbackNote = (f: TransportFareFile) => f.adminNotes || f.statusNote || "";

  // Fetch transport fare files
  const loadFareFiles = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Pass category and status=All so we can display active and pending datasets
      const data = await apiRequest<TransportFareFile[]>(
        `/api/transport-fares?category=${selectedCategory}&status=All`,
        { method: "GET" },
        role,
        userId
      );
      setFareFiles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load transport fare datasets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFareFiles();
  }, [selectedCategory]);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setErrorMsg("Please select a valid .csv file.");
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
    }
  };

  // Upload file
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg("Please choose a .csv file to upload.");
      return;
    }

    setIsUploading(true);
    setUploadProgressText("Uploading and parsing CSV fare data...");
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("category", selectedCategory);
      if (userEmail) {
        formData.append("uploaderName", userEmail);
      }

      const result = await apiRequest<TransportFareFile>(
        "/api/transport-fares/upload",
        {
          method: "POST",
          body: formData,
        },
        role,
        userId
      );

      const count = getRowCount(result);
      const name = getDisplayName(result);

      if (isAdmin) {
        setSuccessMsg(`✅ Successfully uploaded and published "${name}" (${count} rows) directly to Supabase ${result.storageBucket} bucket!`);
      } else {
        setSuccessMsg(`🚀 "${name}" (${count} rows) has been uploaded and submitted to Staff Admin for verification!`);
      }

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await loadFareFiles();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload transport fare file.");
    } finally {
      setIsUploading(false);
      setUploadProgressText("");
    }
  };

  // Admin Approve
  const handleApprove = async () => {
    if (!reviewingFile) return;
    setSubmittingReview(true);
    setErrorMsg(null);
    try {
      await apiRequest<TransportFareFile>(
        `/api/transport-fares/${reviewingFile.id}/approve`,
        {
          method: "POST",
          body: JSON.stringify({ action: "approve", notes: reviewNotes.trim() }),
        },
        role,
        userId
      );
      setSuccessMsg(`✅ Verified & approved "${getDisplayName(reviewingFile)}". Successfully moved to active Supabase bucket!`);
      setReviewingFile(null);
      setReviewAction(null);
      setReviewNotes("");
      await loadFareFiles();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to approve dataset.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Admin Reject
  const handleReject = async () => {
    if (!reviewingFile) return;
    if (!reviewNotes.trim()) {
      setErrorMsg("Please enter feedback notes explaining why the dataset was rejected.");
      return;
    }
    setSubmittingReview(true);
    setErrorMsg(null);
    try {
      await apiRequest<TransportFareFile>(
        `/api/transport-fares/${reviewingFile.id}/reject`,
        {
          method: "POST",
          body: JSON.stringify({ action: "reject", notes: reviewNotes.trim() }),
        },
        role,
        userId
      );
      setSuccessMsg(`⚠️ Rejected dataset "${getDisplayName(reviewingFile)}". Feedback sent to provider.`);
      setReviewingFile(null);
      setReviewAction(null);
      setReviewNotes("");
      await loadFareFiles();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reject dataset.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Delete File
  const handleDelete = async () => {
    if (!fileToDelete) return;
    setDeletingFile(true);
    setErrorMsg(null);
    try {
      await apiRequest(
        `/api/transport-fares/${fileToDelete.id}`,
        { method: "DELETE" },
        role,
        userId
      );
      setSuccessMsg(`🗑️ Successfully deleted "${getDisplayName(fileToDelete)}" from Supabase bucket & records.`);
      setFileToDelete(null);
      await loadFareFiles();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete file.");
    } finally {
      setDeletingFile(false);
    }
  };

  // Filter lists
  const pendingFiles = fareFiles.filter((f) => f.status === "PendingApproval");
  const approvedFiles = fareFiles.filter((f) => f.status === "Approved");
  const rejectedFiles = fareFiles.filter((f) => f.status === "Rejected");

  // Helper format file size
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Robust preview parser
  const parseSamplePreview = (jsonStr?: string) => {
    if (!jsonStr) return null;
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && Array.isArray(parsed.headers) && Array.isArray(parsed.rows)) {
        return {
          headers: parsed.headers as string[],
          rows: parsed.rows as string[][],
        };
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        const headers = Object.keys(parsed[0]);
        const rows = parsed.map((item: any) => headers.map((h) => String(item[h] ?? "")));
        return { headers, rows };
      }
    } catch {}
    return null;
  };

  return (
    <div className="transport-fare-portal" style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))",
          borderRadius: "16px",
          padding: "1.75rem 2rem",
          marginBottom: "2rem",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "2rem" }}>📊</span>
                <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "#f8fafc" }}>
                  Public Transport Fare Datasets
                </h1>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    padding: "0.25rem 0.75rem",
                    borderRadius: "9999px",
                    background: isAdmin ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)",
                    color: isAdmin ? "#f87171" : "#34d399",
                    border: `1px solid ${isAdmin ? "rgba(239, 68, 68, 0.4)" : "rgba(16, 185, 129, 0.4)"}`,
                  }}
                >
                  {isAdmin ? "Admin Portal (Direct & Verification)" : "Service Provider Portal (Review Flow)"}
                </span>
              </div>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.95rem", maxWidth: "750px" }}>
                Upload and manage Sri Lanka official Railway and Bus fare CSV tables. Datasets stored in Supabase Storage buckets
                (<code style={{ color: "#38bdf8", background: "rgba(56, 189, 248, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>railway-fares</code> and{" "}
                <code style={{ color: "#38bdf8", background: "rgba(56, 189, 248, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>bus-fares</code>)
                are utilized by TravelWise AI agents for accurate budget and transport recommendations.
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="btn btn-ghost"
                onClick={loadFareFiles}
                disabled={loading}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#e2e8f0",
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span>🔄</span> {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#fca5a5",
            padding: "1rem",
            borderRadius: "10px",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            style={{ background: "transparent", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: "1.2rem" }}
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#6ee7b7",
            padding: "1rem",
            borderRadius: "10px",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            style={{ background: "transparent", border: "none", color: "#6ee7b7", cursor: "pointer", fontSize: "1.2rem" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Category Tabs: Railway vs Bus */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1.5rem",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          paddingBottom: "0.75rem",
        }}
      >
        <button
          onClick={() => setSelectedCategory("Railway")}
          style={{
            background: selectedCategory === "Railway" ? "linear-gradient(135deg, #0284c7, #0369a1)" : "rgba(255, 255, 255, 0.05)",
            color: selectedCategory === "Railway" ? "#ffffff" : "#94a3b8",
            border: selectedCategory === "Railway" ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
            padding: "0.75rem 1.5rem",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            boxShadow: selectedCategory === "Railway" ? "0 4px 14px rgba(2, 132, 199, 0.4)" : "none",
            transition: "all 0.2s ease",
          }}
        >
          <span style={{ fontSize: "1.3rem" }}>🚂</span>
          <div>
            <div style={{ lineHeight: 1.2 }}>Public Railway Fares</div>
            <div style={{ fontSize: "0.75rem", opacity: 0.8, fontWeight: 400 }}>Train Ticket Rates (railway-fares bucket)</div>
          </div>
        </button>

        <button
          onClick={() => setSelectedCategory("Bus")}
          style={{
            background: selectedCategory === "Bus" ? "linear-gradient(135deg, #d97706, #b45309)" : "rgba(255, 255, 255, 0.05)",
            color: selectedCategory === "Bus" ? "#ffffff" : "#94a3b8",
            border: selectedCategory === "Bus" ? "1px solid #fbbf24" : "1px solid rgba(255, 255, 255, 0.1)",
            padding: "0.75rem 1.5rem",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            boxShadow: selectedCategory === "Bus" ? "0 4px 14px rgba(217, 119, 6, 0.4)" : "none",
            transition: "all 0.2s ease",
          }}
        >
          <span style={{ fontSize: "1.3rem" }}>🚌</span>
          <div>
            <div style={{ lineHeight: 1.2 }}>Public Bus Fares</div>
            <div style={{ fontSize: "0.75rem", opacity: 0.8, fontWeight: 400 }}>Bus Route Rates (bus-fares bucket)</div>
          </div>
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>
        {/* Upload Form Card */}
        <div
          style={{
            background: "rgba(30, 41, 59, 0.7)",
            backdropFilter: "blur(12px)",
            borderRadius: "14px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            padding: "1.5rem 1.75rem",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
            <span style={{ fontSize: "1.3rem" }}>📤</span>
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600, color: "#f1f5f9" }}>
              Upload New {selectedCategory} Fare .CSV File
            </h2>
          </div>

          <p style={{ margin: "0 0 1.25rem 0", color: "#94a3b8", fontSize: "0.88rem" }}>
            {isAdmin ? (
              <span>
                As an <strong>Administrator</strong>, your uploaded CSV will be immediately saved to the active{" "}
                <code style={{ color: "#38bdf8" }}>{selectedCategory === "Railway" ? "railway-fares" : "bus-fares"}</code> bucket
                and made live for AI agents.
              </span>
            ) : (
              <span>
                As a <strong>Service Provider</strong>, your uploaded CSV file will be submitted for <strong>Admin Review</strong>.
                Upon staff approval, it will be published to the active Supabase bucket.
              </span>
            )}
          </p>

          <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                border: "2px dashed rgba(255, 255, 255, 0.15)",
                borderRadius: "12px",
                padding: "1.75rem",
                textAlign: "center",
                background: selectedFile ? "rgba(56, 189, 248, 0.05)" : "rgba(15, 23, 42, 0.5)",
                cursor: "pointer",
                transition: "border 0.2s ease",
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📄</div>
              {selectedFile ? (
                <div>
                  <div style={{ fontWeight: 600, color: "#38bdf8", fontSize: "1rem" }}>{selectedFile.name}</div>
                  <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                    Size: {formatBytes(selectedFile.size)} • Click to change file
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 500, color: "#e2e8f0", fontSize: "0.95rem" }}>
                    Click to browse or drop your <span style={{ color: "#38bdf8" }}>.CSV</span> file here
                  </div>
                  <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                    Supports UTF-8 CSV files with station/route and fare columns
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              {selectedFile && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  disabled={isUploading}
                  style={{
                    padding: "0.6rem 1.2rem",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#94a3b8",
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={!selectedFile || isUploading}
                style={{
                  background: !selectedFile || isUploading ? "#475569" : selectedCategory === "Railway" ? "#0284c7" : "#d97706",
                  color: "#ffffff",
                  border: "none",
                  padding: "0.6rem 1.5rem",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  cursor: !selectedFile || isUploading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}
              >
                {isUploading ? (
                  <span>⏳ {uploadProgressText || "Uploading..."}</span>
                ) : (
                  <span>{isAdmin ? "🚀 Upload & Publish Dataset" : "📤 Upload & Submit to Admin"}</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Admin Pending Verification Queue (Shown if Admin or if Provider has pending files) */}
        {pendingFiles.length > 0 && (
          <div
            style={{
              background: "rgba(30, 41, 59, 0.7)",
              backdropFilter: "blur(12px)",
              borderRadius: "14px",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              padding: "1.5rem 1.75rem",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "1.3rem" }}>⏳</span>
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600, color: "#fbbf24" }}>
                  Pending Admin Verification Queue ({pendingFiles.length})
                </h2>
              </div>
              <span
                style={{
                  fontSize: "0.8rem",
                  background: "rgba(245, 158, 11, 0.2)",
                  color: "#fbbf24",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "6px",
                  fontWeight: 500,
                }}
              >
                Awaiting Verification
              </span>
            </div>

            <p style={{ margin: "0 0 1rem 0", color: "#94a3b8", fontSize: "0.85rem" }}>
              {isAdmin
                ? "The following datasets were submitted by Service Providers. Review the sample rows or download the full CSV file before approving or declining."
                : "Your uploaded datasets currently awaiting review by TravelWise staff administrators:"}
            </p>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", textAlign: "left", color: "#64748b" }}>
                    <th style={{ padding: "0.75rem 0.5rem" }}>File Name</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>Uploaded By</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>Rows</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>Size</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>Submitted Date</th>
                    <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingFiles.map((file) => (
                    <tr
                      key={file.id}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        transition: "background 0.2s ease",
                      }}
                    >
                      <td style={{ padding: "0.75rem 0.5rem", fontWeight: 500, color: "#f8fafc" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span>📄</span>
                          <span>{getDisplayName(file)}</span>
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", color: "#94a3b8" }}>
                        <div>{file.uploaderName || file.uploadedByUserId.substring(0, 8)}</div>
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>({getUploaderRole(file)})</span>
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", color: "#cbd5e1" }}>
                        <strong>{getRowCount(file).toLocaleString()}</strong> rows
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", color: "#94a3b8" }}>{formatBytes(file.fileSizeBytes)}</td>
                      <td style={{ padding: "0.75rem 0.5rem", color: "#94a3b8" }}>
                        {new Date(file.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          {(file.samplePreviewJson || file.sampleRowsJson) && (
                            <button
                              className="btn btn-ghost"
                              onClick={() => setPreviewFile(file)}
                              style={{
                                padding: "0.35rem 0.75rem",
                                fontSize: "0.8rem",
                                borderRadius: "6px",
                                background: "rgba(255, 255, 255, 0.08)",
                                color: "#38bdf8",
                                border: "1px solid rgba(56, 189, 248, 0.2)",
                                cursor: "pointer",
                              }}
                            >
                              👁️ Preview
                            </button>
                          )}

                          <a
                            href={`${API_BASE}/api/transport-fares/${file.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: "0.35rem 0.75rem",
                              fontSize: "0.8rem",
                              borderRadius: "6px",
                              background: "rgba(255, 255, 255, 0.08)",
                              color: "#e2e8f0",
                              border: "1px solid rgba(255, 255, 255, 0.15)",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                            }}
                          >
                            ⬇️ Download
                          </a>

                          {isAdmin && (
                            <>
                              <button
                                onClick={() => {
                                  setReviewingFile(file);
                                  setReviewAction("Approve");
                                  setReviewNotes("");
                                }}
                                style={{
                                  padding: "0.35rem 0.75rem",
                                  fontSize: "0.8rem",
                                  borderRadius: "6px",
                                  background: "#10b981",
                                  color: "#ffffff",
                                  border: "none",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                ✅ Approve
                              </button>
                              <button
                                onClick={() => {
                                  setReviewingFile(file);
                                  setReviewAction("Reject");
                                  setReviewNotes("");
                                }}
                                style={{
                                  padding: "0.35rem 0.75rem",
                                  fontSize: "0.8rem",
                                  borderRadius: "6px",
                                  background: "#ef4444",
                                  color: "#ffffff",
                                  border: "none",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                ❌ Reject
                              </button>
                            </>
                          )}

                          {(isAdmin || (isProvider && file.uploadedByUserId === userId)) && (
                            <button
                              onClick={() => setFileToDelete(file)}
                              style={{
                                padding: "0.35rem 0.5rem",
                                fontSize: "0.8rem",
                                borderRadius: "6px",
                                background: "rgba(239, 68, 68, 0.15)",
                                color: "#f87171",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                cursor: "pointer",
                              }}
                              title="Delete file"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Active & Verified Datasets Table */}
        <div
          style={{
            background: "rgba(30, 41, 59, 0.7)",
            backdropFilter: "blur(12px)",
            borderRadius: "14px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            padding: "1.5rem 1.75rem",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "1.3rem" }}>✅</span>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600, color: "#f1f5f9" }}>
                Active {selectedCategory} Datasets ({approvedFiles.length})
              </h2>
            </div>
            <span
              style={{
                fontSize: "0.8rem",
                background: "rgba(16, 185, 129, 0.15)",
                color: "#34d399",
                padding: "0.2rem 0.6rem",
                borderRadius: "6px",
                fontWeight: 500,
              }}
            >
              Live in Supabase {selectedCategory === "Railway" ? "railway-fares" : "bus-fares"}
            </span>
          </div>

          <p style={{ margin: "0 0 1.25rem 0", color: "#94a3b8", fontSize: "0.85rem" }}>
            These datasets are verified, active, and accessible to downstream AI agents (Budget Agent, Trip Planner Agent)
            for real-time public transport fare lookups across Sri Lanka.
          </p>

          {approvedFiles.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem 1rem",
                color: "#64748b",
                border: "1px dashed rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
              }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📁</div>
              <div style={{ fontWeight: 500, color: "#94a3b8", fontSize: "1rem" }}>
                No active {selectedCategory} datasets found yet.
              </div>
              <div style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                Upload a .CSV file above to populate the {selectedCategory} fare database!
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", textAlign: "left", color: "#64748b" }}>
                    <th style={{ padding: "0.75rem 0.5rem" }}>File Name</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>Uploader</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>Rows</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>Size</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>Bucket Storage Path</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>Published Date</th>
                    <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedFiles.map((file) => (
                    <tr
                      key={file.id}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        transition: "background 0.2s ease",
                      }}
                    >
                      <td style={{ padding: "0.75rem 0.5rem", fontWeight: 500, color: "#f8fafc" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span>📄</span>
                          <span>{getDisplayName(file)}</span>
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", color: "#94a3b8" }}>
                        <div>{file.uploaderName || file.uploadedByUserId.substring(0, 8)}</div>
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>({getUploaderRole(file)})</span>
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", color: "#34d399" }}>
                        <strong>{getRowCount(file).toLocaleString()}</strong> rows
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", color: "#94a3b8" }}>{formatBytes(file.fileSizeBytes)}</td>
                      <td style={{ padding: "0.75rem 0.5rem", color: "#64748b", fontFamily: "monospace", fontSize: "0.8rem" }}>
                        {file.storageBucket}/{file.storagePath}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", color: "#94a3b8" }}>
                        {new Date(file.reviewedAt || file.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          {(file.samplePreviewJson || file.sampleRowsJson) && (
                            <button
                              className="btn btn-ghost"
                              onClick={() => setPreviewFile(file)}
                              style={{
                                padding: "0.35rem 0.75rem",
                                fontSize: "0.8rem",
                                borderRadius: "6px",
                                background: "rgba(255, 255, 255, 0.08)",
                                color: "#38bdf8",
                                border: "1px solid rgba(56, 189, 248, 0.2)",
                                cursor: "pointer",
                              }}
                            >
                              👁️ Sample
                            </button>
                          )}

                          <a
                            href={`${API_BASE}/api/transport-fares/${file.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: "0.35rem 0.75rem",
                              fontSize: "0.8rem",
                              borderRadius: "6px",
                              background: "rgba(255, 255, 255, 0.08)",
                              color: "#e2e8f0",
                              border: "1px solid rgba(255, 255, 255, 0.15)",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                            }}
                          >
                            ⬇️ Download
                          </a>

                          {(isAdmin || (isProvider && file.uploadedByUserId === userId)) && (
                            <button
                              onClick={() => setFileToDelete(file)}
                              style={{
                                padding: "0.35rem 0.5rem",
                                fontSize: "0.8rem",
                                borderRadius: "6px",
                                background: "rgba(239, 68, 68, 0.15)",
                                color: "#f87171",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                cursor: "pointer",
                              }}
                              title="Delete file"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rejected Datasets (if any) */}
        {rejectedFiles.length > 0 && (
          <div
            style={{
              background: "rgba(30, 41, 59, 0.5)",
              borderRadius: "14px",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              padding: "1.25rem 1.5rem",
            }}
          >
            <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "1rem", color: "#f87171", fontWeight: 600 }}>
              ❌ Rejected / Returned Datasets ({rejectedFiles.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {rejectedFiles.map((file) => (
                <div
                  key={file.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(15, 23, 42, 0.6)",
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, color: "#e2e8f0" }}>{getDisplayName(file)}</div>
                    <div style={{ fontSize: "0.8rem", color: "#fca5a5" }}>
                      Feedback Note: {getFeedbackNote(file) || "No note specified"}
                    </div>
                  </div>
                  {(isAdmin || (isProvider && file.uploadedByUserId === userId)) && (
                    <button
                      onClick={() => setFileToDelete(file)}
                      style={{
                        padding: "0.3rem 0.6rem",
                        fontSize: "0.8rem",
                        borderRadius: "6px",
                        background: "rgba(239, 68, 68, 0.2)",
                        color: "#f87171",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview Sample Rows Modal */}
      {previewFile && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1.5rem",
          }}
          onClick={() => setPreviewFile(null)}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: "16px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              padding: "1.75rem",
              maxWidth: "850px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#f8fafc" }}>
                  CSV Preview: {getDisplayName(previewFile)}
                </h3>
                <p style={{ margin: "0.25rem 0 0 0", color: "#94a3b8", fontSize: "0.85rem" }}>
                  Showing sample rows extracted from the uploaded CSV dataset ({getRowCount(previewFile)} total rows).
                </p>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {(() => {
              const preview = parseSamplePreview(previewFile.samplePreviewJson || previewFile.sampleRowsJson);
              if (!preview || preview.rows.length === 0) {
                return (
                  <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                    No sample row preview available for this dataset.
                  </div>
                );
              }
              return (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ background: "rgba(15, 23, 42, 0.8)", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                        {preview.headers.map((h) => (
                          <th key={h} style={{ padding: "0.6rem 0.75rem", textAlign: "left", color: "#38bdf8" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((rowCells, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                            background: idx % 2 === 0 ? "rgba(255, 255, 255, 0.02)" : "transparent",
                          }}
                        >
                          {rowCells.map((cell, cIdx) => (
                            <td key={cIdx} style={{ padding: "0.6rem 0.75rem", color: "#e2e8f0" }}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem", gap: "0.75rem" }}>
              <a
                href={`${API_BASE}/api/transport-fares/${previewFile.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "0.6rem 1.25rem",
                  borderRadius: "8px",
                  background: "#0284c7",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                ⬇️ Download Full CSV
              </a>
              <button
                className="btn btn-ghost"
                onClick={() => setPreviewFile(null)}
                style={{
                  padding: "0.6rem 1.25rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#cbd5e1",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Review (Approve / Reject) Modal */}
      {reviewingFile && reviewAction && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1.5rem",
          }}
          onClick={() => {
            setReviewingFile(null);
            setReviewAction(null);
          }}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: "16px",
              border: `1px solid ${reviewAction === "Approve" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
              padding: "1.75rem",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem", color: "#f8fafc" }}>
              {reviewAction === "Approve" ? "✅ Approve Transport Dataset" : "❌ Reject Transport Dataset"}
            </h3>
            <p style={{ margin: "0 0 1rem 0", color: "#94a3b8", fontSize: "0.9rem" }}>
              Dataset: <strong>{getDisplayName(reviewingFile)}</strong> ({getRowCount(reviewingFile)} rows)
            </p>

            {reviewAction === "Approve" ? (
              <p style={{ margin: "0 0 1rem 0", color: "#cbd5e1", fontSize: "0.85rem" }}>
                Approving this dataset will move the CSV file in Supabase from{" "}
                <code style={{ color: "#38bdf8" }}>pending/</code> to{" "}
                <code style={{ color: "#34d399" }}>active/</code> in the{" "}
                <strong>{reviewingFile.storageBucket}</strong> bucket. AI agents will immediately be able to query this data.
              </p>
            ) : (
              <p style={{ margin: "0 0 1rem 0", color: "#fca5a5", fontSize: "0.85rem" }}>
                Please provide feedback for the Service Provider explaining why this dataset was rejected (e.g. incorrect column format, invalid fare amounts):
              </p>
            )}

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.4rem" }}>
                Admin Notes / Feedback:
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={reviewAction === "Approve" ? "Optional approval notes..." : "Enter reason for rejection (required)..."}
                rows={3}
                style={{
                  width: "100%",
                  background: "#0f172a",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  color: "#f8fafc",
                  padding: "0.6rem 0.75rem",
                  fontSize: "0.9rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setReviewingFile(null);
                  setReviewAction(null);
                }}
                disabled={submittingReview}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={reviewAction === "Approve" ? handleApprove : handleReject}
                disabled={submittingReview}
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "8px",
                  background: reviewAction === "Approve" ? "#10b981" : "#ef4444",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 600,
                  cursor: submittingReview ? "not-allowed" : "pointer",
                }}
              >
                {submittingReview ? "Processing..." : reviewAction === "Approve" ? "Confirm & Publish" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1.5rem",
          }}
          onClick={() => setFileToDelete(null)}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: "16px",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              padding: "1.75rem",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem", color: "#f87171" }}>
              🗑️ Delete Transport Dataset?
            </h3>
            <p style={{ margin: "0 0 1rem 0", color: "#e2e8f0", fontSize: "0.9rem" }}>
              Are you sure you want to permanently delete <strong>{getDisplayName(fileToDelete)}</strong>?
            </p>
            <p style={{ margin: "0 0 1.25rem 0", color: "#94a3b8", fontSize: "0.85rem" }}>
              This will remove the file from Supabase storage bucket{" "}
              <code style={{ color: "#38bdf8" }}>{fileToDelete.storageBucket}</code> and delete its metadata record.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                className="btn btn-ghost"
                onClick={() => setFileToDelete(null)}
                disabled={deletingFile}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deletingFile}
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "8px",
                  background: "#ef4444",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 600,
                  cursor: deletingFile ? "not-allowed" : "pointer",
                }}
              >
                {deletingFile ? "Deleting..." : "Yes, Delete File"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
