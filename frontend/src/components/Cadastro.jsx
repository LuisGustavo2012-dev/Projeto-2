import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { lerErro } from '../services/api.js';
import { cpfValido, mascararCpf } from '../services/validacoes.js';
import Campo from './Campo.jsx';

const vazio = { nome: '', email: '', cpf: '', senha: '', confirmacaoSenha: '' };

// validacao do cliente (complementar: o servidor valida de novo)
function validar(f) {
  const e = {};
  if (!f.nome.trim()) e.nome = 'Informe o nome.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'E-mail inválido.';
  if (!cpfValido(f.cpf)) e.cpf = 'CPF inválido.';
  if (f.senha.length < 8 || !/[A-Za-z]/.test(f.senha) || !/\d/.test(f.senha)) {
    e.senha = 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
  }
  if (f.senha !== f.confirmacaoSenha) e.confirmacaoSenha = 'As senhas não conferem.';
  return e;
}

export default function Cadastro() {
  const { cadastrar } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(vazio);
  const [campos, setCampos] = useState({});
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  function mudar(evento) {
    const { name, value } = evento.target;
    setForm((f) => ({ ...f, [name]: name === 'cpf' ? mascararCpf(value) : value }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErro('');
    const locais = validar(form);
    setCampos(locais);
    if (Object.keys(locais).length) return;

    setEnviando(true);
    try {
      await cadastrar({ ...form, nome: form.nome.trim(), email: form.email.trim() });
      navigate('/login', { state: { aviso: 'Cadastro realizado! Faça login para continuar.' } });
    } catch (e) {
      const resposta = lerErro(e);
      setErro(resposta.mensagem);
      setCampos(resposta.campos);   // ex.: "Já existe um usuário com este CPF." junto ao campo
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="autenticacao">
      <h2>Criar conta</h2>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <form onSubmit={enviar} noValidate>
        <Campo rotulo="Nome" nome="nome" valor={form.nome} aoMudar={mudar} erro={campos.nome} />
        <Campo rotulo="E-mail" nome="email" tipo="email" valor={form.email} aoMudar={mudar} erro={campos.email} />
        <Campo rotulo="CPF" nome="cpf" valor={form.cpf} aoMudar={mudar} erro={campos.cpf} placeholder="000.000.000-00" />
        <Campo rotulo="Senha" nome="senha" tipo="password" valor={form.senha} aoMudar={mudar} erro={campos.senha} />
        <Campo rotulo="Confirmar senha" nome="confirmacaoSenha" tipo="password" valor={form.confirmacaoSenha}
          aoMudar={mudar} erro={campos.confirmacaoSenha} />
        <button type="submit" disabled={enviando}>{enviando ? 'Enviando...' : 'Cadastrar'}</button>
      </form>
      <p>Já tem conta? <Link to="/login">Entrar</Link></p>
    </div>
  );
}
