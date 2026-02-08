import React, { useState, useEffect, useMemo } from "react";
import { X, Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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

  // Populate form for editing
  useEffect(() => {
    if (user) {
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

  // Validation
  const getFieldError = (name, value, role, resetPassword) => {
    if (["firstName", "lastName"].includes(name) && !value.trim())
      return `${name === "firstName" ? "First" : "Last"} name is required`;
    if (name === "email" && !/^\S+@\S+\.\S+/.test(value)) return "Invalid email format";
    if (name === "studentId" && role === "student" && !value.trim()) return "Student ID is required";
    if (name === "password" && ((!user && !value) || (user && resetPassword && !value))) return "Password is required";
    return "";
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

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

  const isFormValid = useMemo(() => {
    const required = ["firstName", "lastName", "email"];
    if (!user || formData.resetPassword) required.push("password");
    if (formData.userRole === "student") required.push("studentId");

    return required.every(f => formData[f]?.trim()) && !Object.values(errors).some(e => e);
  }, [formData, errors, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        middleName: formData.middleName.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.userRole,
        studentId: formData.userRole === "student" ? formData.studentId : "",
      };

      if (!user || formData.resetPassword) payload.password = formData.password;

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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ duration: 0.3 }}
        style={{
          width: "100%",
          height: "100%",
          background: "white",
          padding: "32px",
          overflowY: "auto",
          position: "relative"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px" }}>
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "4px" }}>
              {user ? "Edit User" : "Add New User"}
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280" }}>Update or create a new system account</p>
          </div>
          <Button onClick={onClose} disabled={loading} style={{ padding: "8px", borderRadius: "50%" }}>
            <X size={28} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Names Row */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <InputField label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} error={errors.firstName} disabled={loading} placeholder="John" />
            <InputField label="Middle Name" name="middleName" value={formData.middleName} onChange={handleChange} error={errors.middleName} disabled={loading} placeholder="Quincy" />
            <InputField label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} error={errors.lastName} disabled={loading} placeholder="Doe" />
          </div>

          {/* Email */}
          <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} disabled={loading} placeholder="john.doe@example.com" />

          {/* Role & ID */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>User Role</label>
              <select
                name="userRole"
                value={formData.userRole}
                onChange={handleChange}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "14px",
                  borderRadius: "12px",
                  border: "1px solid #d1d5db",
                  appearance: "none",
                  background: "white",
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

            <div style={{ flex: 1, position: "relative" }}>
              <InputField
                label="Student ID Number"
                name="studentId"
                value={isTeacher ? "" : formData.studentId}
                onChange={handleChange}
                error={!isTeacher ? errors.studentId : ""}
                disabled={isTeacher || loading}
                placeholder={isTeacher ? "N/A (Teacher Selected)" : "ID Number"}
                style={isTeacher ? { background: "#f3f4f6", opacity: 0.6, borderColor: "#d1d5db", cursor: "not-allowed" } : {}}
              />
              {isTeacher && <Lock size={16} style={{ position: "absolute", right: "16px", top: "42px", color: "#9ca3af" }} />}
            </div>
          </div>

          {/* Password */}
          {(!user || formData.resetPassword) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>{user ? "New Password" : "Temporary Password"}</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Enter password"
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "14px",
                    borderRadius: "12px",
                    border: errors.password ? "1px solid #ef4444" : "1px solid #d1d5db",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#6b7280",
                  }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <p style={{ color: "#ef4444", fontSize: "12px" }}>{errors.password}</p>}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px", marginTop: "24px", flexWrap: "wrap" }}>
            <Button type="button" onClick={onClose} disabled={loading}>Go Back</Button>
            <Button type="submit" style={{ background: "#dc2626", color: "white", padding: "12px 24px" }} disabled={loading || !isFormValid}>
              {loading ? "Saving..." : (user ? "Save Changes" : "Register User")}
            </Button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
};

const InputField = ({ label, error, style = {}, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
    <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>{label}</label>
    <input
      {...props}
      maxLength={props.name === "studentId" ? 12 : 30}
      style={{
        width: "100%",
        padding: "12px",
        fontSize: "14px",
        borderRadius: "12px",
        border: error ? "1px solid #ef4444" : "1px solid #d1d5db",
        outline: "none",
        ...style
      }}
    />
    {error && <p style={{ color: "#ef4444", fontSize: "12px" }}>{error}</p>}
  </div>
);

export default CreateUserModal;
