import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Clock, Database, FolderPlus, Layers, Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { api } from '../../services/api';
import { ExperimentDetail, ExperimentSummary } from '../../types';

interface ExperimentRegistryCardProps {
  onSelectExperiment?: (expId: string) => void;
}

export const ExperimentRegistryCard: React.FC<ExperimentRegistryCardProps> = ({ onSelectExperiment }) => {
  const { benchmarkSummary } = useAppState();
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [activeExp, setActiveExp] = useState<ExperimentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExpName, setNewExpName] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');

  const fetchExperiments = async () => {
    try {
      setLoading(true);
      const list = await api.listExperiments();
      setExperiments(list);
      const active = await api.getActiveExperiment();
      setActiveExp(active);
    } catch (err: any) {
      console.warn('Could not fetch experiments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, [benchmarkSummary]);

  const handleSetActive = async (expId: string) => {
    try {
      setLoading(true);
      const active = await api.setActiveExperiment(expId);
      setActiveExp(active);
      if (onSelectExperiment) {
        onSelectExperiment(expId);
      }
      await fetchExperiments();
    } catch (err: any) {
      alert(`Failed to activate experiment: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const created = await api.createExperiment({
        experiment_name: newExpName.trim() || undefined,
        description: newExpDesc.trim() || undefined,
      });
      setShowCreateModal(false);
      setNewExpName('');
      setNewExpDesc('');
      await fetchExperiments();
      handleSetActive(created.experiment_id);
    } catch (err: any) {
      alert(`Failed to create experiment: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (expId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this research experiment and its recorded metrics?')) {
      return;
    }
    try {
      setLoading(true);
      await api.deleteExperiment(expId);
      await fetchExperiments();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel-pink rounded-3xl p-6 space-y-5 border border-pink-300 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pink-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-md shadow-pink-500/20 text-white">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Research Experiment Registry</h3>
            <p className="text-xs text-slate-500">
              Isolated sessions, parameterized quantum runs, and persistent benchmark provenance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchExperiments}
            disabled={loading}
            className="p-2 rounded-xl border border-pink-200 bg-white text-slate-600 hover:bg-rose-50 transition"
            title="Refresh experiments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold shadow-md shadow-pink-500/25 hover:opacity-95 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Experiment
          </button>
        </div>
      </div>

      {/* Experiments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {experiments.map((exp) => {
          const isActive = activeExp?.experiment_id === exp.experiment_id;

          return (
            <div
              key={exp.experiment_id}
              onClick={() => handleSetActive(exp.experiment_id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                isActive
                  ? 'bg-rose-50/90 border-pink-400 shadow-md ring-2 ring-pink-500/20'
                  : 'bg-white/80 border-pink-100 hover:border-pink-300 hover:bg-white'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                    {exp.experiment_id}
                  </span>
                  {isActive && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-pink-100 text-pink-700 border border-pink-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-600 animate-pulse" />
                      Active
                    </span>
                  )}
                </div>

                <h4 className="text-xs font-bold text-slate-900 truncate" title={exp.experiment_name}>
                  {exp.experiment_name}
                </h4>

                <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 font-mono">
                  <span>{exp.dataset_name} ({exp.dataset_rows} rows)</span>
                  <span>•</span>
                  <span>{exp.n_qubits} Qubits</span>
                </div>
              </div>

              <div className="pt-2 border-t border-pink-100 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 block font-sans">Best Observed AUC</span>
                  <span className="font-mono font-bold text-pink-700">
                    {exp.best_auc !== null && exp.best_auc !== undefined ? exp.best_auc.toFixed(4) : 'Pending'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleDelete(exp.experiment_id, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Delete experiment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for Creating New Experiment */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-pink-300 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Create Isolated Research Experiment</h3>
            <p className="text-xs text-slate-500">
              Initializes a clean experiment container with independent dataset, model configs, and results.
            </p>

            <form onSubmit={handleCreateNew} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Experiment Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wisconsin WDBC - 6Q ZZFeatureMap Deep Ansatz"
                  value={newExpName}
                  onChange={(e) => setNewExpName(e.target.value)}
                  className="w-full px-3 py-2 border border-pink-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Research Notes / Description</label>
                <textarea
                  rows={3}
                  placeholder="Hypothesis or parameter variations being tested..."
                  value={newExpDesc}
                  onChange={(e) => setNewExpDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-pink-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold shadow-md shadow-pink-500/25"
                >
                  {loading ? 'Creating...' : 'Initialize Experiment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
