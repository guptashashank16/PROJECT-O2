import React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

const MODEL_COLORS: Record<string, string> = {
  vqc: '#38bdf8',
  logistic_regression: '#10b981',
  random_forest: '#8b5cf6',
  svm: '#f59e0b',
};

export const RocCurvesView: React.FC = () => {
  const { benchmarkSummary } = useAppState();

  if (!benchmarkSummary || !benchmarkSummary.results) return null;

  const results = Object.values(benchmarkSummary.results);
  if (results.length === 0) return null;

  // Combine ROC points into interpolated table across FPR 0 to 1
  const steps = 30;
  const chartData = Array.from({ length: steps + 1 }, (_, i) => {
    const targetFpr = i / steps;
    const point: Record<string, any> = {
      fpr: targetFpr,
      random: targetFpr,
    };

    results.forEach((r) => {
      if (r.roc_curve && Array.isArray(r.roc_curve) && r.roc_curve.length > 0) {
        // Find closest TPR for this FPR in model's roc_curve
        const closest = r.roc_curve.reduce((prev, curr) => {
          if (!prev) return curr;
          if (!curr) return prev;
          return Math.abs(curr.fpr - targetFpr) < Math.abs(prev.fpr - targetFpr) ? curr : prev;
        }, r.roc_curve[0]);
        point[r.model_id] = closest ? closest.tpr : targetFpr;
      } else {
        point[r.model_id] = targetFpr;
      }
    });

    return point;
  });

  return (
    <div className="glass-panel rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          Receiver Operating Characteristic (ROC) Curves
        </h3>
        <span className="text-xs text-slate-400 font-mono">True Positive vs False Positive</span>
      </div>

      <div className="h-64 w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="fpr"
              stroke="#64748b"
              fontSize={10}
              tickFormatter={(v) => (typeof v === 'number' ? v.toFixed(1) : String(v))}
              label={{ value: 'False Positive Rate (1 - Specificity)', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#64748b' }}
            />
            <YAxis
              domain={[0, 1]}
              stroke="#64748b"
              fontSize={10}
              tickFormatter={(v) => (typeof v === 'number' ? v.toFixed(1) : String(v))}
              label={{ value: 'True Positive Rate (Sensitivity)', angle: -90, position: 'insideLeft', offset: 25, fontSize: 10, fill: '#64748b' }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
              formatter={(val: any, name: string) => [
                typeof val === 'number' ? val.toFixed(3) : val,
                name === 'random' ? 'Random Chance' : name,
              ]}
              labelFormatter={(label) => `FPR: ${typeof label === 'number' ? label.toFixed(2) : label}`}
            />

            {/* Random guessing baseline */}
            <Line
              type="monotone"
              dataKey="random"
              name="Chance (AUC = 0.50)"
              stroke="#475569"
              strokeDasharray="4 4"
              dot={false}
            />

            {results.map((r) => (
              <Line
                key={r.model_id}
                type="monotone"
                dataKey={r.model_id}
                name={`${r.model_name} (AUC: ${r.metrics?.roc_auc?.toFixed(3) ?? '0.500'})`}
                stroke={MODEL_COLORS[r.model_id] || '#0ea5e9'}
                strokeWidth={r.model_id === 'vqc' ? 2.5 : 1.8}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-1">
        {results.map((r) => (
          <div key={r.model_id} className="flex items-center gap-1.5 font-medium">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: MODEL_COLORS[r.model_id] || '#0ea5e9' }}
            />
            <span className="text-slate-300">
              {r.model_name} <strong className="text-white font-mono">({r.metrics?.roc_auc?.toFixed(3) ?? '0.500'})</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
