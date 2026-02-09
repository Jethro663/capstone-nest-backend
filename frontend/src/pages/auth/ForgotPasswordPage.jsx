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
    <div className="min-h-screen bg-gradient-to-br from-[#374151] to-[#dc2626] flex flex-col items-center justify-center p-4">
      
      {/* Back Button */}
      <div className="absolute top-8 left-8">
        <Button
          variant="ghost"
          className="text-white hover:bg-white/10"
          onClick={step === 'otp' ? () => setStep('email') : onBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step === 'otp' ? 'Back' : 'Home'}
        </Button>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            {step === 'email' ? 'Forgot Password' : 'Reset Password'}
          </CardTitle>
          <CardDescription className="text-center">
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
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white flex justify-center items-center" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Sending...
                  </>
                ) : 'Send Code'}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white flex justify-center items-center" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Resetting...
                  </>
                ) : 'Reset Password'}
              </Button>

              <Button
                type="button"
                variant="link"
                className="w-full text-[#dc2626]"
                onClick={handleResendOtp}
                disabled={isLoading}
              >
                Resend Code
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ForgotPasswordPage