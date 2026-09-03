import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Hash,
  PieChart,
  Rows,
  Sliders,
  Table,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export const DatasetProfileCard: React.FC = () => {
  const { profile } = useAppState();

  if (!profile) return null;

  return (
    <div className="space-y-6">
      {/* Overview Stat Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="glass-panel-pink p-4 rounded-2xl space-y-1 border border-pink-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Rows</span>
            <Rows className="w-3.5 h-3.5 text-pink-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{profile.total_rows}</div>
          <div className="text-[10px] text-slate-500 font-medium">Patient samples</div>
        </div>

        <div className="glass-panel-pink p-4 rounded-2xl space-y-1 border border-pink-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Features</span>
            <Sliders className="w-3.5 h-3.5 text-pink-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{profile.total_columns}</div>
          <div className="text-[10px] text-slate-500 font-medium">
            {profile.numerical_count} num, {profile.categorical_count} cat
          </div>
        </div>

        <div className="glass-panel-pink p-4 rounded-2xl space-y-1 border border-pink-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Missing Cells</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{profile.missing_values_total}</div>
          <div className="text-[10px] text-slate-500 font-medium">Auto-imputed in pipeline</div>
        </div>

        <div className="glass-panel-pink p-4 rounded-2xl space-y-1 border border-pink-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Duplicate Rows</span>
            <Copy className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{profile.duplicate_rows}</div>
          <div className="text-[10px] text-slate-500 font-medium">Row duplicates</div>
        </div>

        <div className="glass-panel-pink p-4 rounded-2xl space-y-1 border border-pink-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Target Column</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-sm font-bold text-pink-700 truncate" title={profile.suggested_target || ''}>
            {profile.suggested_target || 'None'}
          </div>
          <div className="text-[10px] text-slate-500 font-medium truncate">
            Pos: {profile.suggested_positive_class || 'N/A'}
          </div>
        </div>

        <div className="glass-panel-pink p-4 rounded-2xl space-y-1 border border-pink-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Identifiers</span>
            <Hash className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{profile.suggested_identifiers.length}</div>
          <div className="text-[10px] text-slate-500 font-medium truncate">
            {profile.suggested_identifiers.join(', ') || 'None detected'}
          </div>
        </div>
      </div>

      {/* Class Balance Visualizer */}
      {profile.target_distribution && profile.target_distribution.length > 0 && (
        <div className="glass-panel-pink rounded-3xl p-5 space-y-3 border border-pink-300 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-4 h-4 text-pink-600" />
              Target Class Balance Distribution
            </h3>
            <span className="text-xs text-slate-500 font-mono font-medium">
              Target: <strong className="text-slate-900">{profile.suggested_target}</strong>
            </span>
          </div>

          <div className="space-y-2">
            {profile.target_distribution.map((dist) => {
              const isPos = dist.class_label === profile.suggested_positive_class;
              return (
                <div key={dist.class_label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isPos ? 'bg-pink-600' : 'bg-slate-400'}`} />
                      {dist.class_label} {isPos && <span className="text-[10px] text-pink-700 font-bold">(Positive Class)</span>}
                    </span>
                    <span className="font-mono text-slate-600 font-medium">
                      {dist.count} samples ({dist.percentage}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-pink-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isPos ? 'bg-gradient-to-r from-pink-500 to-rose-600' : 'bg-slate-400'
                      }`}
                      style={{ width: `${dist.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dataset Column Inspection Table */}
      <div className="glass-panel-pink rounded-3xl overflow-hidden border border-pink-300 shadow-xl">
        <div className="p-4 border-b border-pink-200 flex items-center justify-between bg-pink-50/80">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Table className="w-4 h-4 text-pink-600" />
            <span>Dataset Schema & Statistical Profile</span>
          </div>
          <span className="text-xs text-slate-600 font-mono font-medium">
            {profile.columns.length} columns inspected
          </span>
        </div>

        <div className="overflow-x-auto max-h-80 rounded-b-3xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-pink-50/90 text-slate-700 sticky top-0 border-b border-pink-200 text-[11px] uppercase tracking-wider font-bold">
              <tr>
                <th className="p-3">Column Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Inferred Role</th>
                <th className="p-3">Missing</th>
                <th className="p-3">Unique</th>
                <th className="p-3">Summary / Distribution</th>
                <th className="p-3">Sample Values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-100 font-mono text-[11px]">
              {profile.columns.map((col) => (
                <tr key={col.name} className="bg-white/80 hover:bg-rose-50/50 transition">
                  <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                    {col.name}
                    {col.is_candidate_target && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                        Target
                      </span>
                    )}
                    {col.is_candidate_identifier && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold border border-purple-300">
                        ID
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-slate-600">{col.dtype}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold ${
                        col.inferred_type === 'numerical'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : col.inferred_type === 'categorical'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : col.inferred_type === 'identifier'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {col.inferred_type}
                    </span>
                  </td>
                  <td className="p-3">
                    {col.missing_count > 0 ? (
                      <span className="text-amber-700 font-bold">
                        {col.missing_count} ({col.missing_percentage}%)
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-800 font-semibold">{col.unique_count}</td>
                  <td className="p-3 text-slate-600 font-medium">
                    {col.min_value !== null && col.max_value !== null ? (
                      <span>
                        [{col.min_value?.toFixed(1)} ... {col.max_value?.toFixed(1)}] μ={col.mean_value?.toFixed(1)}
                      </span>
                    ) : col.categories ? (
                      <span className="truncate max-w-[150px] inline-block" title={col.categories.join(', ')}>
                        {col.categories.slice(0, 3).join(', ')}...
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-3 text-slate-500 truncate max-w-[180px]">
                    {col.sample_values.slice(0, 4).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
