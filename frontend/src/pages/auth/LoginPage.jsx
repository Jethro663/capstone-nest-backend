// ================================================================================
// LOGIN PAGE - Role-Guarded
// ================================================================================

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { validateCredentials } from "@/services/authService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

/**
 * LoginPage Component
 *
 * @param {Function} onBack - Navigate back
 * @param {Function} onForgotPassword - Navigate to forgot password
 * @param {Function} onUnverified - Called when account is unverified. Receives the email and should navigate to verification page.
 */
export function LoginPage({ onBack, onForgotPassword, onUnverified }) {
  const { login } = useAuth();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Validate email format
  const validateEmail = (value) => {
    if (!value) {
      setEmailError("Email is required");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.(com|edu|ph|net|org|gov|local)$/i;
    if (!emailRegex.test(value)) {
      setEmailError("Please enter a valid email");
      return false;
    }
    setEmailError("");
    return true;
  };

  // Validate password (not empty)
  const validatePassword = (value) => {
    if (!value) {
      setPasswordError("Password is required");
      return false;
    }
    setPasswordError("");
    return true;
  };

  // Handle input changes
  const handleEmailChange = (value) => {
    setEmail(value);
    validateEmail(value);
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
    validatePassword(value);
  };

  // Form validity
  const isFormValid = () => {
    return email && password && !emailError && !passwordError;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsLoading(true);

    try {
      // Call backend login
      await login(email, password);

      // Success: AuthContext already updated, App.jsx handles redirect

    } catch (error) {
      // Invalid credentials (wrong email/password)
      if (error.message?.includes("Invalid") || error.code === "INVALID_CREDENTIALS") {
        setPasswordError("Invalid email or password");
      }
      // Email not verified - only navigate to verification flow if the provided password is correct
      else if (error.message?.includes("Email not verified") || error.code === "EMAIL_NOT_VERIFIED") {
        // Confirm the password is correct before sending user to verification page
        try {
          await validateCredentials(email, password);

          // If credentials are valid, navigate to verification flow
          if (typeof onUnverified === 'function') {
            onUnverified(email);
          } else {
            setEmailError("Please verify your email before logging in");
          }
        } catch (vError) {
          // Password is incorrect or validation failed
          setPasswordError("Invalid email or password");
        }
      }
      // Account not active
      else if (error.message?.includes("not active")) {
        setEmailError("Account suspended. Contact administrator.");
      }
      // Generic error
      else {
        setPasswordError(error.message || "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

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

      {/* Login Card */}
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Nexora Login</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
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
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={() => validateEmail(email)}
                className={emailError ? "border-[#dc2626] focus-visible:ring-[#dc2626]" : ""}
                disabled={isLoading}
              />
              {emailError && <p className="text-sm text-[#dc2626]">{emailError}</p>}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onBlur={() => validatePassword(password)}
                  className={passwordError ? "border-[#dc2626] focus-visible:ring-[#dc2626] pr-10" : "pr-10"}
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
              {passwordError && <p className="text-sm text-[#dc2626]">{passwordError}</p>}
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white flex justify-center items-center"
              disabled={!isFormValid() || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
