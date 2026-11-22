import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, User, Mail, Phone, Lock } from 'lucide-react';
import { Alert, Button, Input, Select, ThemeToggle } from '../../components/UI';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    flatId: '',
    societyId: ''
  });
  const [societies, setSocieties] = useState([]);
  const [flats, setFlats] = useState([]);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  // Fetch societies on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/societies`)
      .then(res => res.json())
      .then(data => setSocieties(data))
      .catch(() => setSocieties([]));
  }, []);

  // Fetch flats when societyId changes
  useEffect(() => {
    if (!formData.societyId) {
      setFlats([]);
      setFormData(f => ({ ...f, flatId: '' }));
      return;
    }
    fetch(`${API_BASE_URL}/flats`)
      .then(res => res.json())
      .then(data => setFlats(data.filter(f => f.wing && f.wing.societyId === parseInt(formData.societyId))))
      .catch(() => setFlats([]));
  }, [formData.societyId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    if (!formData.societyId || !formData.flatId) {
      setError('Society and Flat are required');
      setLoading(false);
      return;
    }
    if (!/^\d{10}$/.test(formData.phone)) {
      setError('Phone number must be exactly 10 digits');
      setLoading(false);
      return;
    }
    if (!formData.email.includes('@') || !formData.email.endsWith('.com')) {
      setError('Email must contain @ and end with .com');
      setLoading(false);
      return;
    }
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;
    if (!passwordPattern.test(formData.password)) {
      setError('Password must have 1 uppercase, 1 lowercase, 1 number, 1 special character');
      setLoading(false);
      return;
    }
    // Prepare userData as per backend DTO
    const userData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      role: 'resident',
      societyId: parseInt(formData.societyId),
      flatId: parseInt(formData.flatId)
    };
    try {
      const success = await register(userData);
      if (success) {
        setError('');
        alert('Resident registered successfully!');
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      if (!/^\d{0,10}$/.test(value)) return;
      setPhoneError(value.length === 10 ? '' : 'Phone number must be exactly 10 digits');
    }
    if (name === 'email') {
      setEmailError(value.includes('@') && value.endsWith('.com') ? '' : 'Email must contain @ and end with .com');
    }
    if (name === 'password') {
      const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;
      setPasswordError(passwordPattern.test(value)
        ? ''
        : 'Password must have 1 uppercase, 1 lowercase, 1 number, 1 special character');
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
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center">
            <Building2 className="h-12 w-12 text-accent" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Register Resident</h2>
          <p className="mt-2 text-sm text-muted">Join your society and connect your flat</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <div className="relative flex flex-col">
            <label htmlFor="register-name" className="field-label">Full name</label>
            <User className="absolute left-3 top-10 h-4 w-4 text-faint" />
            <Input
              id="register-name"
              name="name"
              type="text"
              placeholder="Full name"
              value={formData.name}
              onChange={handleChange}
              className="pl-10"
              required
            />
          </div>

          <div className="relative flex flex-col">
            <label htmlFor="register-email" className="field-label">Email address</label>
            <Mail className="absolute left-3 top-10 h-4 w-4 text-faint" />
            <Input
              id="register-email"
              name="email"
              type="email"
              placeholder="Email address"
              value={formData.email}
              onChange={handleChange}
              className="pl-10"
              error={emailError}
              required
            />
          </div>

          <div className="relative flex flex-col">
            <label htmlFor="register-phone" className="field-label">Phone number</label>
            <Phone className="absolute left-3 top-10 h-4 w-4 text-faint" />
            <Input
              id="register-phone"
              name="phone"
              type="tel"
              placeholder="Phone number"
              value={formData.phone}
              onChange={handleChange}
              className="pl-10"
              error={phoneError}
              required
              maxLength={10}
              pattern="\d{10}"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Society"
              id="register-societyId"
              name="societyId"
              value={formData.societyId}
              onChange={handleChange}
              required
            >
              <option value="">Select a society</option>
              {societies.map(s => (
                <option key={s.societyId} value={s.societyId}>{s.name}</option>
              ))}
            </Select>
            <Select
              label="Flat"
              id="register-flatId"
              name="flatId"
              value={formData.flatId}
              onChange={handleChange}
              required
              disabled={!formData.societyId}
            >
              <option value="">Select a flat</option>
              {flats
                .filter(f => f.status === 'Pending')
                .map(f => (
                  <option key={f.flatId} value={f.flatId}>{f.flatNumber}</option>
                ))}
            </Select>
          </div>

          <div className="relative flex flex-col">
            <label htmlFor="register-password" className="field-label">Password</label>
            <Lock className="absolute left-3 top-10 h-4 w-4 text-faint" />
            <Input
              id="register-password"
              name="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="pl-10"
              error={passwordError}
              required
            />
          </div>

          <div className="relative flex flex-col">
            <label htmlFor="register-confirmPassword" className="field-label">Confirm password</label>
            <Lock className="absolute left-3 top-10 h-4 w-4 text-faint" />
            <Input
              id="register-confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="pl-10"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-accent hover:text-accent">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;