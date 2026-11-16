import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Layout() {
  const { usuario, logout } = useAuth();
  return (
    <div className="app">
      <header className="topo">
        <h1>Controle Financeiro</h1>
        <div className="usuario">
          <span>{usuario.nome}</span>
          <button className="secundario" onClick={logout}>Sair</button>
        </div>
      </header>
      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  );
}
