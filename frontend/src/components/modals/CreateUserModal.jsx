import React, { useState, useEffect, useMemo } from "react";
import { X, Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ApiErrorModal from "@/components/modals/ApiErrorModal";
import api from "@/services/api";

const CreateUserModal = ({ user, onClose, onAddUser }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    userRole: "student",
    studentId: "",
    gradeLevel: "",
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
        gradeLevel: (user.profile && user.profile.gradeLevel) || user.gradeLevel || "",
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
    if (name === "gradeLevel" && role === "student" && !value) return "Grade level is required";
    if (name === "password" && ((!user && !value) || (user && resetPassword && !value))) return "Password is required";
    return "";
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (["firstName", "middleName", "lastName"].includes(name) && value && !/^[a-zA-Z\s]*$/.test(value)) return;
    if (name === "studentId" && value && !/^[0-9]*$/.test(value)) return;
    if (name === "gradeLevel" && value && !['7','8','9','10'].includes(value)) return;

    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => {
      // if role changed away from 'student', clear student-only fields
      let nextData = { ...prev };
      if (name === 'userRole') {
        nextData = { ...nextData, userRole: newValue };
        if (newValue !== 'student') {
          nextData.studentId = '';
          nextData.gradeLevel = '';
        }
      } else {
        nextData = { ...nextData, [name]: newValue };
      }

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
    if (formData.userRole === "student") {
      required.push("studentId");
      required.push("gradeLevel");
    }

    return required.every(f => formData[f]?.trim()) && !Object.values(errors).some(e => e);
  }, [formData, errors, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // clear any previous server-side field errors before submit
    setErrors({});
    setApiError(null);

    try {
      // Build user payload WITHOUT gradeLevel (profile must be created separately)
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        middleName: formData.middleName.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.userRole,
        studentId: formData.userRole === "student" ? formData.studentId : "",
      };

      if (!user || formData.resetPassword) payload.password = formData.password;

      // Create or update user and expect the service to return the user record
      const savedUser = await onAddUser(payload);

      // If this is a student, create/update their profile in a second request
      if (formData.userRole === 'student') {
        // Ensure we have a saved user id to attach the profile
        if (!savedUser || !savedUser.id) {
          console.warn('Skipping profile creation - missing user id');
        } else {
          try {
            // Collect profile fields we support
            const profilePayload = {
              userId: savedUser.id,
              gradeLevel: formData.gradeLevel || undefined,
              dob: formData.dob || undefined,
              gender: formData.gender || undefined,
              phone: formData.phone || undefined,
              address: formData.address || undefined,
              familyName: formData.familyName || undefined,
              familyRelationship: formData.familyRelationship || undefined,
              familyContact: formData.familyContact || undefined,
            };

            // Use create endpoint for new users; update for existing
            if (!user) {
              await api.post('/profiles/create', profilePayload);
            } else {
              await api.put(`/profiles/update/${savedUser.id}`, profilePayload);
            }
          } catch (profileErr) {
            // Profile creation failed - surface a user-friendly message but do not delete the created user
            console.error('Profile creation/update failed', profileErr);
            toast.error('User created but failed to create student profile');
            const message = profileErr?.response?.data?.message || profileErr.message;
            setApiError({ title: 'Profile Error', message, source: 'profiles' });
          }
        }
      }

      toast.success(user ? "User updated successfully" : "User registered successfully");
      setApiError(null);
      onClose();
      return savedUser;
    } catch (error) {
      // Surface field-specific errors returned from the server (e.g., duplicate email)
      if (error?.fieldErrors) {
        setErrors(prev => ({ ...prev, ...error.fieldErrors }));
      } else if (error?.response) {
        const resp = error.response;
        if (resp.status === 409) {
          const message = resp.data?.message || "Email already registered";
          setErrors(prev => ({ ...prev, email: message }));
        } else {
          const apiErr = {
            title: resp.data?.title || `Error ${resp.status}`,
            message: resp.data?.message || resp.statusText || "An unexpected error occurred",
            source: resp.config?.url || "server",
            code: resp.status,
            field: resp.data?.field,
            requestId: resp.headers?.["x-request-id"] || resp.data?.requestId,
          };
          setApiError(apiErr);
        }
      } else {
        setApiError({ title: "Error", message: error.message || "An unexpected error occurred", source: "client" });
      }
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
        <ApiErrorModal isOpen={!!apiError} error={apiError} onClose={() => setApiError(null)} />
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px" }}>
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "4px" }}>
              {user ? "Edit User" : "Add New User"}
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280" }}>Update or create a new system account</p>
          </div>
          <Button onClick={() => { setApiError(null); setErrors({}); setLoading(false); onClose(); }} disabled={loading} style={{ padding: "8px", borderRadius: "50%" }}>
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

            {/* Grade Level - visible only for students */}
            <div style={{ width: "180px" }}>
              <AnimatePresence>
                {formData.userRole === 'student' && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                    layout
                  >
                    <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Grade Level</label>
                    <select
                      name="gradeLevel"
                      value={formData.gradeLevel}
                      onChange={handleChange}
                      disabled={loading}
                      style={{
                        width: "100%",
                        padding: "12px",
                        fontSize: "14px",
                        borderRadius: "12px",
                        border: errors.gradeLevel ? "1px solid #ef4444" : "1px solid #d1d5db",
                        appearance: "none",
                        background: "white",
                      }}
                    >
                      <option value="">Select grade</option>
                      <option value="7">7</option>
                      <option value="8">8</option>
                      <option value="9">9</option>
                      <option value="10">10</option>
                    </select>
                    {errors.gradeLevel && <p style={{ color: "#ef4444", fontSize: "12px" }}>{errors.gradeLevel}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
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
            <Button type="button" onClick={() => { setApiError(null); setErrors({}); setLoading(false); onClose(); }} disabled={loading}>Go Back</Button>
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
