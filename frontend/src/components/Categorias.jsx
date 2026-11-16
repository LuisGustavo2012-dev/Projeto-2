import { useCallback, useEffect, useState } from 'react';
import { api, lerErro } from '../services/api.js';
import Campo from './Campo.jsx';
import Selecao from './Selecao.jsx';

const TIPOS = [
  { valor: 'saida', texto: 'Saída' },
  { valor: 'entrada', texto: 'Entrada' },
];
const vazio = { id: null, nome: '', tipo: 'saida' };

export default function Categorias() {
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState(vazio);
  const [campos, setCampos] = useState({});
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get('/categorias');
      setLista(data);
    } catch (e) {
      setErro(lerErro(e).mensagem);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function mudar(evento) {
    const { name, value } = evento.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function editar(categoria) {
    setForm({ id: categoria.id, nome: categoria.nome, tipo: categoria.tipo });
    setCampos({});
    setErro('');
  }

  function cancelar() {
    setForm(vazio);
    setCampos({});
    setErro('');
  }

  async function salvar(evento) {
    evento.preventDefault();
    setErro('');
    setCampos({});
    setEnviando(true);
    try {
      const corpo = { nome: form.nome, tipo: form.tipo };
      if (form.id) await api.put(`/categorias/${form.id}`, corpo);
      else await api.post('/categorias', corpo);
      setForm(vazio);
      await carregar();
    } catch (e) {
      const resposta = lerErro(e);
      setErro(resposta.mensagem);
      setCampos(resposta.campos);
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(categoria) {
    if (!window.confirm(`Excluir a categoria "${categoria.nome}"?`)) return;
    setErro('');
    try {
      await api.delete(`/categorias/${categoria.id}`);
      await carregar();
    } catch (e) {
      setErro(lerErro(e).mensagem);
    }
  }

  return (
    <section>
      <h2>Categorias</h2>

      <div className="painel">
        <h3>{form.id ? 'Editar categoria' : 'Nova categoria'}</h3>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <form onSubmit={salvar} noValidate>
          <div className="grade-form">
            <Campo rotulo="Nome" nome="nome" valor={form.nome} aoMudar={mudar} erro={campos.nome} />
            <Selecao rotulo="Tipo" nome="tipo" valor={form.tipo} aoMudar={mudar} erro={campos.tipo} opcoes={TIPOS} />
            <div className="botoes">
              <button type="submit" disabled={enviando}>{form.id ? 'Salvar' : 'Adicionar'}</button>
              {form.id && <button type="button" className="secundario" onClick={cancelar}>Cancelar</button>}
            </div>
          </div>
        </form>
      </div>

      {carregando && <p className="aviso">Carregando...</p>}
      {!carregando && lista.length === 0 && <p className="aviso">Nenhuma categoria cadastrada.</p>}
      {lista.length > 0 && (
        <div className="tabela-rolavel">
          <table>
            <thead>
              <tr><th>Nome</th><th>Tipo</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>{c.tipo === 'entrada' ? 'Entrada' : 'Saída'}</td>
                  <td className="acoes">
                    <button className="secundario" onClick={() => editar(c)}>Editar</button>
                    <button className="perigo" onClick={() => excluir(c)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
