export function formatPercent(val?: number): string {
  if (val === undefined || isNaN(val)) return '0.0%';
  return `${(val * 100).toFixed(1)}%`;
}

export function formatScore(val?: number): string {
  if (val === undefined || isNaN(val)) return '0.000';
  return val.toFixed(3);
}

export function formatTime(seconds?: number): string {
  if (seconds === undefined || isNaN(seconds)) return '0.0s';
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)} ms`;
  return `${seconds.toFixed(2)} s`;
}

export function getRiskBadgeColor(riskLevel: string): { bg: string; text: string; border: string } {
  switch (riskLevel) {
    case 'High Risk':
      return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' };
    case 'Moderate Risk':
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' };
    case 'Low Risk':
    default:
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' };
  }
}
