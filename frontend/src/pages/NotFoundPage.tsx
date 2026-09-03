import React from 'react';
import { Activity, ArrowLeft } from 'lucide-react';

interface NotFoundPageProps {
  onReturn: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onReturn }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full glass-panel-pink rounded-3xl p-10 text-center space-y-6 border border-pink-500/30 shadow-2xl">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mx-auto shadow-xl shadow-pink-500/20">
          <Activity className="w-8 h-8 text-white" />
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-black text-white tracking-tight pink-gradient-text">404</h1>
          <h2 className="text-xl font-bold text-white">Page Not Found</h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            The clinical route or benchmark page you are looking for does not exist or has been moved.
          </p>
        </div>

        <button
          onClick={onReturn}
          className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-pink-500/20 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
};
