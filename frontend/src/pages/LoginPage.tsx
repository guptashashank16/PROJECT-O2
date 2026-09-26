import React, { useState } from 'react';
import { Activity, Eye, EyeOff, Lock, Mail, ShieldAlert, User, X } from 'lucide-react';
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

  const handleFillDemoUser = (role: 'researcher' | 'viewer') => {
    setUsername(role);
    setPassword(role === 'researcher' ? 'Researcher123!' : 'Viewer123!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md glass-panel-pink rounded-3xl p-8 space-y-6 border border-pink-300 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mx-auto shadow-md shadow-pink-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isRegistering ? 'Create Q-CARE Account' : 'Authenticate Session'}
          </h2>
          <p className="text-xs text-slate-600">
            {isRegistering ? 'Register for research & quantum benchmarking access' : 'Enter your credentials to unlock role-based research platform controls'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Username / Email</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. researcher"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-pink-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
              />
            </div>
          </div>

          {isRegistering && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="researcher@institution.org"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-pink-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Alex Vance"
                  className="w-full px-4 py-2.5 bg-white border border-pink-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-pink-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isRegistering && (
            <p className="text-[10px] text-pink-800 bg-pink-50 p-2.5 rounded-lg border border-pink-200">
              ℹ️ Public self-registration assigns the <strong>VIEWER</strong> role by default. Researcher privileges can be granted by project managers.
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

        {/* Development Quick Role Fill (Researcher / Viewer only) */}
        {!isRegistering && (
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <p className="text-[11px] text-slate-500 font-semibold">Development Preset Profiles:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemoUser('researcher')}
                className="py-1.5 px-3 bg-pink-50/70 hover:bg-pink-100/70 text-[11px] text-pink-700 font-semibold rounded-lg border border-pink-200 text-center transition"
              >
                🔬 Researcher
              </button>
              <button
                type="button"
                onClick={() => handleFillDemoUser('viewer')}
                className="py-1.5 px-3 bg-pink-50/70 hover:bg-pink-100/70 text-[11px] text-pink-700 font-semibold rounded-lg border border-pink-200 text-center transition"
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
            className="text-xs text-pink-600 hover:text-pink-700 underline font-semibold"
          >
            {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Register as Viewer'}
          </button>
        </div>
      </div>
    </div>
  );
};
