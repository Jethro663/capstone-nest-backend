
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "react-hot-toast";
import { UserPlus, Trash2, UserCheck, UserX, Search, Loader2, Edit2 } from "lucide-react";
import api from "../../services/api"; // BACKEND NOTE: Adjust the import based on your API utility
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CreateUserModal from "@/components/modals/CreateUserModal";

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

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
        { _id: "1", fullName: "John Doe", email: "john@example.com", role: "student", status: "active" },
        { _id: "2", fullName: "Jane Smith", email: "jane@example.com", role: "teacher", status: "inactive" },
      ];
      setUsers(Array.isArray(response.data?.users) ? response.data.users : mockData);
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // -------------------------
  // 2. STATUS TOGGLE
  // -------------------------
  const handleStatusChange = async (userId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      // BACKEND NOTE: Replace with PATCH request
      // await api.patch(`/users/${userId}`, { status: newStatus });
      
      setUsers(prev => prev.map(u => 
        u._id === userId ? { ...u, status: newStatus } : u
      ));
      toast.success("User status updated");
    } catch (error) {
      toast.error("Update failed");
    }
  };

  // -------------------------
  // 3. DELETE USER
  // -------------------------
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      // BACKEND NOTE: Replace with DELETE request
      // await api.delete(`/users/${userId}`);
      
      setUsers(prev => prev.filter(u => u._id !== userId));
      toast.success("User deleted");
    } catch (error) {
      toast.error("Deletion failed");
    }
  };

  // -------------------------
  // 4. ADD OR UPDATE HANDLER
  // -------------------------
  const handleAddOrUpdateUser = async (userData) => {
    try {
      if (editingUser) {
        // BACKEND NOTE: Replace with PUT request
        // await api.put(`/users/${editingUser._id}`, userData);
        await api.put(`/users/update/${editingUser.id}`, userData);
        setUsers(prev => prev.map(u => (u._id === editingUser._id ? { ...u, ...userData } : u)));
        toast.success("User updated");
      } else {
        // BACKEND NOTE: Replace with POST request
        // const res = await api.post("/users", userData);
        // setUsers(prev => [res.data, ...prev]);

        const res = await api.post("/users/create", userData);
        console.log(res);
        setUsers(prev => [{ _id: crypto.randomUUID(), status: "active", ...userData }, ...prev]);
        toast.success("User added");
      }
      setIsModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      toast.error("Failed to save user");
    }
  };

  // -------------------------
  // 5. SEARCH LOGIC
  // -------------------------
  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return users.filter(
      u =>
        (u.fullName && u.fullName.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.role && u.role.toLowerCase().includes(term))
    );
  }, [users, searchTerm]);

  return (
    <div className="flex-1 w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 md:p-12">
      {/* Modal Overlay */}
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

      {/* Main Table View */}
      {!isModalOpen && (
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
                    <tr key={user._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{`${user.firstName} ${(user.middleName) ? user.middleName : ""} ${user.lastName}`}</td>
                      <td className="px-6 py-4 text-slate-500">{user.email}</td>
                      <td className="px-6 py-4 capitalize text-slate-600">{}</td>
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
                          <button onClick={() => handleStatusChange(user._id, user.status)} title="Toggle Status">
                            {user.status === "ACTIVE" ? (
                              <UserX size={18} className="text-orange-400" />
                            ) : (
                              <UserCheck size={18} className="text-green-500" />
                            )}
                          </button>
                          <button onClick={() => { setEditingUser(user); setIsModalOpen(true); }} title="Edit User">
                            <Edit2 size={18} className="text-slate-900" />
                          </button>
                          <button onClick={() => handleDeleteUser(user._id)} title="Delete User">
                            <Trash2 size={18} className="text-slate-900" />
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