import React from 'react';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

const MODEL_COLORS: Record<string, string> = {
  vqc: '#ec4899',
  logistic_regression: '#10b981',
  random_forest: '#8b5cf6',
  svm: '#f59e0b',
};

export const MetricsRadarChart: React.FC = () => {
  const { benchmarkSummary } = useAppState();

  if (!benchmarkSummary || !benchmarkSummary.results) return null;

  const results = Object.values(benchmarkSummary.results);
  if (results.length === 0) return null;

  const metricsKeys = [
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'sensitivity', label: 'Sensitivity' },
    { key: 'specificity', label: 'Specificity' },
    { key: 'precision', label: 'Precision' },
    { key: 'f1_score', label: 'F1 Score' },
    { key: 'roc_auc', label: 'ROC-AUC' },
  ];

  const radarData = metricsKeys.map(({ key, label }) => {
    const entry: Record<string, any> = { metric: label };
    results.forEach((r) => {
      const val = r.metrics ? (r.metrics as any)[key] : 0;
      entry[r.model_id] = Number(((val ?? 0) * 100).toFixed(1));
    });
    return entry;
  });

  return (
    <div className="glass-panel-pink rounded-3xl p-5 space-y-3 border border-pink-300 shadow-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-pink-600" />
          Multi-Metric Diagnostic Radar
        </h3>
        <span className="text-xs text-slate-500 font-mono font-medium">Normalized (0 - 100%)</span>
      </div>

      <div className="h-64 w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
            <PolarGrid stroke="#fbcfe8" />
            <PolarAngleAxis dataKey="metric" stroke="#334155" fontSize={10} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" fontSize={9} />

            {results.map((r) => (
              <Radar
                key={r.model_id}
                name={r.model_name}
                dataKey={r.model_id}
                stroke={MODEL_COLORS[r.model_id] || '#ec4899'}
                fill={MODEL_COLORS[r.model_id] || '#ec4899'}
                fillOpacity={0.25}
              />
            ))}
            <Tooltip
              contentStyle={{ backgroundColor: '#ffffff', borderColor: '#f472b6', borderRadius: '12px', fontSize: '11px', color: '#0f172a' }}
              formatter={(val: any) => [`${val}%`, '']}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-1 text-xs font-semibold">
        {results.map((r) => (
          <div key={r.model_id} className="flex items-center gap-1.5 font-medium">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: MODEL_COLORS[r.model_id] || '#ec4899' }}
            />
            <span className="text-slate-800">{r.model_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
