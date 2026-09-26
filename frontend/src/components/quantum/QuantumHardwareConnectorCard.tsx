import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Key,
  Download,
  Copy,
  Check,
  RefreshCw,
  Layers,
  Terminal,
  Server,
  Zap,
} from 'lucide-react';
import { api } from '../../services/api';
import { QuantumBackendInfo, QASMExportResponse, IBMTokenValidationResponse } from '../../types';

interface Props {
  activeExperimentId?: string;
  quantumConfig?: {
    n_qubits: number;
    feature_map: string;
    ansatz: string;
    ansatz_layers: number;
  };
}

export const QuantumHardwareConnectorCard: React.FC<Props> = ({
  activeExperimentId,
  quantumConfig = {
    n_qubits: 4,
    feature_map: 'ZZFeatureMap',
    ansatz: 'RealAmplitudes',
    ansatz_layers: 2,
  },
}) => {
  const [backends, setBackends] = useState<QuantumBackendInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // IBM Token validation state
  const [ibmToken, setIbmToken] = useState('');
  const [validatingToken, setValidatingToken] = useState(false);
  const [validationResult, setValidationResult] = useState<IBMTokenValidationResponse | null>(null);

  // QASM Export state
  const [qasmData, setQasmData] = useState<QASMExportResponse | null>(null);
  const [generatingQasm, setGeneratingQasm] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchBackends();
  }, []);

  const fetchBackends = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getQuantumBackends();
      setBackends(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load quantum backends');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateToken = async () => {
    if (!ibmToken.trim()) return;
    setValidatingToken(true);
    setValidationResult(null);
    try {
      const result = await api.validateIBMToken(ibmToken);
      setValidationResult(result);
      if (result.valid && result.available_devices.length > 0) {
        // Merge or replace cloud backends
        setBackends((prev) => [
          ...prev.filter((b) => !b.is_cloud),
          ...result.available_devices,
        ]);
      }
    } catch (err: any) {
      setValidationResult({
        valid: false,
        message: err.message || 'Token validation failed',
        available_devices: [],
      });
    } finally {
      setValidatingToken(false);
    }
  };

  const handleGenerateQASM = async () => {
    setGeneratingQasm(true);
    try {
      let data: QASMExportResponse;
      if (activeExperimentId) {
        data = await api.exportExperimentQASM(activeExperimentId);
      } else {
        data = await api.exportCircuitQASM(quantumConfig);
      }
      setQasmData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to export OpenQASM 3.0');
    } finally {
      setGeneratingQasm(false);
    }
  };

  const handleCopyQASM = () => {
    if (!qasmData) return;
    navigator.clipboard.writeText(qasmData.qasm_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQASM = () => {
    if (!qasmData) return;
    const blob = new Blob([qasmData.qasm_code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qcare_vqc_${qasmData.n_qubits}q_${quantumConfig.ansatz}.qasm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-900/40 via-pink-900/30 to-slate-900/40 border border-purple-500/20 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <Cloud className="w-3.5 h-3.5" /> Hardware & Cloud Runtime
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-2">
              Quantum Execution Targets & IBM Quantum Connector
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Execute Parameterized Quantum Circuits (VQC) on local exact/noisy simulators or dispatch transpiled OpenQASM 3.0 routines directly to IBM Quantum cloud backends.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchBackends}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Backends
            </button>
            <button
              onClick={handleGenerateQASM}
              disabled={generatingQasm}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white flex items-center gap-1.5 transition-all shadow-md"
            >
              <Terminal className="w-3.5 h-3.5" /> {generatingQasm ? 'Generating...' : 'Export OpenQASM 3.0'}
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Backends List + IBM Token Connector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quantum Backends Fleet (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-pink-400" /> Available Quantum Execution Targets ({backends.length})
            </h3>
            <span className="text-[11px] text-slate-400">Simulation & QPU Fleet</span>
          </div>

          {loading && backends.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-pink-500" /> Discovering quantum backends...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {backends.map((b) => {
                const isHardware = b.is_hardware;
                const isOnline = b.status === 'AVAILABLE' || b.status === 'ONLINE';

                return (
                  <div
                    key={b.backend_id}
                    className="p-4 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-pink-500/30 transition-all group backdrop-blur-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                            {b.cloud_provider}
                          </span>
                          <h4 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                            {b.name}
                          </h4>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                            isOnline
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          }`}
                        >
                          {isOnline ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Ready
                            </>
                          ) : (
                            <>
                              <Key className="w-3 h-3" /> Auth Required
                            </>
                          )}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                        {b.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Cpu className="w-3.5 h-3.5 text-purple-400" /> {b.qubit_count} Qubits
                      </span>
                      {b.avg_queue_seconds !== undefined && (
                        <span className="flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-400" /> ~{b.avg_queue_seconds}s queue
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: IBM Quantum API Token Validation */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">IBM Quantum Cloud Access</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Connect your IBM Quantum API token (from <a href="https://quantum.ibm.com" target="_blank" rel="noreferrer" className="text-pink-400 underline hover:text-pink-300">quantum.ibm.com</a>) to query live QPU availability and calibrate cloud dispatch.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  API Token
                </label>
                <input
                  type="password"
                  value={ibmToken}
                  onChange={(e) => setIbmToken(e.target.value)}
                  placeholder="Paste 64-character IBM API Key..."
                  className="w-full px-3 py-2 text-xs bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
              </div>

              <button
                onClick={handleValidateToken}
                disabled={validatingToken || !ibmToken.trim()}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                {validatingToken ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Authenticating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Validate & Query QPUs
                  </>
                )}
              </button>
            </div>

            {/* Validation Feedback */}
            {validationResult && (
              <div
                className={`mt-4 p-3 rounded-xl text-xs border ${
                  validationResult.valid
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  {validationResult.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold">{validationResult.valid ? 'Token Verified' : 'Validation Error'}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">{validationResult.message}</p>
                    {validationResult.account_type && (
                      <p className="mt-1 text-[10px] font-mono text-emerald-300">
                        Tier: {validationResult.account_type}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/60 text-[11px] text-slate-400">
            <span className="font-medium text-slate-300">Security Note:</span> API keys are used solely for in-session validation and are never persisted to disk or logs.
          </div>
        </div>
      </div>

      {/* OpenQASM 3.0 Circuit Viewer / Export */}
      {qasmData && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-pink-500/20 backdrop-blur-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  {qasmData.qasm_version}
                </span>
                <span className="text-xs text-slate-400">
                  Target: {qasmData.transpiled_for}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                Exported OpenQASM 3.0 Circuit Specification
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyQASM}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
              <button
                onClick={handleDownloadQASM}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-pink-600 hover:bg-pink-500 text-white flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Download .qasm
              </button>
            </div>
          </div>

          {/* Circuit Stats Strip */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Qubits</div>
              <div className="text-sm font-bold text-pink-400">{qasmData.n_qubits}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Circuit Depth</div>
              <div className="text-sm font-bold text-purple-400">{qasmData.circuit_depth}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Quantum Gate Count</div>
              <div className="text-sm font-bold text-amber-400">{qasmData.gate_count}</div>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="relative">
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-xs overflow-x-auto max-h-72 leading-relaxed">
              <code>{qasmData.qasm_code}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
