import Kiosk from './Kiosk.jsx';
import Admin from './admin/Admin.jsx';

export default function App() {
  return location.pathname.startsWith('/admin') ? <Admin /> : <Kiosk />;
}
