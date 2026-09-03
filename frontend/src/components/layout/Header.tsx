import React, { useState } from 'react';
import { Activity, Cpu, Database, LogIn, LogOut, Shield, User } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';
import { LoginPage } from '../../pages/LoginPage';

export const Header: React.FC = () => {
  const { profile, isBackendOnline, trainingStatus } = useAppState();
  const { user, logout, isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    RESEARCHER: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    CLINICIAN: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    VIEWER: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  return (
    <>
      <header className="border-b border-pink-500/20 bg-slate-950/85 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between shadow-lg shadow-pink-500/5">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/25 ring-1 ring-pink-400/40">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Q-CARE Clinical QML
              </h1>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/30">
                Hybrid VQC + Classical Benchmarking
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Evidence-Driven Clinical Tabular AI & Feature Sensitivity
            </p>
          </div>
        </div>

        {/* Status Badges & Auth Control */}
        <div className="flex items-center gap-3">
          {/* Active Dataset Pill */}
          {profile && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-pink-500/20 text-xs text-slate-300">
              <Database className="w-3.5 h-3.5 text-pink-400" />
              <span className="font-medium truncate max-w-[180px]">{profile.dataset_name}</span>
              <span className="text-slate-500 font-mono">({profile.total_rows} rows)</span>
            </div>
          )}

          {/* Backend Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isBackendOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isBackendOnline ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
            <span>{isBackendOnline ? 'Backend Online' : 'Backend Offline'}</span>
          </div>

          {/* User Profile & Auth Button */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <User className="w-3.5 h-3.5 text-pink-400" />
                <span className="font-semibold text-white">{user.full_name || user.username}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleColors[user.role] || roleColors.VIEWER}`}>
                  {user.role}
                </span>
              </div>

              {isAuthenticated ? (
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition text-xs font-medium"
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
