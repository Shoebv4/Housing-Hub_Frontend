import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Building2, ChevronRight, LogOut, User, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getMenuItems } from '../../utils/navigation';
import { apiGet } from '../../utils/api';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import clsx from 'clsx';

const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const menuItems = getMenuItems(user?.role);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState({ society: null, flat: null });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  const roleLabel = (user?.role || '').replace(/_/g, ' ');

  const openProfile = async () => {
    onClose();
    setShowProfile(true);
    setProfileLoading(true);
    setProfileError('');
    setProfile({ society: null, flat: null });

    const flatPromise = user?.flatId
      ? apiGet('/flats').then(flats => (
        Array.isArray(flats) ? flats.find(flat => flat.flatId === user.flatId) : null
      ))
      : Promise.resolve(null);

    const results = await Promise.allSettled([
      user?.societyId ? apiGet(`/societies/${user.societyId}`) : Promise.resolve(null),
      flatPromise
    ]);

    const [societyResult, flatResult] = results;
    setProfile({
      society: societyResult.status === 'fulfilled' ? societyResult.value : null,
      flat: flatResult.status === 'fulfilled' ? flatResult.value : null
    });

    const failure = results.find(result => result.status === 'rejected');
    if (failure) {
      setProfileError(failure.reason?.message || 'Some profile details could not be loaded.');
    }

    setProfileLoading(false);
  };

  return (
    <>
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-shrink-0 flex-col border-r border-line bg-white shadow-xl transition-transform duration-200 ease-in-out',
          'lg:static lg:z-auto lg:translate-x-0 lg:shadow-none lg:transition-none',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-line p-5 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-accent" />
            <h2 className="text-xl font-bold text-ink">HousingHub</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-faint hover:bg-surface-hover lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4" aria-label="Main navigation">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={onClose}
                    aria-current={isActive ? 'page' : undefined}
                    className={clsx(
                      'flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors duration-200',
                      isActive
                        ? 'bg-accent-soft text-accent border-r-4 border-blue-700'
                        : 'text-muted hover:bg-surface-hover hover:text-ink'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-line p-4 flex-shrink-0">
          <button
            type="button"
            onClick={openProfile}
            className="mb-4 flex w-full items-center space-x-3 rounded-xl bg-surface-muted p-3 text-left transition-colors hover:bg-surface-hover"
            aria-label="View personal details"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft">
              <User className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{user?.name}</p>
              <p className="truncate text-xs capitalize text-muted">{roleLabel || '—'}</p>
              {/* <p className="truncate text-xs text-faint">{user?.email}</p> */}
            </div>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-faint" />
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors duration-200"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {showProfile && createPortal(
        <Modal
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
          title="Personal Details"
          size="lg"
        >
          <div className="space-y-5">
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
                <User className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-lg font-semibold text-ink">{user?.name}</p>
                <p className="text-sm capitalize text-faint">{roleLabel || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-faint">Email</p>
                <p className="mt-1 break-all text-sm text-ink">{user?.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-faint">Phone</p>
                <p className="mt-1 text-sm text-ink">{user?.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-faint">Role</p>
                <p className="mt-1 text-sm capitalize text-ink">{roleLabel || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-faint">Society</p>
                <p className="mt-1 text-sm text-ink">
                  {profile.society?.name || (profileLoading ? 'Loading...' : 'Not assigned')}
                </p>
              </div>
            </div>

            {profileLoading ? (
              <p className="text-sm text-faint">Loading assigned details...</p>
            ) : (
              <div className="space-y-4">
                {profile.society && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-faint">Society Address</p>
                    <p className="mt-1 text-sm text-ink">
                      {[
                        profile.society.address,
                        profile.society.city,
                        profile.society.state,
                        profile.society.pincode
                      ].filter(Boolean).join(', ') || '—'}
                    </p>
                  </div>
                )}

                {profile.flat ? (
                  <div className="rounded-xl border border-line p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-ink">Assigned Flat</p>
                      <span className="rounded-full bg-accent-soft px-2 py-1 text-xs font-medium text-accent">
                        {profile.flat.status || 'Assigned'}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-faint">Flat No.</p>
                        <p className="mt-0.5 font-medium text-ink">{profile.flat.flatNumber || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-faint">Wing</p>
                        <p className="mt-0.5 font-medium text-ink">{profile.flat.wing?.name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-faint">Floor No.</p>
                        <p className="mt-0.5 font-medium text-ink">{profile.flat.floorNumber || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-faint">Area</p>
                        <p className="mt-0.5 font-medium text-ink">
                          {profile.flat.area ? `${profile.flat.area} sq ft` : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-faint">No flat assigned.</p>
                )}
              </div>
            )}

            {profileError && (
              <p className="text-sm text-red-600">{profileError}</p>
            )}

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setShowProfile(false)}>Close</Button>
            </div>
          </div>
        </Modal>,
        document.body
      )}
    </>
  );
};

export default Sidebar;
