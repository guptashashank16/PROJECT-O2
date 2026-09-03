import React, { useState } from 'react';
import { Activity, Eye, EyeOff, Lock, Mail, ShieldAlert, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';

interface LoginPageProps {
  onClose: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onClose }) => {
  const { login } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        const res = await apiService.register(username, email, password, fullName);
        login(res.access_token, {
          username: res.username,
          email,
          role: res.role as any,
          full_name: res.full_name,
          permissions: res.permissions,
        });
        onClose();
      } else {
        const res = await apiService.login(username, password);
        login(res.access_token, {
          username: res.username,
          email: `${res.username}@qcare.local`,
          role: res.role as any,
          full_name: res.full_name,
          permissions: res.permissions,
        });
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoUser = (demoUser: 'admin' | 'researcher' | 'clinician' | 'viewer') => {
    const passwords = {
      admin: 'Admin@QCare2026',
      researcher: 'Research@QCare2026',
      clinician: 'Doctor@QCare2026',
      viewer: 'Viewer@QCare2026',
    };
    setUsername(demoUser);
    setPassword(passwords[demoUser]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md glass-panel-pink rounded-3xl p-8 space-y-6 border border-pink-500/30 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mx-auto shadow-lg shadow-pink-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isRegistering ? 'Create Q-CARE Account' : 'Authenticate Session'}
          </h2>
          <p className="text-xs text-slate-300">
            {isRegistering ? 'Register for research & clinical inference access' : 'Enter your credentials to unlock role-based platform controls'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Username / Email</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. researcher"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-pink-500/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-all"
              />
            </div>
          </div>

          {isRegistering && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@institution.org"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-pink-500/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Alex Vance"
                  className="w-full px-4 py-2.5 bg-slate-900/80 border border-pink-500/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-all"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-pink-500/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isRegistering && (
            <p className="text-[10px] text-pink-300/80 bg-pink-950/40 p-2.5 rounded-lg border border-pink-500/20">
              ℹ️ Public self-registration assigns the <strong>VIEWER</strong> role by default. Higher roles (ADMIN, RESEARCHER, CLINICIAN) must be assigned by system administrators.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-pink-500/25 transition-all disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : isRegistering ? 'Register Account' : 'Sign In'}
          </button>
        </form>

        {/* Quick Hackathon Seed Selection */}
        {!isRegistering && (
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <p className="text-[11px] text-slate-400 font-medium">Quick Demo Preset Login:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoUser('admin')}
                className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-[11px] text-pink-300 rounded-lg border border-pink-500/20 text-left"
              >
                👑 Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoUser('researcher')}
                className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-[11px] text-pink-300 rounded-lg border border-pink-500/20 text-left"
              >
                🔬 Researcher
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoUser('clinician')}
                className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-[11px] text-pink-300 rounded-lg border border-pink-500/20 text-left"
              >
                🩺 Clinician
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoUser('viewer')}
                className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-[11px] text-pink-300 rounded-lg border border-pink-500/20 text-left"
              >
                👁️ Viewer
              </button>
            </div>
          </div>
        )}

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
            }}
            className="text-xs text-pink-400 hover:text-pink-300 underline font-medium"
          >
            {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Register as Viewer'}
          </button>
        </div>
      </div>
    </div>
  );
};
