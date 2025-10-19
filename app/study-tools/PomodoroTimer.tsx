'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const LS_KEY_CFG = 'medmind_pomodoro_cfg_v1';
const LS_KEY_LOG = 'medmind_pomodoro_log_v1';

type Mode = 'work' | 'break';
interface Config { work: number; shortBreak: number; longBreak: number; longEvery: number }
interface SessionLog { id: string; startTs: number; endTs?: number; mode: Mode; minutes: number }

function loadCfg(): Config {
  const defaults: Config = { work: 25, shortBreak: 5, longBreak: 15, longEvery: 4 };
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_KEY_CFG) || '{}') as Partial<Config>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}
function saveCfg(cfg: Config) { localStorage.setItem(LS_KEY_CFG, JSON.stringify(cfg)); }
function loadLog(): SessionLog[] { try { return JSON.parse(localStorage.getItem(LS_KEY_LOG) || '[]'); } catch { return []; } }
function saveLog(log: SessionLog[]) { localStorage.setItem(LS_KEY_LOG, JSON.stringify(log)); }

export default function PomodoroTimer() {
  const [cfg, setCfg] = useState<Config>(() => loadCfg());
  const [mode, setMode] = useState<Mode>('work');
  const [cycle, setCycle] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(cfg.work * 60);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<SessionLog[]>(loadLog());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startedRef = useRef<number | null>(null);

  useEffect(() => { saveCfg(cfg); }, [cfg]);
  useEffect(() => { saveLog(log); }, [log]);

  useEffect(() => {
    if (!running) return; 
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSecondsLeft(s => s - 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  useEffect(() => {
    if (secondsLeft >= 0) return;
    // auto-switch when timer ends
    if (mode === 'work') {
      const nextIsLong = cycle % cfg.longEvery === 0;
      startMode(nextIsLong ? 'break' : 'break', nextIsLong ? cfg.longBreak : cfg.shortBreak);
      setCycle(c => c + 1);
    } else {
      startMode('work', cfg.work);
    }
  }, [secondsLeft, mode, cycle, cfg.longEvery, cfg.longBreak, cfg.shortBreak, cfg.work]);

  const startMode = (m: Mode, minutes: number) => {
    setMode(m);
    setSecondsLeft(minutes * 60);
    setRunning(true);
    startedRef.current = Date.now();
    setLog(prev => [{ id: crypto.randomUUID(), startTs: Date.now(), mode: m, minutes }, ...prev]);
  };

  const onStart = () => startMode('work', cfg.work);
  const onPause = () => { setRunning(false); };
  const onResume = () => { setRunning(true); };
  const onReset = () => { setRunning(false); setSecondsLeft(mode === 'work' ? cfg.work * 60 : cfg.shortBreak * 60); };

  useEffect(() => {
    // mark end time on stop
    if (!running && startedRef.current) {
      setLog(prev => prev.map((s, i) => i === 0 && !s.endTs ? { ...s, endTs: Date.now() } : s));
      startedRef.current = null;
    }
  }, [running]);

  const mmss = useMemo(() => {
    const m = Math.max(0, Math.floor(secondsLeft / 60));
    const s = Math.max(0, secondsLeft % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [secondsLeft]);

  const setCfgValue = (k: keyof Config, v: number) => setCfg(c => ({ ...c, [k]: v }));

  return (
    <div className="space-y-5">
      <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200">
        <div className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2">Current Mode</div>
        <div className="text-lg font-bold text-orange-900 capitalize">{mode === 'work' ? 'Focus Time' : 'Break Time'}</div>
      </div>

      <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200">
        <div className="text-6xl sm:text-7xl font-bold text-[#0F3D73] tracking-wider text-center tabular-nums">{mmss}</div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {!running ? (
          <button onClick={onStart} className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg font-semibold transition-all shadow-md flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Start Session
          </button>
        ) : (
          <>
            <button onClick={onPause} className="px-5 py-2.5 border-2 border-gray-300 rounded-xl bg-white hover:bg-gray-50 font-semibold transition-all shadow-sm flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pause
            </button>
            <button onClick={onResume} className="px-5 py-2.5 border-2 border-green-300 rounded-xl bg-green-50 hover:bg-green-100 font-semibold text-green-700 transition-all shadow-sm flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
              Resume
            </button>
          </>
        )}
        <button onClick={onReset} className="px-5 py-2.5 border-2 border-gray-300 rounded-xl bg-white hover:bg-gray-50 font-semibold transition-all shadow-sm flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset
        </button>
      </div>

      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="text-sm font-semibold text-gray-900 mb-3">Timer Settings</div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-medium text-gray-700">
            Work Duration (min)
            <input type="number" value={cfg.work} onChange={e=>setCfgValue('work', Math.max(1, +e.target.value))} className="mt-1 w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all" />
          </label>
          <label className="text-xs font-medium text-gray-700">
            Short Break (min)
            <input type="number" value={cfg.shortBreak} onChange={e=>setCfgValue('shortBreak', Math.max(1, +e.target.value))} className="mt-1 w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all" />
          </label>
          <label className="text-xs font-medium text-gray-700">
            Long Break (min)
            <input type="number" value={cfg.longBreak} onChange={e=>setCfgValue('longBreak', Math.max(1, +e.target.value))} className="mt-1 w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all" />
          </label>
          <label className="text-xs font-medium text-gray-700">
            Long Break Every
            <input type="number" value={cfg.longEvery} onChange={e=>setCfgValue('longEvery', Math.max(1, +e.target.value))} className="mt-1 w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all" />
          </label>
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="text-sm font-semibold text-gray-900 mb-3">Session History</div>
        <div className="space-y-2 max-h-48 overflow-auto">
          {log.slice(0, 10).map(s => (
            <div key={s.id} className="flex items-center gap-2 text-sm p-2 bg-white rounded-lg border border-gray-200">
              <div className={`w-2 h-2 rounded-full ${s.mode === 'work' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
              <span className="text-gray-600">{new Date(s.startTs).toLocaleTimeString()}</span>
              <span className="text-gray-400">•</span>
              <span className="font-medium text-gray-900 capitalize">{s.mode}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">{s.minutes}m</span>
              {!s.endTs && <span className="ml-auto text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">Active</span>}
            </div>
          ))}
          {log.length === 0 && <div className="text-sm text-gray-500 text-center py-4">No sessions yet. Start your first focus session!</div>}
        </div>
      </div>
    </div>
  );
}
