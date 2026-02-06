import React, { useEffect, useRef } from "react";

const DeleteModal = ({
  isOpen,
  onClose,
  onDelete,
  itemName = "item",
  loading = false,
  title = "Confirm Deletion",
  message,
  Icon: IconComponent = () => <span>🗑️</span>,
}) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div ref={modalRef} tabIndex={-1} style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            <IconComponent style={{ marginRight: 8 }} /> {title}
          </h2>
          <button style={styles.closeButton} onClick={onClose} disabled={loading}>
            ✕
          </button>
        </div>

        {/* Message */}
        <p style={styles.message}>
          {message || (
            <>
              Are you sure you want to delete <strong>{itemName}</strong>? This action cannot be undone.
            </>
          )}
        </p>

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.cancelButton} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button style={styles.deleteButton} onClick={onDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
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
    backgroundColor: "rgba(0, 0, 0, 0.6)", // semi-transparent overlay
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    backgroundColor: "#1f2937", // dark gray, not pure black
    color: "#f9fafb", // light gray text
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 400,
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
  },
  closeButton: {
    background: "transparent",
    border: "none",
    color: "#f9fafb",
    fontSize: 18,
    cursor: "pointer",
  },
  message: {
    marginBottom: 24,
    lineHeight: 1.5,
    color: "#e5e7eb", // slightly lighter gray for readability
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelButton: {
    padding: "8px 16px",
    backgroundColor: "#374151", // dark gray button
    color: "#f9fafb",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  deleteButton: {
    padding: "8px 16px",
    backgroundColor: "#ef4444", // brighter red
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
};

export default DeleteModal;
