import React, { useState, useEffect, useRef } from "react";
import { Skull } from "lucide-react";

/**
 * High-severity modal for permanently purging a user from the database.
 * Requires the admin to type the user's full name to confirm (like GitHub repo delete).
 */
const PurgeUserModal = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  loading = false,
  onExport,
}) => {
  const [confirmInput, setConfirmInput] = useState("");
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setConfirmInput("");
      if (modalRef.current) modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const fullName = `${user.firstName} ${user.middleName || ""} ${user.lastName}`.replace(/\s+/g, " ").trim();
  const isConfirmed = confirmInput.trim().toLowerCase() === fullName.toLowerCase();

  return (
    <div style={styles.overlay}>
      <div ref={modalRef} tabIndex={-1} style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            <Skull size={22} color="#fca5a5" style={{ marginRight: 8 }} />
            Permanently Delete User
          </h2>
          <button style={styles.closeButton} onClick={onClose} disabled={loading}>
            ✕
          </button>
        </div>

        {/* Critical Banner */}
        <div style={styles.criticalBanner}>
          <Skull size={16} />
          <span>This action is <strong>irreversible</strong>. All database records will be permanently removed.</span>
        </div>

        {/* User Info */}
        <div style={styles.userInfo}>
          <p style={{ margin: 0 }}>
            <strong>{fullName}</strong>
          </p>
          <p style={{ margin: "4px 0 0", color: "#9ca3af", fontSize: 13 }}>
            {user.email}
          </p>
        </div>

        {/* What happens */}
        <div style={styles.message}>
          <p style={{ margin: "0 0 8px", fontWeight: 600, color: "#fca5a5" }}>
            What will be permanently deleted:
          </p>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, fontSize: 13 }}>
            <li>User account and login credentials</li>
            <li>All enrollments and class associations</li>
            <li>All lesson completions and progress data</li>
            <li>All assessment attempts, responses, and scores</li>
            <li>Student profile and personal information</li>
          </ul>
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "#9ca3af" }}>
            An archived snapshot of the data has been saved and will be retained for records.
          </p>
        </div>

        {/* Export option */}
        {onExport && (
          <button style={styles.exportButton} onClick={onExport} disabled={loading}>
            Download Data Export (JSON)
          </button>
        )}

        {/* Type to confirm */}
        <div style={styles.confirmSection}>
          <label style={styles.confirmLabel}>
            To confirm, type <strong style={{ color: "#fca5a5" }}>{fullName}</strong> below:
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={fullName}
            disabled={loading}
            style={{
              ...styles.confirmInput,
              borderColor: confirmInput && !isConfirmed ? "#ef4444" : "#4b5563",
            }}
          />
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.cancelButton} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            style={{
              ...styles.purgeButton,
              opacity: isConfirmed && !loading ? 1 : 0.4,
              cursor: isConfirmed && !loading ? "pointer" : "not-allowed",
            }}
            onClick={onConfirm}
            disabled={!isConfirmed || loading}
          >
            {loading ? "Purging..." : "Permanently Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    backgroundColor: "#1c1917",
    color: "#f9fafb",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 500,
    boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
    border: "1px solid #7f1d1d",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    margin: 0,
    color: "#fca5a5",
  },
  closeButton: {
    background: "transparent",
    border: "none",
    color: "#f9fafb",
    fontSize: 18,
    cursor: "pointer",
  },
  criticalBanner: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 8,
    backgroundColor: "#7f1d1d",
    color: "#fecaca",
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 16,
  },
  userInfo: {
    padding: "12px 14px",
    borderRadius: 8,
    backgroundColor: "#292524",
    marginBottom: 16,
    borderLeft: "3px solid #dc2626",
  },
  message: {
    marginBottom: 16,
    lineHeight: 1.5,
    color: "#d1d5db",
    fontSize: 14,
  },
  exportButton: {
    width: "100%",
    padding: "10px 14px",
    backgroundColor: "#1e3a5f",
    color: "#93c5fd",
    border: "1px solid #2563eb",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 13,
    marginBottom: 16,
    textAlign: "center",
  },
  confirmSection: {
    marginBottom: 20,
  },
  confirmLabel: {
    display: "block",
    fontSize: 13,
    color: "#d1d5db",
    marginBottom: 8,
  },
  confirmInput: {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "#292524",
    color: "#f9fafb",
    border: "1px solid #4b5563",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelButton: {
    padding: "10px 18px",
    backgroundColor: "#374151",
    color: "#f9fafb",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 500,
  },
  purgeButton: {
    padding: "10px 18px",
    backgroundColor: "#7f1d1d",
    color: "#fff",
    border: "1px solid #dc2626",
    borderRadius: 8,
    fontWeight: 600,
  },
};

export default PurgeUserModal;
