import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import NewInvoice from './pages/NewInvoice';
import InvoiceList from './pages/InvoiceList';
import Clients from './pages/Clients';
import Products from './pages/Products';
import Settings from './pages/Settings';

import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rutas Privadas / Protegidas */}
          <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="invoice/list" element={<InvoiceList />} />
            <Route path="invoice/new" element={<NewInvoice />} />
            <Route path="clients" element={<Clients />} />
            <Route path="products" element={<Products />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
