import axios from 'axios';

const CHAVE = 'token';

// ponto unico de comunicacao com a API
export const api = axios.create({ baseURL: 'http://localhost:3000/api' });

export const guardarToken = (token) => localStorage.setItem(CHAVE, token);
export const lerToken = () => localStorage.getItem(CHAVE);
export const limparToken = () => localStorage.removeItem(CHAVE);

// o AuthContext registra aqui o que fazer quando a API responde 401
let aoNaoAutorizado = () => {};
export function definirAoNaoAutorizado(funcao) {
  aoNaoAutorizado = funcao;
}

// envia o token em todas as requisicoes
api.interceptors.request.use((config) => {
  const token = lerToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 fora do login/cadastro: descarta o token e volta ao login
api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const url = erro.config?.url ?? '';
    const ehAutenticacao = url.includes('/auth/login') || url.includes('/auth/cadastro');
    if (erro.response?.status === 401 && !ehAutenticacao) aoNaoAutorizado();
    return Promise.reject(erro);
  }
);

// extrai a mensagem e os erros por campo no formato { erro, campos }
export function lerErro(erro) {
  if (!erro.response) {
    return { mensagem: 'Não foi possível conectar ao servidor.', campos: {} };
  }
  const dados = erro.response.data;
  return { mensagem: dados?.erro ?? 'Erro inesperado.', campos: dados?.campos ?? {} };
}
