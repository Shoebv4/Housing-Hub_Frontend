import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, User, Mail, Phone, Lock, MapPin } from 'lucide-react';
import { Alert, Button, Input, ThemeToggle } from '../../components/UI';
import { API_BASE_URL } from '../../config';

const RegisterSocietyPage = () => {
  const [formData, setFormData] = useState({
    // Society Details
    societyName: '',
    address: '',
    city: '',
    state: '',
    country: '', // <-- add country
    pincode: '',
    // Admin Details
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [pincodeError, setPincodeError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    if (formData.adminPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    if (!/^\d{10}$/.test(formData.adminPhone)) {
      setError('Phone number must be exactly 10 digits');
      setLoading(false);
      return;
    }
    if (!formData.adminEmail.includes('@') || !formData.adminEmail.endsWith('.com')) {
      setError('Email must contain @ and end with .com');
      setLoading(false);
      return;
    }
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;
    if (!passwordPattern.test(formData.adminPassword)) {
      setError('Password must have 1 uppercase, 1 lowercase, 1 number, 1 special character');
      setLoading(false);
      return;
    }
    if (!/^\d{1,10}$/.test(formData.pincode)) {
      setError('Pincode must be numeric and up to 10 digits');
      setLoading(false);
      return;
    }
    // 1. Register society first
    const societyPayload = {
      name: formData.societyName,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      country: formData.country, // <-- add country
      pincode: formData.pincode ? parseInt(formData.pincode, 10) : null
    };
    try {
      const societyRes = await fetch(`${API_BASE_URL}/societies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(societyPayload)
      });
      if (!societyRes.ok) {
        let errMsg = 'Society registration failed.';
        try {
          const errData = await societyRes.json();
          if (errData?.Message) errMsg = errData.Message;
          if (errData?.Errors) {
            errMsg += ' ' + Object.values(errData.Errors).flat().join(' ');
          }
        } catch {}
        setError(errMsg);
        setLoading(false);
        return;
      }
      const societyData = await societyRes.json();
      const societyId = societyData.societyId || societyData.SocietyId;
      // 2. Register admin user with new societyId (FlatId is optional for admin)
      const adminPayload = {
        name: formData.adminName,
        email: formData.adminEmail,
        phone: formData.adminPhone,
        password: formData.adminPassword,
        role: 'admin',
        societyId: societyId // required for admin
      };
      // Only add flatId if it's a valid number (never as empty string or undefined)
      if (formData.adminFlatId && !isNaN(Number(formData.adminFlatId))) {
        adminPayload.flatId = Number(formData.adminFlatId);
      }
      const adminRes = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminPayload)
      });
      if (adminRes.ok) {
        setSuccess(true);
        setError('');
        // Show a success message for both society and admin registration
        alert('Society and admin registered successfully!');
      } else {
        let errMsg = 'Admin registration failed.';
        try {
          const errData = await adminRes.json();
          if (errData?.Message) errMsg = errData.Message;
          if (errData?.Errors) {
            errMsg += ' ' + Object.values(errData.Errors).flat().join(' ');
          }
        } catch {}
        setError(errMsg);
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'adminPhone') {
      if (!/^\d{0,10}$/.test(value)) return;
      setPhoneError(value.length === 10 ? '' : 'Phone number must be exactly 10 digits');
    }
    if (name === 'adminEmail') {
      setEmailError(value.includes('@') && value.endsWith('.com') ? '' : 'Email must contain @ and end with .com');
    }
    if (name === 'adminPassword') {
      const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;
      setPasswordError(passwordPattern.test(value)
        ? ''
        : 'Password must have 1 uppercase, 1 lowercase, 1 number, 1 special character');
    }
    if (name === 'pincode') {
      if (!/^\d{0,10}$/.test(value)) return;
      setPincodeError(value.length > 0 && value.length <= 10 ? '' : 'Pincode must be numeric and up to 10 digits');
    }
    setFormData({
      ...formData,
      [name]: value
    });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-accent-soft blur-3xl" />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="relative w-full max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center">
            <Building2 className="h-12 w-12 text-accent" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Register New Society</h2>
          <p className="mt-2 text-sm text-muted">Create your society account with admin details</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <Alert tone="danger">{error}</Alert>}
          {success && (
            <Alert tone="success">Society registered successfully!</Alert>
          )}
          {/* Society Information */}
          <div>
            <h3 className="text-lg font-semibold text-ink mb-4">Society Information</h3>
            <div className="space-y-4">
              <div className="relative flex flex-col">
                <label htmlFor="society-societyName" className="field-label">Society Name</label>
                <Building2 className="absolute left-3 top-10 h-4 w-4 text-faint" />
                <Input
                  id="society-societyName"
                  name="societyName"
                  type="text"
                  placeholder="Society Name"
                  value={formData.societyName}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>

              <div className="relative flex flex-col">
                <label htmlFor="society-address" className="field-label">Full Address</label>
                <MapPin className="absolute left-3 top-10 h-4 w-4 text-faint" />
                <Input
                  id="society-address"
                  name="address"
                  type="text"
                  placeholder="Full Address"
                  value={formData.address}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col">
                  <label htmlFor="society-city" className="field-label">City</label>
                  <Input
                    id="society-city"
                    name="city"
                    type="text"
                    placeholder="City"
                    value={formData.city}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="society-state" className="field-label">State</label>
                  <Input
                    id="society-state"
                    name="state"
                    type="text"
                    placeholder="State"
                    value={formData.state}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label htmlFor="society-country" className="field-label">Country</label>
                <Input
                  id="society-country"
                  name="country"
                  type="text"
                  placeholder="Country"
                  value={formData.country}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="flex flex-col">
                <label htmlFor="society-pincode" className="field-label">Pincode</label>
                <Input
                  id="society-pincode"
                  name="pincode"
                  type="text"
                  placeholder="Pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  error={pincodeError}
                  required
                  maxLength={10}
                  pattern="\d{1,10}"
                />
              </div>
            </div>
          </div>

          {/* Admin Information */}
          <div>
            <h3 className="text-lg font-semibold text-ink mb-4">Admin Details</h3>
            <div className="space-y-4">
              <div className="relative flex flex-col">
                <label htmlFor="society-adminName" className="field-label">Admin Full Name</label>
                <User className="absolute left-3 top-10 h-4 w-4 text-faint" />
                <Input
                  id="society-adminName"
                  name="adminName"
                  type="text"
                  placeholder="Admin Full Name"
                  value={formData.adminName}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>

              <div className="relative flex flex-col">
                <label htmlFor="society-adminEmail" className="field-label">Admin Email</label>
                <Mail className="absolute left-3 top-10 h-4 w-4 text-faint" />
                <Input
                  id="society-adminEmail"
                  name="adminEmail"
                  type="email"
                  placeholder="Admin Email"
                  value={formData.adminEmail}
                  onChange={handleChange}
                  className="pl-10"
                  error={emailError}
                  required
                />
              </div>

              <div className="relative flex flex-col">
                <label htmlFor="society-adminPhone" className="field-label">Admin Phone</label>
                <Phone className="absolute left-3 top-10 h-4 w-4 text-faint" />
                <Input
                  id="society-adminPhone"
                  name="adminPhone"
                  type="tel"
                  placeholder="Admin Phone"
                  value={formData.adminPhone}
                  onChange={handleChange}
                  className="pl-10"
                  error={phoneError}
                  required
                  maxLength={10}
                  pattern="\d{10}"
                />
              </div>

              <div className="relative flex flex-col">
                <label htmlFor="society-adminPassword" className="field-label">Admin Password</label>
                <Lock className="absolute left-3 top-10 h-4 w-4 text-faint" />
                <Input
                  id="society-adminPassword"
                  name="adminPassword"
                  type="password"
                  placeholder="Admin Password"
                  value={formData.adminPassword}
                  onChange={handleChange}
                  className="pl-10"
                  error={passwordError}
                  required
                />
              </div>

              <div className="relative flex flex-col">
                <label htmlFor="society-confirmPassword" className="field-label">Confirm Password</label>
                <Lock className="absolute left-3 top-10 h-4 w-4 text-faint" />
                <Input
                  id="society-confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Registering...' : 'Register Society'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:text-accent font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterSocietyPage;