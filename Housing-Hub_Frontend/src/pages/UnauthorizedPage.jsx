import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button, ThemeToggle } from '../components/UI';

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <Shield className="mx-auto mb-4 h-24 w-24 text-red-500 dark:text-red-400" />
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-ink">Access Denied</h1>
          <p className="text-muted">
            You don't have permission to access this page.
          </p>
        </div>

        <Button onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
