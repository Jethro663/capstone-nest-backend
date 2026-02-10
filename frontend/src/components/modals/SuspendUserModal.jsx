import React, { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Confirmation modal for suspending a user.
 * Amber/warning styling. Shows teacher warnings if applicable.
 */
const SuspendUserModal = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  loading = false,
}) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen && modalRef.current) modalRef.current.focus();
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const fullName = `${user.firstName} ${user.middleName || ""} ${user.lastName}`.trim();
  const userRoles = user.roles?.map((r) => r?.name).filter(Boolean) || [];
  const isTeacher = userRoles.includes("teacher");

  return (
    <div style={styles.overlay}>
      <div ref={modalRef} tabIndex={-1} style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            <AlertTriangle size={22} color="#f59e0b" style={{ marginRight: 8 }} />
            Suspend User
          </h2>
          <button style={styles.closeButton} onClick={onClose} disabled={loading}>
            ✕
          </button>
        </div>

        {/* Warning Banner */}
        <div style={styles.warningBanner}>
          <AlertTriangle size={16} color="#92400e" />
          <span>This action will revoke the user's access to the system.</span>
        </div>

        {/* User Info */}
        <div style={styles.userInfo}>
          <p style={{ margin: 0 }}>
            <strong>{fullName}</strong>
          </p>
          <p style={{ margin: "4px 0 0", color: "#9ca3af", fontSize: 13 }}>
            {user.email} &bull; {userRoles.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(", ")}
          </p>
        </div>

        {/* Teacher warning */}
        {isTeacher && (
          <div style={styles.teacherWarning}>
            <p style={{ margin: 0, fontWeight: 600, color: "#92400e" }}>
              Teacher Account Warning
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#78350f" }}>
              If this teacher has active classes, students will lose access to those classes while the account is suspended.
            </p>
          </div>
        )}

        {/* Message */}
        <div style={styles.message}>
          <p style={{ margin: "0 0 8px" }}>What happens when you suspend:</p>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
            <li>User <strong>cannot log in</strong> to the system</li>
            <li>All data (grades, submissions, enrollments) is <strong>preserved</strong></li>
            <li>You can <strong>reactivate</strong> the account at any time</li>
            <li>This is the <strong>first step</strong> of the deletion process</li>
          </ul>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.cancelButton} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button style={styles.suspendButton} onClick={onConfirm} disabled={loading}>
            {loading ? "Suspending..." : "Suspend User"}
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
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    backgroundColor: "#1f2937",
    color: "#f9fafb",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 480,
    boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
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
  },
  closeButton: {
    background: "transparent",
    border: "none",
    color: "#f9fafb",
    fontSize: 18,
    cursor: "pointer",
  },
  warningBanner: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 8,
    backgroundColor: "#fef3c7",
    color: "#92400e",
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 16,
  },
  userInfo: {
    padding: "12px 14px",
    borderRadius: 8,
    backgroundColor: "#374151",
    marginBottom: 16,
  },
  teacherWarning: {
    padding: "10px 14px",
    borderRadius: 8,
    backgroundColor: "#fde68a",
    marginBottom: 16,
  },
  message: {
    marginBottom: 20,
    lineHeight: 1.5,
    color: "#d1d5db",
    fontSize: 14,
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
  suspendButton: {
    padding: "10px 18px",
    backgroundColor: "#f59e0b",
    color: "#1f2937",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
  },
};

export default SuspendUserModal;
