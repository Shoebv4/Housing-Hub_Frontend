import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Building2, ChevronRight, LogOut, User, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getMenuItems } from '../../utils/navigation';
import { apiGet } from '../../utils/api';
import { Alert, Badge, Button, Modal, ThemeToggle } from '../UI';
import clsx from 'clsx';

const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const menuItems = getMenuItems(user?.role);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState({ society: null, flat: null });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);

  const roleLabel = (user?.role || '').replace(/_/g, ' ');

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previouslyFocused = document.activeElement;
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (window.matchMedia('(max-width: 1023px)').matches) {
      closeButtonRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

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
          'fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-shrink-0 flex-col border-r border-line bg-surface shadow-pop transition-transform duration-200 ease-in-out motion-reduce:transition-none',
          'lg:static lg:z-auto lg:translate-x-0 lg:shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full invisible lg:visible'
        )}
      >
        <div className="flex h-16 flex-shrink-0 items-center justify-between px-4">
          <div className="flex items-center gap-3 px-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft">
              <Building2 className="h-5 w-5 text-accent" />
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-ink">HousingHub</h2>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            className="rounded-xl p-2 text-muted transition-colors hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mx-4 border-b border-line" aria-hidden="true" />

        <nav className="scrollbar-slim flex-1 overflow-y-auto px-4 py-4" aria-label="Main navigation">
          <ul className="space-y-1">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const showSection = item.section && item.section !== menuItems[index - 1]?.section;

              return (
                <React.Fragment key={item.path}>
                  {showSection && (
                    <li className={clsx(
                      'px-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-faint',
                      index === 0 ? 'pt-0' : 'pt-4'
                    )}>
                      {item.section}
                    </li>
                  )}
                  <li>
                    <Link
                      to={item.path}
                      onClick={onClose}
                      aria-current={isActive ? 'page' : undefined}
                      className={clsx(
                        'relative flex min-h-11 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                        isActive
                          ? 'bg-accent-soft text-accent'
                          : 'text-muted hover:bg-surface-hover hover:text-ink'
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={clsx(
                          'absolute inset-y-2 left-0 w-1 rounded-r-full bg-accent transition-opacity',
                          isActive ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                </React.Fragment>
              );
            })}
          </ul>
        </nav>

        <div className="mx-4 border-t border-line" aria-hidden="true" />
        <div className="flex-shrink-0 space-y-2 p-4">
          <div className="flex items-center justify-between px-4 pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Preferences</span>
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={openProfile}
            className="flex w-full items-center gap-3 rounded-xl bg-surface-muted px-4 py-3 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            aria-label="View personal details"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft">
              <User className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{user?.name}</p>
              <p className="truncate text-xs capitalize text-muted">{roleLabel || '—'}</p>
            </div>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-faint" />
          </button>

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface dark:hover:bg-red-500/10 dark:hover:text-red-300"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
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
                  <div className="rounded-xl border border-line bg-surface-muted p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-ink">Assigned Flat</p>
                      <Badge tone="brand">{profile.flat.status || 'Assigned'}</Badge>
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
              <Alert tone="danger">{profileError}</Alert>
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
