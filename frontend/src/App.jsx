// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { TutorialProvider } from './contexts/TutorialContext.jsx';
import TutorialBar from './components/TutorialBar.jsx';
import TutorialSpotlight from './components/TutorialSpotlight.jsx';
import { CheckoutProvider } from './contexts/CheckoutContext.jsx';
import PagoResultado from './pages/PagoResultado';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Cuentas from './pages/Cuentas';
import Transacciones from './pages/Transacciones';
import Presupuestos from './pages/Presupuestos';
import Metas from './pages/Metas';
import Categorias from './pages/Categorias';
import Configuracion from './pages/Configuracion';

// Rutas protegidas con tutorial activo
function AppShell() {
  return (
    <ProtectedRoute>
      <TutorialProvider>
        <CheckoutProvider>
          <TutorialBar />
          <TutorialSpotlight />
          <Layout>
            <Routes>
              <Route path="/dashboard"     element={<Dashboard />} />
              <Route path="/cuentas"       element={<Cuentas />} />
              <Route path="/transacciones" element={<Transacciones />} />
              <Route path="/presupuestos"  element={<Presupuestos />} />
              <Route path="/metas"         element={<Metas />} />
              <Route path="/categorias"    element={<Categorias />} />
              <Route path="/configuracion" element={<Configuracion />} />
              <Route path="/pago/resultado" element={<PagoResultado />} />
              <Route path="*"              element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layout>
        </CheckoutProvider>
      </TutorialProvider>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/"         element={<Landing />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/*"        element={<AppShell />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
