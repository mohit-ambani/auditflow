'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { validateGSTIN, validatePAN, validatePincode } from '@auditflow/shared';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'org' | 'user'>('org');

  // Organization form data
  const [orgData, setOrgData] = useState({
    orgName: '',
    orgGstin: '',
    orgPan: '',
    orgEmail: '',
    orgPhone: '',
    orgAddress: '',
    orgCity: '',
    orgState: '',
    orgPincode: '',
  });

  // User form data
  const [userData, setUserData] = useState({
    userName: '',
    userEmail: '',
    userPassword: '',
    confirmPassword: '',
  });

  const handleOrgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate organization data
    if (!orgData.orgName || orgData.orgName.length < 2) {
      setError('Organization name must be at least 2 characters');
      return;
    }

    if (orgData.orgGstin && !validateGSTIN(orgData.orgGstin)) {
      setError('Invalid GSTIN format');
      return;
    }

    if (orgData.orgPan && !validatePAN(orgData.orgPan)) {
      setError('Invalid PAN format');
      return;
    }

    if (orgData.orgPincode && !validatePincode(orgData.orgPincode)) {
      setError('Invalid Pincode');
      return;
    }

    setStep('user');
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate user data
    if (!userData.userName || userData.userName.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (!userData.userEmail) {
      setError('Email is required');
      return;
    }

    if (userData.userPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (userData.userPassword !== userData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post<{ token: string; user: any }>('/api/auth/register', {
        ...orgData,
        ...userData,
      });

      if (response.success) {
        // Store token in localStorage
        if (response.data?.token) {
          localStorage.setItem('token', response.data.token);
        }

        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        setError(response.error || 'Registration failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Create Your Account</CardTitle>
          <CardDescription>
            {step === 'org'
              ? 'Tell us about your organization'
              : 'Create your admin account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {step === 'org' ? (
            <form onSubmit={handleOrgSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">
                  Organization Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="orgName"
                  value={orgData.orgName}
                  onChange={(e) =>
                    setOrgData({ ...orgData, orgName: e.target.value })
                  }
                  placeholder="Acme Trading Pvt Ltd"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orgGstin">GSTIN (Optional)</Label>
                  <Input
                    id="orgGstin"
                    value={orgData.orgGstin}
                    onChange={(e) =>
                      setOrgData({ ...orgData, orgGstin: e.target.value.toUpperCase() })
                    }
                    placeholder="27AABCU9603R1ZM"
                    maxLength={15}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgPan">PAN (Optional)</Label>
                  <Input
                    id="orgPan"
                    value={orgData.orgPan}
                    onChange={(e) =>
                      setOrgData({ ...orgData, orgPan: e.target.value.toUpperCase() })
                    }
                    placeholder="AABCU9603R"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orgEmail">Email (Optional)</Label>
                  <Input
                    id="orgEmail"
                    type="email"
                    value={orgData.orgEmail}
                    onChange={(e) =>
                      setOrgData({ ...orgData, orgEmail: e.target.value })
                    }
                    placeholder="contact@acme.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgPhone">Phone (Optional)</Label>
                  <Input
                    id="orgPhone"
                    type="tel"
                    value={orgData.orgPhone}
                    onChange={(e) =>
                      setOrgData({ ...orgData, orgPhone: e.target.value })
                    }
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgAddress">Address (Optional)</Label>
                <Input
                  id="orgAddress"
                  value={orgData.orgAddress}
                  onChange={(e) =>
                    setOrgData({ ...orgData, orgAddress: e.target.value })
                  }
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="orgCity">City (Optional)</Label>
                  <Input
                    id="orgCity"
                    value={orgData.orgCity}
                    onChange={(e) =>
                      setOrgData({ ...orgData, orgCity: e.target.value })
                    }
                    placeholder="Mumbai"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgState">State (Optional)</Label>
                  <Input
                    id="orgState"
                    value={orgData.orgState}
                    onChange={(e) =>
                      setOrgData({ ...orgData, orgState: e.target.value })
                    }
                    placeholder="Maharashtra"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgPincode">Pincode (Optional)</Label>
                  <Input
                    id="orgPincode"
                    value={orgData.orgPincode}
                    onChange={(e) =>
                      setOrgData({ ...orgData, orgPincode: e.target.value })
                    }
                    placeholder="400001"
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Link href="/login">
                  <Button variant="ghost" type="button">
                    Already have an account?
                  </Button>
                </Link>
                <Button type="submit">Continue</Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userName">
                  Your Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="userName"
                  value={userData.userName}
                  onChange={(e) =>
                    setUserData({ ...userData, userName: e.target.value })
                  }
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="userEmail">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="userEmail"
                  type="email"
                  value={userData.userEmail}
                  onChange={(e) =>
                    setUserData({ ...userData, userEmail: e.target.value })
                  }
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="userPassword">
                  Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="userPassword"
                  type="password"
                  value={userData.userPassword}
                  onChange={(e) =>
                    setUserData({ ...userData, userPassword: e.target.value })
                  }
                  placeholder="••••••••"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters with uppercase, lowercase, and number
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={userData.confirmPassword}
                  onChange={(e) =>
                    setUserData({ ...userData, confirmPassword: e.target.value })
                  }
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setStep('org')}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {step === 'org' ? (
              <p>Step 1 of 2: Organization Details</p>
            ) : (
              <p>Step 2 of 2: Admin Account</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
