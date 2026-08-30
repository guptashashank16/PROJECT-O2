import React from 'react';
import {
  AlertCircle,
  Binary,
  CheckCircle2,
  Copy,
  Hash,
  HelpCircle,
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
        <div className="glass-panel p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Rows</span>
            <Rows className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{profile.total_rows}</div>
          <div className="text-[10px] text-slate-500">Patient samples</div>
        </div>

        <div className="glass-panel p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Features</span>
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{profile.total_columns}</div>
          <div className="text-[10px] text-slate-500">
            {profile.numerical_count} num, {profile.categorical_count} cat
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Missing Cells</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{profile.missing_values_total}</div>
          <div className="text-[10px] text-slate-500">Auto-imputed in pipeline</div>
        </div>

        <div className="glass-panel p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Duplicate Rows</span>
            <Copy className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{profile.duplicate_rows}</div>
          <div className="text-[10px] text-slate-500">Row duplicates</div>
        </div>

        <div className="glass-panel p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Target Column</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-cyan-300 truncate" title={profile.suggested_target || ''}>
            {profile.suggested_target || 'None'}
          </div>
          <div className="text-[10px] text-slate-500 truncate">
            Pos: {profile.suggested_positive_class || 'N/A'}
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Identifiers</span>
            <Hash className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{profile.suggested_identifiers.length}</div>
          <div className="text-[10px] text-slate-500 truncate">
            {profile.suggested_identifiers.join(', ') || 'None detected'}
          </div>
        </div>
      </div>

      {/* Class Balance Visualizer */}
      {profile.target_distribution && profile.target_distribution.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              Target Class Balance Distribution
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Target: <strong className="text-white">{profile.suggested_target}</strong>
            </span>
          </div>

          <div className="space-y-2">
            {profile.target_distribution.map((dist, idx) => {
              const isPos = dist.class_label === profile.suggested_positive_class;
              return (
                <div key={dist.class_label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isPos ? 'bg-cyan-400' : 'bg-slate-500'}`} />
                      {dist.class_label} {isPos && <span className="text-[10px] text-cyan-400 font-semibold">(Positive Class)</span>}
                    </span>
                    <span className="font-mono text-slate-400">
                      {dist.count} samples ({dist.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isPos ? 'bg-cyan-500 shadow-sm shadow-cyan-500/50' : 'bg-slate-600'
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
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
            <Table className="w-4 h-4 text-cyan-400" />
            <span>Dataset Schema & Statistical Profile</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {profile.columns.length} columns inspected
          </span>
        </div>

        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 sticky top-0 border-b border-slate-800 text-[11px] uppercase tracking-wider">
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
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {profile.columns.map((col) => (
                <tr key={col.name} className="hover:bg-slate-900/40 transition">
                  <td className="p-3 font-semibold text-white flex items-center gap-2">
                    {col.name}
                    {col.is_candidate_target && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Target
                      </span>
                    )}
                    {col.is_candidate_identifier && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                        ID
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-slate-400">{col.dtype}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-medium ${
                        col.inferred_type === 'numerical'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : col.inferred_type === 'categorical'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : col.inferred_type === 'identifier'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {col.inferred_type}
                    </span>
                  </td>
                  <td className="p-3">
                    {col.missing_count > 0 ? (
                      <span className="text-amber-400 font-semibold">
                        {col.missing_count} ({col.missing_percentage}%)
                      </span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-300">{col.unique_count}</td>
                  <td className="p-3 text-slate-400">
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
