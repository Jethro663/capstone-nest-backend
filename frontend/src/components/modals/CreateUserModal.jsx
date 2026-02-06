import React, { useState, useEffect, useMemo } from "react";
import { X, Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CreateUserModal = ({ user, onClose, onAddUser }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    userRole: "student",
    studentId: "",
    password: "",
    resetPassword: false,
  });

  // 1. POPULATE FORM (For Editing)
  useEffect(() => {
    if (user) {
      const names = user.fullName?.split(" ") || [];
      setFormData({
        firstName: user.firstName || "",
        middleName: user.middleName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        userRole: user.role || "student",
        studentId: user.studentId || "",
        password: "",
        resetPassword: false,
      });
    }
  }, [user]);

  // 2. VALIDATION LOGIC
  const getFieldError = (name, value, role, resetPassword) => {
    if (["firstName", "lastName"].includes(name) && !value.trim()) return `${name === "firstName" ? "First" : "Last"} name is required`;
    if (name === "email" && !/^\S+@\S+\.\S+/.test(value)) return "Invalid email format";
    if (name === "studentId" && role === "student" && !value.trim()) return "Student ID is required";
    if (name === "password" && ((!user && !value) || (user && resetPassword && !value))) return "Password is required";
    return "";
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Input Masking (Letters for names, Numbers for ID)
    if (["firstName", "middleName", "lastName"].includes(name) && value && !/^[a-zA-Z\s]*$/.test(value)) return;
    if (name === "studentId" && value && !/^[0-9]*$/.test(value)) return;

    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => {
      const nextData = { ...prev, [name]: newValue };
      setErrors((prevErrs) => ({
        ...prevErrs,
        [name]: getFieldError(name, newValue, nextData.userRole, nextData.resetPassword)
      }));
      return nextData;
    });
  };

  // 3. FORM SUBMISSION READY CHECK
  const isFormValid = useMemo(() => {
    const required = ["firstName", "lastName", "email"];
    if (!user || formData.resetPassword) required.push("password");
    if (formData.userRole === "student") required.push("studentId");

    return required.every(f => formData[f]?.trim()) && !Object.values(errors).some(e => e);
  }, [formData, errors, user]);

  // 4. BACKEND SUBMISSION
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // BACKEND NOTE: Normalize data before sending to API
      const fullName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(" ");
      
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        middleName: formData.middleName.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.userRole,
        studentId: formData.userRole === "student" ? formData.studentId : "",
       
      };

      // Include password for new registrations or when resetting password during edit
      if (!user || formData.resetPassword) payload.password = formData.password;

      /** * BACKEND INTEGRATION:
       * await fetch('/your-api/users', { 
       * method: user ? 'PUT' : 'POST', 
       * body: JSON.stringify(payload) 
       * });
       */
      await onAddUser(payload);

      toast.success(user ? "User updated successfully" : "User registered successfully");
      onClose();
    } catch (error) {
      toast.error("An error occurred while saving the user.");
    } finally {
      setLoading(false);
    }
  };

  const isTeacher = formData.userRole === "teacher";

  return (
    <div className="w-full h-full bg-white animate-in fade-in slide-in-from-right-5 duration-300 p-8 lg:p-12 overflow-y-auto">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{user ? "Edit User" : "Add New User"}</h2>
          <p className="text-gray-500 mt-1">Update or create a new system account</p>
        </div>
        <Button onClick={onClose} variant="ghost" className="p-2 rounded-full" disabled={loading}>
          <X size={28} />
        </Button>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Names Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InputField label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} error={errors.firstName} disabled={loading} placeholder="John" />
          <InputField label="Middle Name" name="middleName" value={formData.middleName} onChange={handleChange} error={errors.middleName} disabled={loading} placeholder="Quincy" />
          <InputField label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} error={errors.lastName} disabled={loading} placeholder="Doe" />
        </div>

        {/* Email */}
        <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} disabled={loading} placeholder="john.doe@example.com" />

        {/* Role & ID Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-800 uppercase tracking-wide">User Role</label>
            <select
              name="userRole"
              value={formData.userRole}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-3 text-base rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white transition-all appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 1rem center",
                backgroundSize: "1.2em",
              }}
            >
              <option value="student">student</option>
              <option value="teacher">teacher</option>
            </select>
          </div>
          
          <div className="relative">
            <InputField 
              label="Student ID Number" 
              name="studentId" 
              value={isTeacher ? "" : formData.studentId} 
              onChange={handleChange} 
              error={!isTeacher ? errors.studentId : ''} 
              disabled={isTeacher || loading} 
              placeholder={isTeacher ? "N/A (Teacher Selected)" : "ID Number"}
              className={isTeacher ? "bg-gray-100 opacity-60 cursor-not-allowed border-gray-300" : ""}
            />
            {isTeacher && <Lock size={16} className="absolute right-4 top-[50px] text-gray-400" />}
          </div>
        </div>

        {/* Reset Password Toggle (only for editing) */}
        {user && (
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-800 uppercase tracking-wide">Password Reset</label>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-800">Reset User Password</span>
                <span className="text-xs text-slate-600 mt-1">Enable this to set a new password for the user</span>
              </div>
              <button
                type="button"
                onClick={() => handleChange({ target: { name: 'resetPassword', type: 'checkbox', checked: !formData.resetPassword } })}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  formData.resetPassword ? 'bg-red-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.resetPassword ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Password */}
        {(!user || formData.resetPassword) && (
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-800 uppercase tracking-wide">{user ? "New Password" : "Temporary Password"}</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                placeholder="Enter password"
                className={`w-full px-4 py-3 text-base rounded-xl border ${errors.password ? 'border-red-500' : 'border-gray-200'} focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all placeholder:text-gray-300`}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 transition-colors">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs font-medium mt-1">{errors.password}</p>}
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-4 mt-6">
          <Button type="button" onClick={onClose} variant="outline" disabled={loading}>Go Back</Button>
          <Button type="submit" variant="destructive" className="text-white px-6 py-3 min-w-[160px] text-center" disabled={loading || !isFormValid}>
            {loading ? "Saving..." : (user ? "Save Changes" : "Register User")}
          </Button>
        </div>
      </form>
    </div>
  );
};

const InputField = ({ label, error, className = "", ...props }) => (
  <div className="space-y-2 flex-1">
    <label className="block text-sm font-bold text-slate-800 uppercase tracking-wide">{label}</label>
    <input
      {...props}
      maxLength={props.name === "studentId" ? 12 : 30}
      className={`w-full px-4 py-3 text-base rounded-xl border ${error ? 'border-red-500' : 'border-gray-200'} focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all placeholder:text-gray-300 disabled:bg-gray-50 disabled:text-gray-400 ${className}`}
    />
    {error && <p className="text-red-500 text-xs font-medium mt-1">{error}</p>}
  </div>
);

export default CreateUserModal;