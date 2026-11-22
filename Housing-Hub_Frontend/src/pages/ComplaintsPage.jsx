import React from 'react';
import ComplaintsList from '../components/Complaints/ComplaintsList';
import ProtectedRoute from '../components/ProtectedRoute';
import { Card, PageHeader } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';

const ComplaintsPage = () => {
  const { user } = useAuth();

  return (
    <ProtectedRoute requiredRoles={['admin', 'resident']}>
      <div className="page-container">
        <PageHeader
          title={user?.role === 'resident' ? 'My Complaints' : 'Complaints'}
          subtitle={user?.role === 'resident'
            ? 'Raise complaints and track their progress'
            : 'Review and resolve resident complaints'}
        />
        <Card>
          <ComplaintsList />
        </Card>
      </div>
    </ProtectedRoute>
  );
};

export default ComplaintsPage;
