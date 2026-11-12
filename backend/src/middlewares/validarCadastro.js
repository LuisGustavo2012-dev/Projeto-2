import { cpfValido } from '../models/validacoes.js';

const texto = (v) => (typeof v === 'string' ? v : '');

export function validarCadastro(req, res, next) {
  const { nome, email, cpf, senha, confirmacaoSenha } = req.body ?? {};
  const campos = {};

  if (!texto(nome).trim()) campos.nome = 'Informe o nome.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto(email).trim())) campos.email = 'E-mail inválido.';
  if (!cpfValido(texto(cpf))) campos.cpf = 'CPF inválido.';
  if (texto(senha).length < 8 || !/[A-Za-z]/.test(senha) || !/\d/.test(senha)) {
    campos.senha = 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
  }
  if (senha !== confirmacaoSenha) campos.confirmacaoSenha = 'As senhas não conferem.';

  if (Object.keys(campos).length) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }
  next();
}