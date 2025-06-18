"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { useAuth } from '@/lib/use-auth'
import { Mail, Shield, Clock, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'

interface OTPAuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type AuthMode = 'signin' | 'signup'
type AuthStep = 'email' | 'otp'

export function OTPAuthModal({ isOpen, onClose, onSuccess }: OTPAuthModalProps) {
  const { requestLoginOTP, verifyLoginOTP, requestSignupOTP, verifySignupOTP, loading } = useAuth()
  
  // State management
  const [mode, setMode] = useState<AuthMode>('signin')
  const [step, setStep] = useState<AuthStep>('email')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [otpCode, setOTPCode] = useState('')
  const [otpId, setOTPId] = useState('')
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [canResend, setCanResend] = useState(true)
  
  // Timer for OTP expiration countdown
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => {
          if (time <= 1) {
            setCanResend(true)
            return 0
          }
          return time - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timeLeft])

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setStep('email')
    setEmail('')
    setName('')
    setOTPCode('')
    setOTPId('')
    setError('')
    setTimeLeft(0)
    setCanResend(true)
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    try {
      let result
      if (mode === 'signin') {
        result = await requestLoginOTP(email)
      } else {
        result = await requestSignupOTP(email, name)
      }

      if (result) {
        setOTPId(result.otpId)
        setStep('otp')
        setTimeLeft(300) // 5 minutes countdown
        setCanResend(false)
      }
    } catch (err) {
      console.error('Error requesting OTP:', err)
    }
  }

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code')
      return
    }

    try {
      let success
      if (mode === 'signin') {
        success = await verifyLoginOTP(otpId, otpCode)
      } else {
        success = await verifySignupOTP(otpId, otpCode)
      }

      if (success) {
        onSuccess()
        onClose()
        resetForm()
      }
    } catch (err) {
      console.error('Error verifying OTP:', err)
    }
  }

  const handleResendOTP = async () => {
    if (!canResend) return
    
    setError('')
    try {
      let result
      if (mode === 'signin') {
        result = await requestLoginOTP(email)
      } else {
        result = await requestSignupOTP(email, name)
      }

      if (result) {
        setOTPId(result.otpId)
        setTimeLeft(300)
        setCanResend(false)
        setOTPCode('')
      }
    } catch (err) {
      console.error('Error resending OTP:', err)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* 
        MODAL POSITIONING CONTROL
        Want to move the modal up or down? Just change the "top-[60%]" class below:
        - top-[40%] = Way up high (closer to top)
        - top-[50%] = Pretty high up
        - top-[60%] = Sweet spot (current)
        - top-[70%] = Lower down the page
        - top-[80%] = Way down low
      */}
      <DialogContent className="sm:max-w-md fixed top-[60%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Quick verification
          </DialogTitle>
          <DialogDescription>
            Just need to verify your email address
          </DialogDescription>
        </DialogHeader>

        {step === 'email' ? (
          <div className="space-y-6">
            <Tabs value={mode} onValueChange={(value) => setMode(value as AuthMode)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Welcome back</CardTitle>
                    <CardDescription>
                      Enter your email to continue
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">
                          Email
                        </label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          required
                          className="h-11"
                        />
                      </div>
                      
                      {error && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                      
                      <Button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full h-11"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Sending code...
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            Continue
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Create your account</CardTitle>
                    <CardDescription>
                      Get started with your new account
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">
                          Name
                        </label>
                        <Input
                          id="name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                          className="h-11"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="signup-email" className="text-sm font-medium">
                          Email
                        </label>
                        <Input
                          id="signup-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          required
                          className="h-11"
                        />
                      </div>
                      
                      {error && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                      
                      <Button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full h-11"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Creating account...
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            Create account
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setStep('email')}
                    className="p-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeLeft > 0 ? formatTime(timeLeft) : 'Expired'}
                  </Badge>
                </div>
                
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Check your email
                </CardTitle>
                <CardDescription>
                  We sent a verification code to <strong>{email}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleOTPSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-medium">
                      Enter verification code
                    </label>
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={otpCode}
                        onChange={(value) => setOTPCode(value)}
                        className="gap-2"
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="w-12 h-12 text-lg font-mono" />
                          <InputOTPSlot index={1} className="w-12 h-12 text-lg font-mono" />
                          <InputOTPSlot index={2} className="w-12 h-12 text-lg font-mono" />
                          <InputOTPSlot index={3} className="w-12 h-12 text-lg font-mono" />
                          <InputOTPSlot index={4} className="w-12 h-12 text-lg font-mono" />
                          <InputOTPSlot index={5} className="w-12 h-12 text-lg font-mono" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>
                  
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button 
                    type="submit" 
                    disabled={loading || otpCode.length !== 6}
                    className="w-full h-11"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Verifying...
                      </>
                    ) : (
                      'Verify and continue'
                    )}
                  </Button>
                  
                  <Separator />
                  
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Didn&apos;t receive the code?
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResendOTP}
                      disabled={!canResend || loading}
                    >
                      {canResend ? 'Resend code' : `Resend in ${formatTime(timeLeft)}`}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 