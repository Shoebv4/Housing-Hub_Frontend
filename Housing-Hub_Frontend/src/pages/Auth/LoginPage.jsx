import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Building2, Mail, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Alert, Button, Input, ThemeToggle } from '../../components/UI';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(email, password);
    if (!success) {
      setError('Invalid email or password');
    }
    setLoading(false);
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
          <h2 className="text-2xl font-semibold tracking-tight text-ink">HousingHub</h2>
          <p className="mt-2 text-sm text-muted">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert tone="danger">{error}</Alert>}

          <div className="relative flex flex-col">
            <label htmlFor="login-email" className="field-label">Email</label>
            <Mail className="absolute left-3 top-11 h-4 w-4 text-faint" />
            <Input
              id="login-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>

          <div className="relative flex flex-col">
            <label htmlFor="login-password" className="field-label">Password</label>
            <Lock className="absolute left-3 top-11 h-4 w-4 text-faint" />
            <Input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-8 space-y-4 text-center">
          <p className="text-sm text-muted">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-accent hover:text-accent">
              Register here
            </Link>
          </p>
          <p className="text-sm text-muted">
            New Society?{' '}
            <Link to="/register-society" className="font-medium text-accent hover:text-accent">
              Register Society
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;