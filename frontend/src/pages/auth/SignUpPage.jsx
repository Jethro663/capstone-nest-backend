// ================================================================================
// SIGN UP PAGE - Real Backend Integration
// ================================================================================
// Updated to match backend registration schema
// ALL UI/DESIGN PRESERVED - Only logic and fields changed

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

/**
 * SignUpPage Component
 *
 * BACKEND EXPECTS:
 * {
 *   email: "student@school.edu",
 *   password: "SecurePass123!",
 *   role: "student"  // or "teacher"
 * }
 *
 * NOTE: Backend does NOT require name fields during registration
 * Names are added later in profile completion
 *
 * CHANGES FROM ORIGINAL:
 * - Removed firstName, middleName, lastName (not needed for registration)
 * - Uses useAuth() instead of prop
 * - Calls real API
 * - Handles loading states
 * - Proper error handling
 * - Redirects to email verification on success
 */
export function SignUpPage({ role, onBack, onLogin, onSignupSuccess }) {

  // ================================================================================
  // HOOKS & STATE
  // ================================================================================

  /**
   * Get register function from contexts
   */
  const { register } = useAuth();

  /**
   * Form state
   *
   * SIMPLIFIED FROM ORIGINAL:
   * - Only email and password needed
   * - Name fields moved to profile page (after verification)
   */
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: ""  // For frontend validation only
  });

  /**
   * Validation errors
   */
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    confirmPassword: ""
  });

  /**
   * Password visibility toggles
   */
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /**
   * Loading state
   */
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Track if email verification page should show
   * After successful registration, show email verification
   */
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  // ================================================================================
  // VALIDATION FUNCTIONS
  // ================================================================================

  /**
   * Validate email
   * Same as LoginPage
   */
  const validateEmail = (value) => {
    if (!value) {
      return "Email is required";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.(com|edu|ph|net|org|gov)$/i;
    if (!emailRegex.test(value)) {
      return "Please enter a valid email";
    }
    return "";
  };

  /**
   * Validate password strength
   *
   * BACKEND REQUIREMENTS:
   * - At least 8 characters
   * - At least 1 uppercase letter
   * - At least 1 lowercase letter
   * - At least 1 number
   * - At least 1 special character
   */
  const validatePassword = (value) => {
    if (!value) {
      return "Password is required";
    }
    if (value.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (!/[A-Z]/.test(value)) {
      return "Password must include at least 1 uppercase letter";
    }
    if (!/[a-z]/.test(value)) {
      return "Password must include at least 1 lowercase letter";
    }
    if (!/[0-9]/.test(value)) {
      return "Password must include at least 1 number";
    }
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(value)) {
      return "Password must include at least 1 special character";
    }
    return "";
  };

  /**
   * Validate password confirmation matches
   */
  const validateConfirmPassword = (value, password) => {
    if (!value) {
      return "Please confirm your password";
    }
    if (value !== password) {
      return "Passwords do not match";
    }
    return "";
  };

  // ================================================================================
  // INPUT HANDLERS
  // ================================================================================

  /**
   * Handle input changes
   * Updates form data and validates on change
   */
  const handleInputChange = (field, value) => {
    // Update form data
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Validate the field
    let error = "";

    if (field === "email") {
      error = validateEmail(value);
    } else if (field === "password") {
      error = validatePassword(value);
      // Also re-validate confirm password if it has a value
      if (formData.confirmPassword) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: validateConfirmPassword(formData.confirmPassword, value)
        }));
      }
    } else if (field === "confirmPassword") {
      error = validateConfirmPassword(value, formData.password);
    }

    // Update errors
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  // ================================================================================
  // FORM VALIDATION
  // ================================================================================

  /**
   * Check if form is valid
   */
  const isFormValid = () => {
    return (
        formData.email &&
        formData.password &&
        formData.confirmPassword &&
        !errors.email &&
        !errors.password &&
        !errors.confirmPassword
    );
  };

  // ================================================================================
  // FORM SUBMISSION
  // ================================================================================

  /**
   * Handle form submission
   *
   * FLOW:
   * 1. Validate all fields
   * 2. Call backend registration API
   * 3. Backend creates account with PENDING status
   * 4. Backend sends OTP email
   * 5. Show email verification page
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Final validation
    if (!isFormValid()) {
      return;
    }

    setIsLoading(true);

    try {
      /**
       * CALL BACKEND REGISTRATION API
       *
       * BACKEND EXPECTS:
       * {
       *   email: "student@school.edu",
       *   password: "SecurePass123!",
       *   role: "student"
       * }
       *
       * BACKEND RETURNS:
       * {
       *   success: true,
       *   message: "Registration successful. Please check your email...",
       *   data: {
       *     user: {
       *       id: "uuid",
       *       email: "student@school.edu",
       *       roles: ["student"],
       *       isEmailVerified: false,
       *       status: "PENDING"
       *     }
       *   }
       * }
       */
      await register({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: role  // From props (student/teacher)
      });

      // Registration successful!
      // Call parent success handler to move to verification page
      if (onSignupSuccess) {
        onSignupSuccess({ email: formData.email });
      } else {
        // Fallback internal state
        setRegisteredEmail(formData.email);
        setShowEmailVerification(true);
      }

    } catch (error) {
      /**
       * HANDLE ERRORS
       *
       * POSSIBLE ERRORS:
       * 1. Email already registered
       * 2. Invalid role
       * 3. Network error
       */

      // Email already exists (checked via code or message)
      if (error.code === 'EMAIL_EXISTS' || error.message?.toLowerCase().includes('already registered') || error.message?.toLowerCase().includes('already taken')) {
        setErrors(prev => ({
          ...prev,
          email: 'Email already registered. Please log in instead.'
        }));
      }
      // Validation errors from backend (e.g., password too weak)
      else if (error.errors) {
        // Map backend errors to form fields
        const newErrors = { ...errors };
        
        Object.values(error.errors).forEach(err => {
          const field = err.field;
          const msg = err.message || err.msg;
          
          if (field && newErrors.hasOwnProperty(field)) {
            newErrors[field] = msg;
          } else if (field === 'email') { // Fallback if field name slightly different
            newErrors.email = msg;
          }
        });
        
        setErrors(newErrors);
      }
      // Generic error
      else {
        setErrors(prev => ({
          ...prev,
          email: error.message || 'Registration failed. Please try again.'
        }));
      }

    } finally {
      setIsLoading(false);
    }
  };

  // ================================================================================
  // RENDER
  // ================================================================================

  /**
   * Get role display name
   */
  const getRoleDisplayName = () => {
    if (role === "student") return "Student";
    if (role === "teacher") return "Teacher";
    return "";
  };

  /**
   * If registration successful, show verification message
   */
  if (showEmailVerification) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#374151] to-[#dc2626] flex flex-col items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center text-green-600">
                Registration Successful!
              </CardTitle>
              <CardDescription className="text-center">
                Please check your email to verify your account
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  We've sent a verification code to:
                </p>
                <p className="font-medium text-[#dc2626]">
                  {registeredEmail}
                </p>
                <p className="text-sm text-gray-600 mt-4">
                  Please enter the code on the verification page to activate your account.
                </p>
              </div>

              <Button
                  onClick={onLogin}
                  className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
    );
  }

  /**
   * Show registration form
   */
  return (
      <div className="min-h-screen bg-gradient-to-br from-[#374151] to-[#dc2626] flex flex-col items-center justify-center p-4">

        {/* Back Button */}
        <div className="absolute top-8 left-8">
          <Button
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Button>
        </div>

        {/* Sign Up Card */}
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {getRoleDisplayName()} Registration
            </CardTitle>
            <CardDescription className="text-center">
              Create your account to get started
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="student@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={errors.email ? "border-[#dc2626]" : ""}
                    disabled={isLoading}
                />
                {errors.email && (
                    <p className="text-sm text-[#dc2626]">{errors.email}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className={errors.password ? "border-[#dc2626] pr-10" : "pr-10"}
                      disabled={isLoading}
                  />
                  <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                    <p className="text-sm text-[#dc2626]">{errors.password}</p>
                )}
                {/* Password Requirements */}
                <div className="text-xs text-gray-600 space-y-1">
                  <p>Password must contain:</p>
                  <ul className="list-disc list-inside pl-2">
                    <li>At least 8 characters</li>
                    <li>1 uppercase letter</li>
                    <li>1 lowercase letter</li>
                    <li>1 number</li>
                    <li>1 special character (!@#$%^&*)</li>
                  </ul>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      className={errors.confirmPassword ? "border-[#dc2626] pr-10" : "pr-10"}
                      disabled={isLoading}
                  />
                  <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                    <p className="text-sm text-[#dc2626]">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Sign Up Button */}
              <Button
                  type="submit"
                  className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                  disabled={!isFormValid() || isLoading}
              >
                {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating account...
                    </>
                ) : (
                    'Sign Up'
                )}
              </Button>

              {/* Login Link */}
              <div className="text-center text-sm">
                Already have an account?{" "}
                <button
                    type="button"
                    onClick={onLogin}
                    className="text-[#dc2626] hover:underline"
                    disabled={isLoading}
                >
                  Log in
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}
