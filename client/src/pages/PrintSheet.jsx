import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api.js';
import AdminLayout from '../components/AdminLayout.jsx';

export default function PrintSheet() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [guests, setGuests] = useState(null);

  useEffect(() => {
    Promise.all([api.get(`/admin/events/${id}`, 'admin'), api.get(`/admin/events/${id}/guests`, 'admin')])
      .then(([e, g]) => { setEvent(e); setGuests(g); });
  }, [id]);

  return (
    <AdminLayout back={{ to: `/admin/events/${id}`, label: 'Back to event' }}>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold">Printable QR sheet</h1>
          <p className="text-sm text-slate-500">Print or save as PDF, then cut out and attach to the invitation cards.</p>
        </div>
        <button className="btn btn-primary" onClick={() => window.print()}>Print / Save PDF</button>
      </div>
      {!guests ? <p className="text-slate-500">Loading…</p> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3">
          {guests.map((g) => (
            <div key={g.id} className="break-inside-avoid rounded-lg border border-dashed border-slate-400 bg-white p-3 text-center">
              <p className="truncate text-[10px] uppercase tracking-wide text-slate-500">{event?.name}</p>
              <div className="my-2 flex justify-center"><QRCodeSVG value={g.code} size={120} marginSize={1} /></div>
              <p className="font-mono text-lg font-bold tracking-widest">{g.code}</p>
              <p className="truncate text-sm">{g.full_name}</p>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
