
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "react-hot-toast";
import { UserPlus, Trash2, Search, Loader2, Edit2 } from "lucide-react";
import api from "../../services/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
      // BACKEND NOTE: Replace with your GET request
      // const response = await api.get("/users");
      // setUsers(response.data);

      const response = await api.get("/users/all")
      console.log(response);

      const mockData = [
        { id: "1", firstName: "John", lastName: "Doe", email: "john@example.com", roles: [{ name: "student" }], status: "ACTIVE" },
        { id: "2", firstName: "Jane", lastName: "Smith", email: "jane@example.com", roles: [{ name: "teacher" }], status: "ACTIVE" },
      ];
      
      const userData = Array.isArray(response.data?.users) ? response.data.users : mockData;
      setUsers(userData);

      // Extract unique roles from roles array
      const rolesSet = new Set();
      userData.forEach(user => {
        if (user.roles && Array.isArray(user.roles)) {
          user.roles.forEach(role => {
            if (role?.name) {
              rolesSet.add(role.name);
            }
          });
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
  // 2. DELETE USER
  // -------------------------
  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      // BACKEND NOTE: Replace with PATCH request
      // await api.patch(`/users/${userToDelete.id}`, { status: "INACTIVE" });
      
      setUsers(prev => prev.map(u => 
        u.id === userToDelete.id ? { ...u, status: "INACTIVE" } : u
      ));
      toast.success("User deactivated");
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      toast.error("Deactivation failed");
    }
  };

  // -------------------------
  // 4. ADD OR UPDATE HANDLER
  // -------------------------
  const handleAddOrUpdateUser = async (userData) => {
    try {
      if (editingUser) {
        // BACKEND NOTE: Replace with PUT request
        // await api.put(`/users/${editingUser.id}`, userData);
        await api.put(`/users/update/${editingUser.id}`, userData);
        setUsers(prev => prev.map(u => (u.id === editingUser.id ? { ...u, ...userData } : u)));
        toast.success("User updated");
      } else {
        // BACKEND NOTE: Replace with POST request
        // const res = await api.post("/users", userData);
        // setUsers(prev => [res.data, ...prev]);

        const res = await api.post("/users/create", userData);
        console.log(res);
        setUsers(prev => [{ id: crypto.randomUUID(), status: "ACTIVE", ...userData }, ...prev]);
        toast.success("User added");
      }
      setIsModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      toast.error("Failed to save user");
    }
  };

  // -------------------------
  // 5. SEARCH & ROLE FILTER LOGIC
  // -------------------------
  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return users.filter(u => {
      // Filter by role
      const userRoleNames = u.roles?.map(role => role?.name).filter(Boolean) || [];
      const matchesRole = selectedRole === "all" ? true : userRoleNames.includes(selectedRole);

      // Filter by search term
      const matchesSearch =
        (u.firstName && u.firstName.toLowerCase().includes(term)) ||
        (u.lastName && u.lastName.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        userRoleNames.some(role => role.toLowerCase().includes(term));

      return matchesRole && matchesSearch;
    });
  }, [users, searchTerm, selectedRole]);

  // Helper function to get user's roles as comma-separated string
  const getUserRoles = (user) => {
    if (!user.roles || !Array.isArray(user.roles)) {
      return "—";
    }
    return user.roles
      .map(role => role?.name)
      .filter(Boolean)
      .map(role => role.charAt(0).toUpperCase() + role.slice(1))
      .join(", ");
  };

  return (
    <div className="flex-1 w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 md:p-12">
      {/* Create/Edit User Modal */}
      {isModalOpen && (
        <div className="animate-in fade-in slide-in-from-right-5 duration-300">
          <CreateUserModal
            user={editingUser}
            onClose={() => {
              setIsModalOpen(false);
              setEditingUser(null);
            }}
            onAddUser={handleAddOrUpdateUser}
          />
        </div>
      )}

      {/* Delete User Modal */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setUserToDelete(null);
        }}
        onDelete={confirmDelete}
        itemName={userToDelete ? `${userToDelete.firstName} ${userToDelete.lastName}` : "user"}
        title="Deactivate User"
        message={userToDelete ? `Are you sure you want to deactivate ${userToDelete.firstName} ${userToDelete.lastName}? This user will no longer be able to access the system.` : ""}
      />

      {/* Main Table View */}
      {!isModalOpen && !isDeleteModalOpen && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
              <p className="text-slate-500">Manage and monitor all system users.</p>
            </div>

            <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add New User
            </Button>
          </div>

          {/* Role Filter Buttons */}
          <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-100">
            <button
              onClick={() => setSelectedRole("all")}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                selectedRole === "all"
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-gray-50 text-slate-600 hover:bg-gray-100"
              }`}
            >
              All Users
            </button>
            {availableRoles.map(role => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-4 py-2 rounded-full font-medium transition-all capitalize ${
                  selectedRole === role
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-gray-50 text-slate-600 hover:bg-gray-100"
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-1 rounded-xl border border-gray-100 shadow-sm max-w-2xl">
            <Search className="h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by name, email, or role..."
              className="border-0 bg-transparent focus-visible:ring-0 shadow-none text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 border-b border-gray-100 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-20 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-red-600" />
                    </td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{`${user.firstName} ${(user.middleName) ? user.middleName : ""} ${user.lastName}`}</td>
                      <td className="px-6 py-4 text-slate-500">{user.email}</td>
                      <td className="px-6 py-4 capitalize text-slate-600">{getUserRoles(user)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight ${
                            user.status === "ACTIVE" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => { setEditingUser(user); setIsModalOpen(true); }} title="Edit User">
                            <Edit2 size={18} className="text-slate-900" />
                          </button>
                          <button onClick={() => handleDeleteUser(user)} title="Deactivate User" disabled={user.status === "INACTIVE"}>
                            <Trash2 size={18} className={user.status === "INACTIVE" ? "text-gray-300" : "text-slate-900"} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;