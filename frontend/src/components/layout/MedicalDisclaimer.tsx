import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const MedicalDisclaimer: React.FC = () => {
  return (
    <div className="rounded-2xl border border-pink-200 bg-white/80 p-4 text-xs text-slate-600 flex items-start gap-3 shadow-sm">
      <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <span className="font-bold text-slate-800">Research & Educational Prototype Disclaimer:</span>
        <p className="leading-relaxed text-slate-600 font-medium">
          This system evaluates whether a variational quantum classifier (VQC) provides competitive diagnostic utility
          against classical baselines on tabular biomedical datasets. It is not a clinically certified medical device
          and must not be used as a substitute for certified medical examination, diagnosis, or treatment decisions.
        </p>
      </div>
    </div>
  );
};
