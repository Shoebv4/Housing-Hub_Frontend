import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiGet } from '../utils/api';

export const useSociety = () => {
  const { user } = useAuth();
  const [society, setSociety] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (!user?.societyId) {
      setSociety(null);
      return () => {
        cancelled = true;
      };
    }

    apiGet(`/societies/${user.societyId}`)
      .then(data => {
        if (!cancelled) setSociety(data);
      })
      .catch(() => {
        if (!cancelled) setSociety(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.societyId]);

  return society;
};
