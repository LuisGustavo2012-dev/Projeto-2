import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function ProtectedRoute() {
  const { usuario, carregando } = useAuth();
  if (carregando) return <p className="aviso">Carregando...</p>;
  return usuario ? <Outlet /> : <Navigate to="/login" replace />;
}
