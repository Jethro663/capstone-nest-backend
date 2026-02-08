import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "react-hot-toast";
import { UserPlus, Trash2, Search, Loader2, Edit2 } from "lucide-react";
import { motion } from "framer-motion";
import api from "../../services/api";
import CreateUserModal from "@/components/modals/CreateUserModal";
import DeleteModal from "@/components/modals/DeleteModal";

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [availableRoles, setAvailableRoles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // -------------------------
  // 1. FETCH USERS
  // -------------------------
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/users/all");

      const mockData = [
        { id: "1", firstName: "John", lastName: "Doe", email: "john@example.com", roles: [{ name: "student" }], status: "ACTIVE" },
        { id: "2", firstName: "Jane", lastName: "Smith", email: "jane@example.com", roles: [{ name: "teacher" }], status: "ACTIVE" },
      ];

      const userData = Array.isArray(response.data?.users) ? response.data.users : mockData;
      setUsers(userData);

      const rolesSet = new Set();
      userData.forEach(user => {
        if (user.roles && Array.isArray(user.roles)) {
          user.roles.forEach(role => { if (role?.name) rolesSet.add(role.name); });
        }
      });

      setAvailableRoles(Array.from(rolesSet).sort());
    } catch (error) {
      toast.error("Failed to load users");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // -------------------------
  // DELETE USER
  // -------------------------
  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setUsers(prev => prev.map(u => u.id === userToDelete.id ? { ...u, status: "INACTIVE" } : u));
      toast.success("User deactivated");
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      toast.error("Deactivation failed");
    }
  };

  // -------------------------
  // ADD OR UPDATE USER
  // -------------------------
  const handleAddOrUpdateUser = async (userData) => {
    try {
      if (editingUser) {
        const resp = await api.put(`/users/update/${editingUser.id}`, userData);
        const updatedUser = resp.data?.data?.user || { id: editingUser.id, ...userData };
        setUsers(prev => prev.map(u => (u.id === editingUser.id ? { ...u, ...updatedUser } : u)));
        toast.success("User updated");
        return updatedUser;
      } else {
        const resp = await api.post("/users/create", userData);
        const createdUser = resp.data?.data?.user;
        // if API didn't return a user object, fall back to a minimal local representation
        const userRecord = createdUser || { id: crypto.randomUUID(), status: "ACTIVE", ...userData };
        setUsers(prev => [{ ...userRecord }, ...prev]);
        toast.success("User added");
        return userRecord;
      }
    } catch (error) {
      // If the server responds with a conflict (duplicate email), forward a structured error
      if (error?.response?.status === 409) {
        const message = error.response?.data?.message || "Email already registered";
        const err = new Error(message);
        err.fieldErrors = { email: message };
        throw err;
      }
      toast.error("Failed to save user");
      // rethrow so callers (like the modal) can handle specifics if needed
      throw error;
    }
  };

  // -------------------------
  // SEARCH & FILTER
  // -------------------------
  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return users.filter(u => {
      const userRoleNames = u.roles?.map(role => role?.name).filter(Boolean) || [];
      const matchesRole = selectedRole === "all" ? true : userRoleNames.includes(selectedRole);
      const matchesSearch =
        (u.firstName && u.firstName.toLowerCase().includes(term)) ||
        (u.lastName && u.lastName.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        userRoleNames.some(role => role.toLowerCase().includes(term));
      return matchesRole && matchesSearch;
    });
  }, [users, searchTerm, selectedRole]);

  const getUserRoles = (user) => {
    if (!user.roles || !Array.isArray(user.roles)) return "—";
    return user.roles
      .map(role => role?.name)
      .filter(Boolean)
      .map(role => role.charAt(0).toUpperCase() + role.slice(1))
      .join(", ");
  };

  // -------------------------
  // Inline Styles
  // -------------------------
  const containerStyle = { width: "100%", minHeight: "100vh", padding: "40px 20px", background: "#f2f2f2", display: "flex", justifyContent: "center" };
  const cardStyle = { width: "100%", maxWidth: "1200px", background: "#fff", borderRadius: "12px", padding: "30px", boxShadow: "0 10px 20px rgba(0,0,0,0.05)" };
  const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", marginBottom: "25px" };
  const titleStyle = { fontSize: "28px", fontWeight: "bold", margin: 0 };
  const subtitleStyle = { fontSize: "14px", color: "#555", marginTop: "5px" };
  const buttonStyle = { padding: "10px 18px", display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };
  const filterBtnStyle = (active) => ({
    padding: "8px 16px",
    borderRadius: "999px",
    fontWeight: "500",
    cursor: "pointer",
    backgroundColor: active ? "#111827" : "#f5f5f5",
    color: active ? "#fff" : "#4b5563",
    boxShadow: active ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
    transition: "all 0.2s"
  });
  const searchContainerStyle = { display: "flex", alignItems: "center", gap: "8px", background: "#f5f5f5", padding: "8px 12px", borderRadius: "12px", border: "1px solid #ddd", maxWidth: "400px" };
  const tableContainerStyle = { overflowX: "auto", borderRadius: "12px", border: "1px solid #ddd", background: "#fff" };
  const tableStyle = { width: "100%", borderCollapse: "collapse" };
  const thStyle = { textAlign: "left", padding: "12px 16px", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", color: "#4b5563", borderBottom: "1px solid #ddd" };
  const tdStyle = { padding: "12px 16px", fontSize: "14px", color: "#111827" };
  const statusBadgeStyle = (status) => ({
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    backgroundColor: status === "ACTIVE" ? "#d1fae5" : "#fee2e2",
    color: status === "ACTIVE" ? "#059669" : "#dc2626",
    display: "inline-block"
  });
  const actionBtnStyle = { border: "none", background: "transparent", cursor: "pointer" };

  // -------------------------
  // FIXED ROLE BUTTONS
  // -------------------------
  const fixedRoles = ["student", "teacher", "admin"];

  return (
    <div style={containerStyle}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={cardStyle}>
        {/* Modals */}
        {isModalOpen && <CreateUserModal user={editingUser} onClose={() => { setIsModalOpen(false); setEditingUser(null); }} onAddUser={handleAddOrUpdateUser} />}
        <DeleteModal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }} onDelete={confirmDelete} itemName={userToDelete ? `${userToDelete.firstName} ${userToDelete.lastName}` : "user"} title="Deactivate User" message={userToDelete ? `Are you sure you want to deactivate ${userToDelete.firstName} ${userToDelete.lastName}?` : ""} />

        {!isModalOpen && !isDeleteModalOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Header */}
            <div style={headerStyle}>
              <div>
                <h1 style={titleStyle}>User Management</h1>
                <p style={subtitleStyle}>Manage and monitor all system users.</p>
              </div>
              <button style={buttonStyle} onClick={() => setIsModalOpen(true)}>
                <UserPlus size={16} /> Add New User
              </button>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "15px" }}>
              <button style={filterBtnStyle(selectedRole === "all")} onClick={() => setSelectedRole("all")}>All Users</button>
              {/* Fixed role buttons */}
              {fixedRoles.map(role => (
                <button key={role} style={filterBtnStyle(selectedRole === role)} onClick={() => setSelectedRole(role)}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
              {/* Dynamic roles from API */}
             
            </div>

            {/* Search */}
            <div style={searchContainerStyle}>
              <Search size={16} color="#9ca3af" />
              <input placeholder="Search by name, email, or role..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: "14px" }} />
            </div>

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
                      <td colSpan="5" style={{ textAlign: "center", padding: "40px 0" }}>
                        <Loader2 size={24} className="animate-spin" color="#dc2626" />
                      </td>
                    </tr>
                  ) : filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                      <tr key={user.id} style={{ borderBottom: "1px solid #f1f1f1", transition: "background 0.2s" }}>
                        <td style={tdStyle}>{`${user.firstName} ${user.middleName ? user.middleName : ""} ${user.lastName}`}</td>
                        <td style={tdStyle}>{user.email}</td>
                        <td style={tdStyle}>{getUserRoles(user)}</td>
                        <td style={tdStyle}><span style={statusBadgeStyle(user.status)}>{user.status}</span></td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button style={actionBtnStyle} onClick={() => { setEditingUser(user); setIsModalOpen(true); }}>
                              <Edit2 size={18} color="#111827" />
                            </button>
                            <button style={actionBtnStyle} onClick={() => handleDeleteUser(user)} disabled={user.status === "INACTIVE"}>
                              <Trash2 size={18} color={user.status === "INACTIVE" ? "#d1d5db" : "#111827"} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "30px", color: "#6b7280" }}>No users found.</td>
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
