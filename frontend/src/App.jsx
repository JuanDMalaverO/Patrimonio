// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Cuentas from './pages/Cuentas';
import Transacciones from './pages/Transacciones';
import Presupuestos from './pages/Presupuestos';
import Categorias from './pages/Categorias';

function AppShell() {
  return (
    <Layout>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cuentas" element={<Cuentas />} />
        <Route path="/transacciones" element={<Transacciones />} />
        <Route path="/presupuestos" element={<Presupuestos />} />
        <Route path="/categorias" element={<Categorias />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/*" element={<AppShell />} />
    </Routes>
  );
}
