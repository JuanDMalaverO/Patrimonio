// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Cuentas from './pages/Cuentas';
import Transacciones from './pages/Transacciones';
import Presupuestos from './pages/Presupuestos';
import Categorias from './pages/Categorias';

// Rutas protegidas del app (requieren sesión activa)
function AppShell() {
  return (
    <ProtectedRoute>
      <Layout>
        <Routes>
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/cuentas"       element={<Cuentas />} />
          <Route path="/transacciones" element={<Transacciones />} />
          <Route path="/presupuestos"  element={<Presupuestos />} />
          <Route path="/categorias"    element={<Categorias />} />
          <Route path="*"              element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/"          element={<Landing />} />
        <Route path="/login"     element={<Login />} />
        <Route path="/register"  element={<Register />} />
        <Route path="/*"         element={<AppShell />} />
      </Routes>
    </AuthProvider>
  );
}
