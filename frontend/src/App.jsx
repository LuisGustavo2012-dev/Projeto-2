import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import Login from './components/Login.jsx';
import Cadastro from './components/Cadastro.jsx';
import Dashboard from './components/Dashboard.jsx';
import Categorias from './components/Categorias.jsx';
import FontesDestinos from './components/FontesDestinos.jsx';
import Lancamentos from './components/Lancamentos.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/categorias" element={<Categorias />} />
          <Route path="/fontes-destinos" element={<FontesDestinos />} />
          <Route path="/lancamentos" element={<Lancamentos />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

