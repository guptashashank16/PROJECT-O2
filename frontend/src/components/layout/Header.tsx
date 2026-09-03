import React, { useState } from 'react';
import { Activity, Database, LogIn, LogOut, User } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';
import { LoginPage } from '../../pages/LoginPage';

export const Header: React.FC = () => {
  const { profile, isBackendOnline } = useAppState();
  const { user, logout, isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-rose-100 text-rose-700 border-rose-300',
    RESEARCHER: 'bg-pink-100 text-pink-700 border-pink-300',
    CLINICIAN: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    VIEWER: 'bg-slate-100 text-slate-700 border-slate-300',
  };

  return (
    <>
      <header className="border-b border-pink-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3 flex items-center justify-between shadow-sm shadow-pink-500/5">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center shadow-md shadow-pink-500/20 ring-2 ring-pink-300/50">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Q-CARE Clinical QML
              </h1>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-600 border border-pink-200">
                Hybrid VQC + Classical Benchmarking
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Evidence-Driven Clinical Tabular AI & Feature Sensitivity
            </p>
          </div>
        </div>

        {/* Status Badges & Auth Control */}
        <div className="flex items-center gap-3">
          {/* Active Dataset Pill */}
          {profile && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50/70 border border-pink-200/80 text-xs text-slate-700">
              <Database className="w-3.5 h-3.5 text-pink-600" />
              <span className="font-semibold truncate max-w-[180px]">{profile.dataset_name}</span>
              <span className="text-slate-500 font-mono">({profile.total_rows} rows)</span>
            </div>
          )}

          {/* Backend Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isBackendOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isBackendOnline ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
            <span>{isBackendOnline ? 'Backend Online' : 'Backend Offline'}</span>
          </div>

          {/* User Profile & Auth Button */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <User className="w-3.5 h-3.5 text-pink-600" />
                <span className="font-semibold text-slate-900">{user.full_name || user.username}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleColors[user.role] || roleColors.VIEWER}`}>
                  {user.role}
                </span>
              </div>

              {isAuthenticated ? (
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-rose-600 border border-slate-200 transition text-xs font-medium"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-medium shadow-md shadow-pink-500/20 transition text-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login / Register</span>
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {showLoginModal && <LoginPage onClose={() => setShowLoginModal(false)} />}
    </>
  );
};
