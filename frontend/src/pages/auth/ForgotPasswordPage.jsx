import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export const ForgotPasswordPage = ({ onBack, onReset }) => {
  const [step, setStep] = useState('email') // 'email' or 'otp'
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { forgotPassword, resetPassword } = useAuth()

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    try {
      await forgotPassword(email)
      setStep('otp')
    } catch (err) {
      // Error handled in AuthContext
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      await resetPassword(email, otp, newPassword)
      if (onReset) {
        setTimeout(() => onReset(), 2000)
      }
    } catch (err) {
      // Error handled in AuthContext
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setIsLoading(true)
    try {
      await forgotPassword(email)
      toast.success('New code sent to your email')
    } catch (err) {
      // Error handled in AuthContext
    } finally {
      setIsLoading(false)
    }
  }

  return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <Button
                  variant="ghost"
                  size="icon"
                  onClick={step === 'otp' ? () => setStep('email') : onBack}
                  className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
              {step === 'otp' ? 'Back' : 'Back to Login'}
            </span>
            </div>
            <CardTitle className="text-2xl font-bold">
              {step === 'email' ? 'Forgot Password' : 'Reset Password'}
            </CardTitle>
            <CardDescription>
              {step === 'email'
                  ? "Enter your email address and we'll send you a verification code."
                  : 'Enter the code sent to your email and your new password.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'email' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send Code'}
                  </Button>
                </form>
            ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Verification Code</Label>
                    <Input
                        id="otp"
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                        required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                        id="newPassword"
                        type="password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                  </Button>
                  <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={handleResendOtp}
                      disabled={isLoading}
                  >Resend Code
                  </Button>
                </form>
            )}
          </CardContent>
        </Card>
      </div>
  )
}

export default ForgotPasswordPage
