import React, { useState } from 'react';
import { Search, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getMenuItems } from '../../utils/navigation';

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const menuItems = getMenuItems(user?.role);
  const term = query.trim().toLowerCase();
  const matches = term
    ? menuItems.filter(item => item.label.toLowerCase().includes(term))
    : [];

  const goTo = (path) => {
    navigate(path);
    setQuery('');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <form
          className="flex-1 max-w-md"
          onSubmit={(event) => {
            event.preventDefault();
            if (matches.length > 0) goTo(matches[0].path);
          }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setQuery('');
              }}
              placeholder="Search pages..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {term && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {matches.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-500">No matching pages.</p>
                ) : (
                  matches.map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        type="button"
                        key={item.path}
                        onClick={() => goTo(item.path)}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Icon className="h-4 w-4 text-gray-400" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </form>

        <div className="flex items-center space-x-3 pl-4 border-l border-gray-300">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-800">{user?.name}</p>
            <p className="text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
