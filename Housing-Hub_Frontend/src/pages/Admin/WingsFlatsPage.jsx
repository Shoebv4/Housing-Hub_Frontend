import React, { useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import WingsList from '../../components/Admin/WingsList';
import FlatsList from '../../components/Admin/FlatsList';
import { Card, PageHeader, Tabs } from '../../components/UI';

const TABS = [
  { label: 'Wings', value: 'wings' },
  { label: 'Flats', value: 'flats' }
];

const WingsFlatsPage = () => {
  const [tab, setTab] = useState('wings');

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <div className="page-container">
        <PageHeader title="Wings & Flats Management" subtitle="Manage wings and flats for your society" />
        <Tabs tabs={TABS} value={tab} onChange={setTab} ariaLabel="Wings and flats views" />
        <Card>
          {tab === 'wings' && <WingsList />}
          {tab === 'flats' && <FlatsList />}
        </Card>
      </div>
    </ProtectedRoute>
  );
};

export default WingsFlatsPage;
