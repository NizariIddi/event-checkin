import { Navigate, Route, Routes } from 'react-router-dom';
import { adminSession } from './api.js';
import AdminLogin from './pages/AdminLogin.jsx';
import Events from './pages/Events.jsx';
import EventDetail from './pages/EventDetail.jsx';
import PrintSheet from './pages/PrintSheet.jsx';
import ScannerLogin from './pages/ScannerLogin.jsx';
import Scanner from './pages/Scanner.jsx';

const AdminOnly = ({ children }) => (adminSession.get() ? children : <Navigate to="/admin/login" replace />);

function Landing() {
  return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-2xl text-white">✓</div>
        <h1 className="text-xl font-bold">Event Check-in</h1>
        <p className="mt-2 text-sm text-slate-500">Please open the event link you were given.</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminOnly><Events /></AdminOnly>} />
      <Route path="/admin/events/:id" element={<AdminOnly><EventDetail /></AdminOnly>} />
      <Route path="/admin/events/:id/print" element={<AdminOnly><PrintSheet /></AdminOnly>} />
      <Route path="/e/:token" element={<ScannerLogin />} />
      <Route path="/scan" element={<Scanner />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
