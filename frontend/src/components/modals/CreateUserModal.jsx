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

  // Validation functions
  const validateField = (name, value) => {
    switch (name) {
      case "firstName":
      case "lastName":
        if (!value.trim()) return `${name === "firstName" ? "First" : "Last"} name is required`;
        if (/[0-9]/.test(value)) return "Numbers are not allowed";
        if (/[^a-zA-Z\s]/.test(value)) return "Special characters are not allowed";
        return "";
      case "middleName":
        if (value) {
          if (/[0-9]/.test(value)) return "Numbers are not allowed";
          if (/[^a-zA-Z\s]/.test(value)) return "Special characters are not allowed";
        }
        return "";
      case "email":
        if (!value.trim()) return "Email is required";
        if (!/^\S+@\S+\.\S+$/.test(value)) return "Invalid email format";
        return "";
      case "studentId":
        if (formData.userRole === "student" && !value.trim()) return "Student ID is required";
        return "";
      case "gradeLevel":
        if (formData.userRole === "student" && !value) return "Grade level is required";
        return "";
      case "password":
        // Password only required for existing users when resetting password
        if (user && formData.resetPassword && !value) return "Password is required";
        return "";
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => {
      let nextData = { ...prev };
      if (name === "userRole") {
        nextData.userRole = newValue;
        if (newValue !== "student") {
          nextData.studentId = "";
          nextData.gradeLevel = "";
        }
      } else {
        nextData[name] = newValue;
      }

      setErrors((prevErrs) => ({
        ...prevErrs,
        [name]: validateField(name, newValue),
      }));
      return nextData;
    });
  };

  // Password strength checks
  const passwordChecks = useMemo(() => {
    const val = formData.password;
    return {
      hasNumber: /\d/.test(val),
      hasLower: /[a-z]/.test(val),
      hasUpper: /[A-Z]/.test(val),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(val),
    };
  }, [formData.password]);

  const isFormValid = useMemo(() => {
    const requiredFields = ["firstName", "lastName", "email"];
    // Password only required for editing when resetting
    if (user && formData.resetPassword) requiredFields.push("password");
    if (formData.userRole === "student") requiredFields.push("studentId", "gradeLevel");

    return requiredFields.every((f) => formData[f]?.trim()) &&
      !Object.values(errors).some((e) => e) &&
      (!(user && formData.resetPassword) || Object.values(passwordChecks).every(Boolean));
  }, [formData, errors, user, passwordChecks]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setApiError(null);

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        middleName: formData.middleName.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.userRole,
        lrn: formData.userRole === "student" ? formData.studentId : undefined,
      };
      // Only include password for existing users when resetting
      if (user && formData.resetPassword) {
        payload.password = formData.password;
      }

      const savedUser = await onAddUser(payload);

      if (formData.userRole === "student") {
        if (savedUser?.id) {
          try {
            const profilePayload = {
              userId: savedUser.id,
              gradeLevel: formData.gradeLevel || undefined,
            };
            await api.put(`/profiles/update/${savedUser.id}`, profilePayload);
          } catch (profileErr) {
            console.error("Profile creation/update failed", profileErr);
            toast.error("User created but failed to create student profile");
            setApiError({ title: "Profile Error", message: profileErr.message, source: "profiles" });
          }
        }
      }

      toast.success(
        user
          ? "User updated successfully"
          : "User created. Verification email sent for OTP password setup."
      );
      setApiError(null);
      onClose();
      return savedUser;
    } catch (error) {
      if (error?.fieldErrors) setErrors((prev) => ({ ...prev, ...error.fieldErrors }));
      else setApiError({ title: "Error", message: error.message || "Unexpected error", source: "client" });
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
        style={{ width: "100%", height: "100%", background: "white", padding: "32px", overflowY: "auto", position: "relative" }}
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
              <select name="userRole" value={formData.userRole} onChange={handleChange} disabled={loading} style={{ width: "100%", padding: "12px", fontSize: "14px", borderRadius: "12px", border: "1px solid #d1d5db", appearance: "none", background: "white" }}>
                <option value="student">student</option>
                <option value="teacher">teacher</option>
              </select>
            </div>

            <div style={{ flex: 1, position: "relative" }}>
              <InputField label="Student ID Number" name="studentId" value={isTeacher ? "" : formData.studentId} onChange={handleChange} error={!isTeacher ? errors.studentId : ""} disabled={isTeacher || loading} placeholder={isTeacher ? "N/A (Teacher Selected)" : "ID Number"} style={isTeacher ? { background: "#f3f4f6", opacity: 0.6, borderColor: "#d1d5db", cursor: "not-allowed" } : {}} />
              {isTeacher && <Lock size={16} style={{ position: "absolute", right: "16px", top: "42px", color: "#9ca3af" }} />}
            </div>

            {/* Grade Level */}
            {formData.userRole === "student" && (
              <div style={{ width: "180px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Grade Level</label>
                <select name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} disabled={loading} style={{ width: "100%", padding: "12px", fontSize: "14px", borderRadius: "12px", border: errors.gradeLevel ? "1px solid #ef4444" : "1px solid #d1d5db", appearance: "none", background: "white" }}>
                  <option value="">Select grade</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                  <option value="9">9</option>
                  <option value="10">10</option>
                </select>
                {errors.gradeLevel && <p style={{ color: "#ef4444", fontSize: "12px" }}>{errors.gradeLevel}</p>}
              </div>
            )}
          </div>

          {/* Password - Different UI for new vs editing users */}
          {!user ? (
            <div style={{ padding: "12px", background: "#eff6ff", borderRadius: "8px", borderLeft: "4px solid #2563eb" }}>
              <p style={{ margin: "0 0 4px 0", fontSize: "12px", fontWeight: "600", color: "#1e40af" }}>
                OTP onboarding enabled
              </p>
              <p style={{ margin: "0", fontSize: "12px", color: "#1d4ed8" }}>
                The user will verify email via OTP and set their initial password securely.
              </p>
            </div>
          ) : (
            <>
              {formData.resetPassword && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>New Password</label>
                  <div style={{ position: "relative" }}>
                    <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} disabled={loading} placeholder="Enter new password" style={{ width: "100%", padding: "12px", fontSize: "14px", borderRadius: "12px", border: errors.password ? "1px solid #ef4444" : "1px solid #d1d5db", outline: "none" }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }}>
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  {/* Password rules */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                    <PasswordRule label="Contains at least 1 number" valid={passwordChecks.hasNumber} />
                    <PasswordRule label="Contains at least 1 lowercase letter" valid={passwordChecks.hasLower} />
                    <PasswordRule label="Contains at least 1 uppercase letter" valid={passwordChecks.hasUpper} />
                    <PasswordRule label="Contains a special character (e.g. @ !)" valid={passwordChecks.hasSpecial} />
                  </div>
                  {errors.password && <p style={{ color: "#ef4444", fontSize: "12px" }}>{errors.password}</p>}
                </div>
              )}
            </>
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

// InputField Component
const InputField = ({ label, error, style = {}, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
    <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>{label}</label>
    <input {...props} maxLength={props.name === "studentId" ? 12 : 30} style={{ width: "100%", padding: "12px", fontSize: "14px", borderRadius: "12px", border: error ? "1px solid #ef4444" : "1px solid #d1d5db", outline: "none", ...style }} />
    {error && <p style={{ color: "#ef4444", fontSize: "12px" }}>{error}</p>}
  </div>
);

// Password rule component
const PasswordRule = ({ label, valid }) => (
  <p style={{ fontSize: 12, color: valid ? "green" : "#ef4444", margin: 0 }}>{label}</p>
);

export default CreateUserModal;

