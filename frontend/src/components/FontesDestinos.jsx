import { useCallback, useEffect, useState } from 'react';
import { api, lerErro } from '../services/api.js';
import { formatarMoeda } from '../services/validacoes.js';
import Campo from './Campo.jsx';
import Selecao from './Selecao.jsx';

const TIPOS = [
  { valor: 'conta', texto: 'Conta' },
  { valor: 'renda', texto: 'Renda (origem de entradas)' },
  { valor: 'cartao_credito', texto: 'Cartão de crédito' },
];
const TEXTO_TIPO = { conta: 'Conta', renda: 'Renda', cartao_credito: 'Cartão de crédito' };
const vazio = { id: null, nome: '', tipo: 'conta', diaFechamento: '', diaVencimento: '', limite: '' };

export default function FontesDestinos() {
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState(vazio);
  const [campos, setCampos] = useState({});
  const [enviando, setEnviando] = useState(false);

  const ehCartao = form.tipo === 'cartao_credito';

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get('/fontes-destinos');
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

  function editar(item) {
    setForm({
      id: item.id,
      nome: item.nome,
      tipo: item.tipo,
      diaFechamento: item.diaFechamento ?? '',
      diaVencimento: item.diaVencimento ?? '',
      limite: item.limite ?? '',
    });
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
      if (ehCartao) {
        corpo.diaFechamento = form.diaFechamento;
        corpo.diaVencimento = form.diaVencimento;
        corpo.limite = form.limite;
      }
      if (form.id) await api.put(`/fontes-destinos/${form.id}`, corpo);
      else await api.post('/fontes-destinos', corpo);
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

  async function excluir(item) {
    if (!window.confirm(`Excluir "${item.nome}"?`)) return;
    setErro('');
    try {
      await api.delete(`/fontes-destinos/${item.id}`);
      await carregar();
    } catch (e) {
      setErro(lerErro(e).mensagem);
    }
  }

  return (
    <section>
      <h2>Fontes e destinos</h2>

      <div className="painel">
        <h3>{form.id ? 'Editar' : 'Nova fonte/destino'}</h3>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <form onSubmit={salvar} noValidate>
          <div className="grade-form">
            <Campo rotulo="Nome" nome="nome" valor={form.nome} aoMudar={mudar} erro={campos.nome} />
            <Selecao rotulo="Tipo" nome="tipo" valor={form.tipo} aoMudar={mudar} erro={campos.tipo} opcoes={TIPOS} />
            {ehCartao && (
              <>
                <Campo rotulo="Dia de fechamento" nome="diaFechamento" tipo="number" min="1" max="31"
                  valor={form.diaFechamento} aoMudar={mudar} erro={campos.diaFechamento} />
                <Campo rotulo="Dia de vencimento" nome="diaVencimento" tipo="number" min="1" max="31"
                  valor={form.diaVencimento} aoMudar={mudar} erro={campos.diaVencimento} />
                <Campo rotulo="Limite (R$)" nome="limite" tipo="number" step="0.01" min="0"
                  valor={form.limite} aoMudar={mudar} erro={campos.limite} />
              </>
            )}
            <div className="botoes">
              <button type="submit" disabled={enviando}>{form.id ? 'Salvar' : 'Adicionar'}</button>
              {form.id && <button type="button" className="secundario" onClick={cancelar}>Cancelar</button>}
            </div>
          </div>
        </form>
      </div>

      {carregando && <p className="aviso">Carregando...</p>}
      {!carregando && lista.length === 0 && <p className="aviso">Nada cadastrado ainda.</p>}
      {lista.length > 0 && (
        <div className="tabela-rolavel">
          <table>
            <thead>
              <tr><th>Nome</th><th>Tipo</th><th>Fecha dia</th><th>Vence dia</th><th>Limite</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {lista.map((f) => (
                <tr key={f.id}>
                  <td>{f.nome}</td>
                  <td>{TEXTO_TIPO[f.tipo]}</td>
                  <td>{f.diaFechamento ?? '-'}</td>
                  <td>{f.diaVencimento ?? '-'}</td>
                  <td>{f.limite ? formatarMoeda(f.limite) : '-'}</td>
                  <td className="acoes">
                    <button className="secundario" onClick={() => editar(f)}>Editar</button>
                    <button className="perigo" onClick={() => excluir(f)}>Excluir</button>
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
