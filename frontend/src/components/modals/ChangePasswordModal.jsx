import React, { useState, useMemo } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/services/api";

/**
 * ChangePasswordModal
 * Appears after OTP verification to let users change their temporary password
 * Users can skip this and change password later
 * 
 * Two modes:
 * 1. isInitialPassword=true: Set password after email verification (no old password needed)
 * 2. isInitialPassword=false: Change password for authenticated user (old password required)
 */
const ChangePasswordModal = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  isInitialPassword = false,
  email = null,
  otpCode = null
}) => {
  const [loading, setLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Password strength checks
  const passwordChecks = useMemo(() => {
    const val = formData.newPassword;
    return {
      hasNumber: /\d/.test(val),
      hasLower: /[a-z]/.test(val),
      hasUpper: /[A-Z]/.test(val),
      hasSpecial: /[@$!%*?&#]/.test(val),
    };
  }, [formData.newPassword]);

  // Validate individual field
  const validateField = (name, value) => {
    switch (name) {
      case "oldPassword":
        if (!isInitialPassword && !value.trim()) return "Current password is required";
        return "";
      case "newPassword":
        if (!value.trim()) return "New password is required";
        if (value.length < 8) return "Password must be at least 8 characters";
        if (!/[A-Z]/.test(value)) return "Password must contain at least one uppercase letter";
        if (!/[a-z]/.test(value)) return "Password must contain at least one lowercase letter";
        if (!/\d/.test(value)) return "Password must contain at least one number";
        if (!/[@$!%*?&#]/.test(value)) return "Password must contain at least one special character";
        return "";
      case "confirmPassword":
        if (!value.trim()) return "Please confirm your password";
        if (value !== formData.newPassword) return "Passwords do not match";
        return "";
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value),
    }));
  };

  const isFormValid = useMemo(() => {
    const hasOldPassword = isInitialPassword || formData.oldPassword.trim();
    return (
      hasOldPassword &&
      formData.newPassword.trim() &&
      formData.confirmPassword.trim() &&
      !Object.values(errors).some((e) => e) &&
      Object.values(passwordChecks).every(Boolean)
    );
  }, [formData, errors, passwordChecks, isInitialPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      if (isInitialPassword) {
        // Set initial password with OTP verification
        await api.post("/auth/set-initial-password", {
          email: email,
          code: otpCode,
          newPassword: formData.newPassword,
        });
        toast.success("Password set successfully! You can now log in.");
      } else {
        // Change password for authenticated user
        await api.post("/auth/change-password", {
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword,
        });
        toast.success("Password changed successfully!");
      }

      setFormData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      onSuccess?.();
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Failed to change password";
      
      if (message.includes('Invalid verification code')) {
        toast.error('Invalid OTP code. Please check the code from your verification email and try again.');
        setErrors({ form: 'Invalid OTP code. Please verify the 6-digit code is correct.' });
      } else if (message.includes('No pending verification')) {
        toast.error('Verification code expired or not found. Please request a new one.');
        setErrors({ form: 'Verification code expired or not found.' });
      } else if (message.includes('Email already verified')) {
        toast.error('This email has already been verified. You can now log in.');
        setErrors({ form: 'Email already verified. Use normal login.' });
      } else if (message.includes('Old password')) {
        setErrors({ oldPassword: message });
        toast.error('Current password is incorrect.');
      } else {
        toast.error(message);
        setErrors({ form: message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "700", margin: 0, marginBottom: "4px" }}>
                {isInitialPassword ? "Set Your Password" : "Change Your Password"}
              </h2>
              <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                {isInitialPassword 
                  ? "Create a new password to activate your account and start learning"
                  : "Update your password to secure your account"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Current Password - Only for password change, not initial setup */}
              {!isInitialPassword && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>
                    Current Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showOldPassword ? "text" : "password"}
                      name="oldPassword"
                      value={formData.oldPassword}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="Enter your current password"
                      style={{
                        width: "100%",
                        padding: "12px",
                        fontSize: "14px",
                        borderRadius: "12px",
                        border: errors.oldPassword ? "1px solid #ef4444" : "1px solid #d1d5db",
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
                    >
                      {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.oldPassword && <p style={{ color: "#ef4444", fontSize: "12px", margin: 0 }}>{errors.oldPassword}</p>}
                </div>
              )}

              {/* New Password */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Enter new password"
                    style={{
                      width: "100%",
                      padding: "12px",
                      fontSize: "14px",
                      borderRadius: "12px",
                      border: errors.newPassword ? "1px solid #ef4444" : "1px solid #d1d5db",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.newPassword && <p style={{ color: "#ef4444", fontSize: "12px", margin: 0 }}>{errors.newPassword}</p>}

                {/* Password requirements */}
                {formData.newPassword && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                    <PasswordCheckItem label="At least 8 characters" valid={formData.newPassword.length >= 8} />
                    <PasswordCheckItem label="At least 1 uppercase letter" valid={passwordChecks.hasUpper} />
                    <PasswordCheckItem label="At least 1 lowercase letter" valid={passwordChecks.hasLower} />
                    <PasswordCheckItem label="At least 1 number" valid={passwordChecks.hasNumber} />
                    <PasswordCheckItem label="At least 1 special character (@$!%*?&#)" valid={passwordChecks.hasSpecial} />
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Confirm your new password"
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "14px",
                    borderRadius: "12px",
                    border: errors.confirmPassword ? "1px solid #ef4444" : "1px solid #d1d5db",
                    outline: "none",
                  }}
                />
                {errors.confirmPassword && <p style={{ color: "#ef4444", fontSize: "12px", margin: 0 }}>{errors.confirmPassword}</p>}
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <Button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  style={{ flex: 1, background: "#f3f4f6", color: "#111827" }}
                >
                  {isInitialPassword ? "Skip for Now" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !isFormValid}
                  style={{ flex: 1, background: "#10b981", color: "white" }}
                >
                  {loading ? (isInitialPassword ? "Setting..." : "Updating...") : (isInitialPassword ? "Set Password" : "Update Password")}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Small password check component
const PasswordCheckItem = ({ label, valid }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
    <span style={{ color: valid ? "#10b981" : "#d1d5db", fontWeight: "bold" }}>
      {valid ? "✓" : "○"}
    </span>
    <span style={{ color: valid ? "#10b981" : "#9ca3af" }}>{label}</span>
  </div>
);

export default ChangePasswordModal;
