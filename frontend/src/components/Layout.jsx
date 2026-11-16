import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const LINKS = [
  { para: '/', texto: 'Resumo', exato: true },
  { para: '/categorias', texto: 'Categorias' },
  { para: '/fontes-destinos', texto: 'Fontes/Destinos' },
  { para: '/lancamentos', texto: 'Lançamentos' },
];

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
      <nav className="menu">
        {LINKS.map((l) => (
          <NavLink key={l.para} to={l.para} end={l.exato}>{l.texto}</NavLink>
        ))}
      </nav>
      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  );
}

