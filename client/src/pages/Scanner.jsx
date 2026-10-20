import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fmtTime, scannerSession } from '../api.js';
import Camera from '../components/Camera.jsx';

const THEMES = {
  ok:          { bg: 'bg-emerald-600', icon: '✓', title: 'Valid invitation' },
  checked_in:  { bg: 'bg-emerald-600', icon: '✓', title: 'Checked in' },
  already:     { bg: 'bg-amber-500',   icon: '!', title: 'Already checked in' },
  not_found:   { bg: 'bg-red-600',     icon: '✕', title: 'ID not found' },
  wrong_event: { bg: 'bg-red-600',     icon: '✕', title: 'Different event' },
};

const Row = ({ label, value }) => value ? (
  <div className="border-b border-white/20 py-3 last:border-0"><p className="text-xs uppercase tracking-wide opacity-75">{label}</p><p className="text-xl font-semibold">{value}</p></div>
) : null;

function ResultScreen({ result, busy, onConfirm, onNext }) {
  const t = THEMES[result.status];
  const g = result.guest;
  return (
    <div className={`fixed inset-0 z-40 flex flex-col overflow-y-auto ${t.bg} p-5 text-white`}>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="pt-6 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/20 text-5xl font-bold">{t.icon}</div>
          <h1 className="mt-3 text-2xl font-bold">{t.title}</h1>
          {result.code && <p className="mt-1 font-mono text-lg tracking-widest opacity-90">{result.code}</p>}
        </div>

        {g && (
          <div className="mt-6 rounded-2xl bg-white/15 px-4">
            <Row label="Name" value={g.full_name} />
            <Row label="Phone" value={g.phone} />
            <Row label="Category" value={g.category} />
            <Row label="Table" value={g.table_no} />
            {result.status === 'already' && <Row label="Arrived at" value={fmtTime(g.checked_in_at)} />}
          </div>
        )}
        {result.status === 'not_found' && <p className="mt-6 text-center text-lg">This ID is not on the guest list. Check the ID and try again.</p>}
        {result.status === 'wrong_event' && <p className="mt-6 text-center text-lg">This ID belongs to a different event.</p>}
        {result.status === 'already' && <p className="mt-4 text-center">This invitation was already used. Verify the person's identity.</p>}

        <div className="mt-auto space-y-3 pt-6 pb-[env(safe-area-inset-bottom)]">
          {result.status === 'ok' && (
            <button onClick={onConfirm} disabled={busy} className="w-full rounded-2xl bg-white py-4 text-lg font-bold text-emerald-700 shadow disabled:opacity-60">
              {busy ? 'Saving…' : 'Confirm check-in'}
            </button>
          )}
          <button onClick={onNext} className={`w-full rounded-2xl py-4 text-lg font-bold ${result.status === 'ok' ? 'bg-white/20' : 'bg-white text-slate-800'}`}>
            {result.status === 'ok' ? 'Cancel' : 'Scan next'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Scanner() {
  const nav = useNavigate();
  const session = scannerSession.get();
  const [info, setInfo] = useState(null);
  const [tab, setTab] = useState('scan');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');

  const loadInfo = () => api.get('/scan/event', 'scanner').then(setInfo).catch(() => {});
  useEffect(() => { if (!session) nav('/', { replace: true }); else loadInfo(); }, []);
  if (!session) return null;

  const lookup = async (code) => {
    setBusy(true); setError('');
    try { setResult(await api.post('/scan/lookup', { code }, 'scanner')); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const confirm = async () => {
    setBusy(true);
    try { setResult(await api.post('/scan/checkin', { code: result.code }, 'scanner')); loadInfo(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const next = () => { setResult(null); setManual(''); setError(''); };

  const onManualChange = (v) => {
    const raw = v.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 6);
    setManual(raw.length > 3 ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw);
  };

  const pct = info?.total ? Math.round((info.arrived / info.total) * 100) : 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="bg-indigo-600 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide opacity-75">Check-in</p>
            <h1 className="truncate text-lg font-bold">{info?.name || session.eventName}</h1>
          </div>
          <button className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium" onClick={() => { scannerSession.clear(); nav(`/e/${session.accessToken}`); }}>Log out</button>
        </div>
        {info && (
          <div className="mt-3">
            <div className="flex justify-between text-sm"><span><b className="text-lg">{info.arrived}</b> of {info.total} arrived</span><span className="opacity-80">{pct}%</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} /></div>
          </div>
        )}
      </header>

      <div className="grid grid-cols-2 border-b border-slate-200 bg-white text-sm font-semibold">
        {[['scan', 'Scan QR'], ['manual', 'Enter ID']].map(([k, label]) => (
          <button key={k} onClick={() => { setTab(k); setError(''); }} className={`py-3 ${tab === k ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>{label}</button>
        ))}
      </div>

      <main className="flex-1 p-4">
        {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {tab === 'scan' && !result && <Camera onCode={lookup} />}

        {tab === 'manual' && (
          <form onSubmit={(e) => { e.preventDefault(); lookup(manual); }} className="space-y-4 pt-4">
            <p className="text-sm text-slate-600">For guests without a smartphone: type the 6-character ID from their invitation.</p>
            <input
              className="input py-4 text-center font-mono text-4xl font-bold uppercase tracking-widest"
              placeholder="A3F-9C2" value={manual} onChange={(e) => onManualChange(e.target.value)}
              autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} maxLength={7} autoFocus
            />
            <button className="btn btn-primary w-full py-4 text-lg" disabled={busy || manual.replace('-', '').length !== 6}>{busy ? 'Checking…' : 'Verify'}</button>
          </form>
        )}
      </main>

      {result && <ResultScreen result={result} busy={busy} onConfirm={confirm} onNext={next} />}
    </div>
  );
}
