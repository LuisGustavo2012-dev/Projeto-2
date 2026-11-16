import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, guardarToken, lerToken, limparToken, definirAoNaoAutorizado } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(lerToken());
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(Boolean(lerToken()));

  const logout = useCallback(() => {
    limparToken();
    setToken(null);
    setUsuario(null);
  }, []);

  // token expirado (401) em qualquer requisicao: sai e volta ao login
  useEffect(() => {
    definirAoNaoAutorizado(logout);
  }, [logout]);

  // ao abrir ou recarregar a pagina, confirma o token guardado
  useEffect(() => {
    if (!lerToken()) return;
    api
      .get('/auth/me')
      .then((resposta) => setUsuario(resposta.data))
      .catch(() => logout())
      .finally(() => setCarregando(false));
  }, [logout]);

  async function login(email, senha) {
    const { data } = await api.post('/auth/login', { email, senha });
    guardarToken(data.token);
    setToken(data.token);
    setUsuario(data.usuario);
  }

  async function cadastrar(dados) {
    const { data } = await api.post('/auth/cadastro', dados);
    return data;
  }

  return (
    <AuthContext.Provider value={{ usuario, token, carregando, login, logout, cadastrar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
