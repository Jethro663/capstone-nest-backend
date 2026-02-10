import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "react-hot-toast";
import {
  UserPlus,
  Trash2,
  Search,
  Loader2,
  Edit2,
  ShieldOff,
  Download,
  Skull,
  RotateCcw,
} from "lucide-react";
import { motion } from "framer-motion";
import api from "../../services/api";
import CreateUserModal from "@/components/modals/CreateUserModal";
import DeleteModal from "@/components/modals/DeleteModal";
import SuspendUserModal from "@/components/modals/SuspendUserModal";
import PurgeUserModal from "@/components/modals/PurgeUserModal";

// ============================================================
// Constants
// ============================================================

const STATUS_TABS = [
  { key: "active", label: "Active Users", statuses: ["ACTIVE", "PENDING"] },
  { key: "suspended", label: "Suspended", statuses: ["SUSPENDED"] },
  { key: "deleted", label: "Deleted", statuses: ["DELETED"] },
];

const FIXED_ROLES = ["student", "teacher", "admin"];

// ============================================================
// Component
// ============================================================

const UserManagementPage = () => {
  // ---------- state ----------
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [activeTab, setActiveTab] = useState("active");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [suspendTarget, setSuspendTarget] = useState(null);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [purgeTarget, setPurgeTarget] = useState(null);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  // Get current admin to prevent self-actions
  let currentUserId = null;
  try {
    const { useAuth } = require("../../contexts/AuthContext");
    const ctx = useAuth();
    currentUserId = ctx?.user?.id || ctx?.user?.userId || null;
  } catch {
    /* auth context not available */
  }

  // -------------------------
  // FETCH USERS by status tab
  // -------------------------
  const fetchUsers = useCallback(async (statusTab = "active") => {
    setLoading(true);
    try {
      const tab = STATUS_TABS.find((t) => t.key === statusTab) || STATUS_TABS[0];
      const promises = tab.statuses.map((s) =>
        api.get("/users/all", { params: { status: s, limit: 100 } })
      );
      const responses = await Promise.all(promises);
      const allUsers = responses.flatMap((r) =>
        Array.isArray(r.data?.users) ? r.data.users : []
      );
      setUsers(allUsers);
    } catch (error) {
      toast.error("Failed to load users");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(activeTab);
  }, [fetchUsers, activeTab]);

  // -------------------------
  // SEARCH & FILTER
  // -------------------------
  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return users.filter((u) => {
      const userRoleNames = u.roles?.map((r) => r?.name).filter(Boolean) || [];
      const matchesRole =
        selectedRole === "all" ? true : userRoleNames.includes(selectedRole);
      const matchesSearch =
        !term ||
        (u.firstName && u.firstName.toLowerCase().includes(term)) ||
        (u.lastName && u.lastName.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        userRoleNames.some((role) => role.toLowerCase().includes(term));
      return matchesRole && matchesSearch;
    });
  }, [users, searchTerm, selectedRole]);

  const getUserRoles = (user) => {
    if (!user.roles || !Array.isArray(user.roles)) return "—";
    return user.roles
      .map((role) => role?.name)
      .filter(Boolean)
      .map((role) => role.charAt(0).toUpperCase() + role.slice(1))
      .join(", ");
  };

  // -------------------------
  // ADD / UPDATE USER
  // -------------------------
  const handleAddOrUpdateUser = async (userData) => {
    try {
      if (editingUser) {
        const resp = await api.put(`/users/update/${editingUser.id}`, userData);
        const updatedUser = resp.data?.data?.user || { id: editingUser.id, ...userData };
        setUsers((prev) =>
          prev.map((u) => (u.id === editingUser.id ? { ...u, ...updatedUser } : u))
        );
        toast.success("User updated");
        return updatedUser;
      } else {
        const resp = await api.post("/users/create", userData);
        const createdUser = resp.data?.data?.user;
        const userRecord = createdUser || {
          id: crypto.randomUUID(),
          status: "ACTIVE",
          ...userData,
        };
        setUsers((prev) => [{ ...userRecord }, ...prev]);
        toast.success("User added");
        return userRecord;
      }
    } catch (error) {
      if (error?.response?.status === 409) {
        const message = error.response?.data?.message || "Email already registered";
        const err = new Error(message);
        err.fieldErrors = { email: message };
        throw err;
      }
      toast.error("Failed to save user");
      throw error;
    }
  };

  // -------------------------
  // SUSPEND USER (Active tab)
  // -------------------------
  const handleSuspendClick = (user) => {
    if (user.id === currentUserId) {
      toast.error("You cannot suspend your own account");
      return;
    }
    setSuspendTarget(user);
    setIsSuspendModalOpen(true);
  };

  const confirmSuspend = async () => {
    if (!suspendTarget) return;
    setActionLoading(true);
    try {
      const resp = await api.patch(`/users/${suspendTarget.id}/suspend`);
      toast.success("User suspended");
      if (resp.data?.warnings) {
        toast(resp.data.warnings.message, { icon: "⚠️", duration: 6000 });
      }
      setIsSuspendModalOpen(false);
      setSuspendTarget(null);
      fetchUsers(activeTab);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to suspend user");
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------
  // REACTIVATE USER (Suspended tab)
  // -------------------------
  const handleReactivate = async (user) => {
    try {
      await api.patch(`/users/${user.id}/reactivate`);
      toast.success(`${user.firstName} ${user.lastName} reactivated`);
      fetchUsers(activeTab);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to reactivate user");
    }
  };

  // -------------------------
  // SOFT DELETE (Suspended tab → archives + marks DELETED)
  // -------------------------
  const handleDeleteClick = (user) => {
    setDeleteTarget(user);
    setIsDeleteModalOpen(true);
  };

  const confirmSoftDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await api.delete(`/users/${deleteTarget.id}/soft-delete`);
      toast.success("User archived and deleted");
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      fetchUsers(activeTab);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------
  // EXPORT USER DATA (Deleted tab)
  // -------------------------
  const handleExport = async (user) => {
    try {
      const resp = await api.get(`/users/${user.id}/export`, {
        responseType: "blob",
      });
      const blob = new Blob([resp.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `user-export-${user.email}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Data exported");
    } catch (error) {
      toast.error("Failed to export user data");
    }
  };

  // -------------------------
  // PURGE USER (Deleted tab)
  // -------------------------
  const handlePurgeClick = (user) => {
    if (user.id === currentUserId) {
      toast.error("You cannot purge your own account");
      return;
    }
    setPurgeTarget(user);
    setIsPurgeModalOpen(true);
  };

  const confirmPurge = async () => {
    if (!purgeTarget) return;
    setActionLoading(true);
    try {
      await api.delete(`/users/${purgeTarget.id}/purge`);
      toast.success("User permanently removed");
      setIsPurgeModalOpen(false);
      setPurgeTarget(null);
      fetchUsers(activeTab);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to purge user");
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // Styles
  // ============================================================
  const containerStyle = {
    width: "100%",
    minHeight: "100vh",
    padding: "40px 20px",
    background: "#f2f2f2",
    display: "flex",
    justifyContent: "center",
  };
  const cardStyle = {
    width: "100%",
    maxWidth: "1200px",
    background: "#fff",
    borderRadius: "12px",
    padding: "30px",
    boxShadow: "0 10px 20px rgba(0,0,0,0.05)",
  };
  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: "25px",
  };
  const titleStyle = { fontSize: "28px", fontWeight: "bold", margin: 0 };
  const subtitleStyle = { fontSize: "14px", color: "#555", marginTop: "5px" };
  const addBtnStyle = {
    padding: "10px 18px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  };

  const tabStyle = (isActive) => ({
    padding: "10px 20px",
    borderRadius: "8px 8px 0 0",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    backgroundColor: isActive ? "#fff" : "#e5e7eb",
    color: isActive ? "#111827" : "#6b7280",
    border: isActive ? "1px solid #ddd" : "1px solid transparent",
    borderBottom: isActive ? "1px solid #fff" : "1px solid #ddd",
    marginBottom: "-1px",
    transition: "all 0.2s",
  });

  const filterBtnStyle = (active) => ({
    padding: "8px 16px",
    borderRadius: "999px",
    fontWeight: "500",
    cursor: "pointer",
    backgroundColor: active ? "#111827" : "#f5f5f5",
    color: active ? "#fff" : "#4b5563",
    boxShadow: active ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
    border: "none",
    transition: "all 0.2s",
  });

  const searchContainerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#f5f5f5",
    padding: "8px 12px",
    borderRadius: "12px",
    border: "1px solid #ddd",
    maxWidth: "400px",
  };

  const tableContainerStyle = {
    overflowX: "auto",
    borderRadius: "12px",
    border: "1px solid #ddd",
    background: "#fff",
  };
  const tableStyle = { width: "100%", borderCollapse: "collapse" };
  const thStyle = {
    textAlign: "left",
    padding: "12px 16px",
    fontWeight: "600",
    fontSize: "13px",
    textTransform: "uppercase",
    color: "#4b5563",
    borderBottom: "1px solid #ddd",
  };
  const tdStyle = { padding: "12px 16px", fontSize: "14px", color: "#111827" };
  const statusBadgeStyle = (status) => {
    const colors = {
      ACTIVE: { bg: "#d1fae5", text: "#059669" },
      PENDING: { bg: "#fef3c7", text: "#d97706" },
      SUSPENDED: { bg: "#fef3c7", text: "#92400e" },
      DELETED: { bg: "#fee2e2", text: "#dc2626" },
    };
    const c = colors[status] || colors.ACTIVE;
    return {
      padding: "4px 10px",
      borderRadius: "999px",
      fontSize: "11px",
      fontWeight: "700",
      textTransform: "uppercase",
      backgroundColor: c.bg,
      color: c.text,
      display: "inline-block",
    };
  };
  const actionBtnStyle = {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    display: "inline-flex",
    alignItems: "center",
  };

  // ============================================================
  // Tab-specific action buttons
  // ============================================================

  const renderActiveActions = (user) => {
    const isSelf = user.id === currentUserId;
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
        <button
          style={actionBtnStyle}
          title="Edit user"
          onClick={() => {
            setEditingUser(user);
            setIsCreateModalOpen(true);
          }}
        >
          <Edit2 size={17} color="#111827" />
        </button>
        <button
          style={{ ...actionBtnStyle, opacity: isSelf ? 0.3 : 1 }}
          title={isSelf ? "Cannot suspend yourself" : "Suspend user"}
          onClick={() => handleSuspendClick(user)}
          disabled={isSelf}
        >
          <ShieldOff size={17} color="#f59e0b" />
        </button>
      </div>
    );
  };

  const renderSuspendedActions = (user) => (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
      <button
        style={actionBtnStyle}
        title="Reactivate user"
        onClick={() => handleReactivate(user)}
      >
        <RotateCcw size={17} color="#059669" />
      </button>
      <button
        style={actionBtnStyle}
        title="Archive & delete user"
        onClick={() => handleDeleteClick(user)}
      >
        <Trash2 size={17} color="#dc2626" />
      </button>
    </div>
  );

  const renderDeletedActions = (user) => (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
      <button
        style={actionBtnStyle}
        title="Download data export"
        onClick={() => handleExport(user)}
      >
        <Download size={17} color="#2563eb" />
      </button>
      <button
        style={actionBtnStyle}
        title="Permanently delete"
        onClick={() => handlePurgeClick(user)}
      >
        <Skull size={17} color="#7f1d1d" />
      </button>
    </div>
  );

  const renderActions = (user) => {
    if (activeTab === "active") return renderActiveActions(user);
    if (activeTab === "suspended") return renderSuspendedActions(user);
    if (activeTab === "deleted") return renderDeletedActions(user);
    return null;
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={containerStyle}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={cardStyle}
      >
        {/* ---- Modals ---- */}
        {isCreateModalOpen && (
          <CreateUserModal
            user={editingUser}
            onClose={() => {
              setIsCreateModalOpen(false);
              setEditingUser(null);
            }}
            onAddUser={handleAddOrUpdateUser}
          />
        )}

        <SuspendUserModal
          isOpen={isSuspendModalOpen}
          onClose={() => {
            setIsSuspendModalOpen(false);
            setSuspendTarget(null);
          }}
          onConfirm={confirmSuspend}
          user={suspendTarget}
          loading={actionLoading}
        />

        <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeleteTarget(null);
          }}
          onDelete={confirmSoftDelete}
          itemName={
            deleteTarget
              ? `${deleteTarget.firstName} ${deleteTarget.lastName}`
              : "user"
          }
          title="Archive & Delete User"
          message={
            deleteTarget ? (
              <>
                This will <strong>archive all data</strong> for{" "}
                <strong>
                  {deleteTarget.firstName} {deleteTarget.lastName}
                </strong>{" "}
                and mark the account as deleted.
                <br />
                <br />
                <span style={{ fontSize: 13, color: "#9ca3af" }}>
                  Archived data can still be exported. The user can be permanently
                  removed later from the "Deleted" tab.
                </span>
              </>
            ) : (
              ""
            )
          }
          loading={actionLoading}
          severity="danger"
          confirmText="Archive & Delete"
          confirmLoadingText="Archiving..."
        />

        <PurgeUserModal
          isOpen={isPurgeModalOpen}
          onClose={() => {
            setIsPurgeModalOpen(false);
            setPurgeTarget(null);
          }}
          onConfirm={confirmPurge}
          user={purgeTarget}
          loading={actionLoading}
          onExport={purgeTarget ? () => handleExport(purgeTarget) : undefined}
        />

        {/* ---- Main content (hidden when create/edit modal is open) ---- */}
        {!isCreateModalOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Header */}
            <div style={headerStyle}>
              <div>
                <h1 style={titleStyle}>User Management</h1>
                <p style={subtitleStyle}>
                  Manage and monitor all system users. Lifecycle: Active →
                  Suspended → Deleted → Purged.
                </p>
              </div>
              {activeTab === "active" && (
                <button
                  style={addBtnStyle}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <UserPlus size={16} /> Add New User
                </button>
              )}
            </div>

            {/* Status Tabs */}
            <div
              style={{
                display: "flex",
                gap: 0,
                borderBottom: "1px solid #ddd",
                marginBottom: "5px",
              }}
            >
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  style={tabStyle(activeTab === tab.key)}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setSelectedRole("all");
                    setSearchTerm("");
                  }}
                >
                  {tab.label}
                  {activeTab === tab.key && !loading && (
                    <span
                      style={{
                        marginLeft: 6,
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: "#e5e7eb",
                        color: "#374151",
                      }}
                    >
                      {filteredUsers.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Role Filters (only on Active tab) */}
            {activeTab === "active" && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginBottom: "5px",
                }}
              >
                <button
                  style={filterBtnStyle(selectedRole === "all")}
                  onClick={() => setSelectedRole("all")}
                >
                  All Users
                </button>
                {FIXED_ROLES.map((role) => (
                  <button
                    key={role}
                    style={filterBtnStyle(selectedRole === role)}
                    onClick={() => setSelectedRole(role)}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </button>
                ))}
              </div>
            )}

            {/* Search */}
            <div style={searchContainerStyle}>
              <Search size={16} color="#9ca3af" />
              <input
                placeholder="Search by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  fontSize: "14px",
                }}
              />
            </div>

            {/* Info banner for Suspended / Deleted tabs */}
            {activeTab === "suspended" && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  backgroundColor: "#fef3c7",
                  color: "#92400e",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <ShieldOff size={16} />
                Suspended users cannot log in. You can reactivate them or proceed
                with deletion (which archives their data first).
              </div>
            )}
            {activeTab === "deleted" && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  backgroundColor: "#fee2e2",
                  color: "#991b1b",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Skull size={16} />
                Deleted users have been archived. Export their data or permanently
                purge them from the system. Purging is{" "}
                <strong>irreversible</strong>.
              </div>
            )}

            {/* Table */}
            <div style={tableContainerStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan="5"
                        style={{ textAlign: "center", padding: "40px 0" }}
                      >
                        <Loader2
                          size={24}
                          className="animate-spin"
                          color="#dc2626"
                        />
                      </td>
                    </tr>
                  ) : filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        style={{
                          borderBottom: "1px solid #f1f1f1",
                          transition: "background 0.2s",
                          opacity:
                            user.status === "DELETED"
                              ? 0.6
                              : user.status === "SUSPENDED"
                                ? 0.8
                                : 1,
                        }}
                      >
                        <td style={tdStyle}>
                          {`${user.firstName} ${user.middleName || ""} ${user.lastName}`.trim()}
                          {user.id === currentUserId && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#2563eb",
                                backgroundColor: "#dbeafe",
                                padding: "2px 6px",
                                borderRadius: 4,
                              }}
                            >
                              YOU
                            </span>
                          )}
                        </td>
                        <td style={tdStyle}>{user.email}</td>
                        <td style={tdStyle}>{getUserRoles(user)}</td>
                        <td style={tdStyle}>
                          <span style={statusBadgeStyle(user.status)}>
                            {user.status}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          {renderActions(user)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        style={{
                          textAlign: "center",
                          padding: "30px",
                          color: "#6b7280",
                        }}
                      >
                        {activeTab === "active"
                          ? "No active users found."
                          : activeTab === "suspended"
                            ? "No suspended users."
                            : "No deleted users."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default UserManagementPage;
