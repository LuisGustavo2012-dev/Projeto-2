import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { lerErro } from '../services/api.js';
import Campo from './Campo.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [campos, setCampos] = useState({});
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    setErro('');
    setCampos({});
    setEnviando(true);
    try {
      await login(email.trim(), senha);
      navigate('/', { replace: true });
    } catch (e) {
      const resposta = lerErro(e);
      setErro(resposta.mensagem);
      setCampos(resposta.campos);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="autenticacao">
      <h2>Entrar</h2>
      {state?.aviso && <p className="sucesso">{state.aviso}</p>}
      {erro && <p className="erro" role="alert">{erro}</p>}
      <form onSubmit={enviar} noValidate>
        <Campo rotulo="E-mail" nome="email" tipo="email" valor={email}
          aoMudar={(e) => setEmail(e.target.value)} erro={campos.email} autoComplete="email" />
        <Campo rotulo="Senha" nome="senha" tipo="password" valor={senha}
          aoMudar={(e) => setSenha(e.target.value)} erro={campos.senha} autoComplete="current-password" />
        <button type="submit" disabled={enviando}>{enviando ? 'Entrando...' : 'Entrar'}</button>
      </form>
      <p>Não tem conta? <Link to="/cadastro">Cadastre-se</Link></p>
    </div>
  );
}
