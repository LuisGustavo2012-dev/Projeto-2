import { useCallback, useEffect, useState } from 'react';
import { api, lerErro } from '../services/api.js';
import { formatarMoeda } from '../services/validacoes.js';
import Campo from './Campo.jsx';
import Selecao from './Selecao.jsx';

const pad = (n) => String(n).padStart(2, '0');
const isoData = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const formatarData = (s) => s.split('-').reverse().join('/');

function mesAtual() {
  const h = new Date();
  return {
    inicio: isoData(new Date(h.getFullYear(), h.getMonth(), 1)),
    fim: isoData(new Date(h.getFullYear(), h.getMonth() + 1, 0)),
  };
}

const TIPOS = [
  { valor: 'saida', texto: 'Saída' },
  { valor: 'entrada', texto: 'Entrada' },
];
const TIPOS_FILTRO = [{ valor: '', texto: 'Todos' }, ...TIPOS];

const formVazio = () => ({
  id: null,
  tipo: 'saida',
  descricao: '',
  valor: '',
  data: isoData(new Date()),
  categoriaId: '',
  fonteDestinoId: '',
  parcelas: '1',
});
const filtroInicial = () => ({ ...mesAtual(), tipo: '', categoriaId: '', fonteDestinoId: '' });
const dadosVazios = { itens: [], total: 0, totalPaginas: 0, totais: { entradas: 0, saidas: 0, saldo: 0 } };

export default function Lancamentos() {
  const [categorias, setCategorias] = useState([]);
  const [fontes, setFontes] = useState([]);
  const [filtro, setFiltro] = useState(filtroInicial());
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState(dadosVazios);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState(formVazio());
  const [campos, setCampos] = useState({});
  const [enviando, setEnviando] = useState(false);

  const fonteEscolhida = fontes.find((f) => String(f.id) === String(form.fonteDestinoId));
  const mostrarParcelas = !form.id && form.tipo === 'saida' && fonteEscolhida?.tipo === 'cartao_credito';

  useEffect(() => {
    async function carregarListas() {
      try {
        const [c, f] = await Promise.all([api.get('/categorias'), api.get('/fontes-destinos')]);
        setCategorias(c.data);
        setFontes(f.data);
      } catch (e) {
        setErro(lerErro(e).mensagem);
      }
    }
    carregarListas();
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const params = { pagina };
    Object.entries(filtro).forEach(([chave, valor]) => {
      if (valor !== '') params[chave] = valor;
    });
    try {
      const { data } = await api.get('/lancamentos', { params });
      setDados(data);
    } catch (e) {
      setErro(lerErro(e).mensagem);
    } finally {
      setCarregando(false);
    }
  }, [filtro, pagina]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function mudar(evento) {
    const { name, value } = evento.target;
    setForm((f) => (name === 'tipo' ? { ...f, tipo: value, categoriaId: '' } : { ...f, [name]: value }));
  }

  function mudarFiltro(evento) {
    const { name, value } = evento.target;
    setFiltro((f) => ({ ...f, [name]: value }));
    setPagina(1);
  }

  function limparFiltro() {
    setFiltro(filtroInicial());
    setPagina(1);
  }

  function editar(l) {
    setForm({
      id: l.id,
      tipo: l.tipo,
      descricao: l.descricao,
      valor: l.valor,
      data: l.data,
      categoriaId: String(l.categoriaId),
      fonteDestinoId: String(l.fonteDestinoId),
      parcelas: '1',
    });
    setCampos({});
    setErro('');
    window.scrollTo(0, 0);
  }

  function cancelar() {
    setForm(formVazio());
    setCampos({});
    setErro('');
  }

  async function salvar(evento) {
    evento.preventDefault();
    setErro('');
    setCampos({});
    setEnviando(true);
    try {
      const corpo = {
        tipo: form.tipo,
        descricao: form.descricao,
        valor: form.valor,
        data: form.data,
        categoriaId: form.categoriaId,
        fonteDestinoId: form.fonteDestinoId,
        parcelas: mostrarParcelas ? form.parcelas : 1,
      };
      if (form.id) await api.put(`/lancamentos/${form.id}`, corpo);
      else await api.post('/lancamentos', corpo);
      setForm(formVazio());
      await carregar();
    } catch (e) {
      const resposta = lerErro(e);
      setErro(resposta.mensagem);
      setCampos(resposta.campos);
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(l) {
    let todas = false;
    if (l.totalParcelas > 1) {
      todas = window.confirm(
        `"${l.descricao}" é parcelado.\nOK = excluir TODAS as parcelas.\nCancelar = escolher só esta.`
      );
      if (!todas && !window.confirm('Excluir só esta parcela?')) return;
    } else if (!window.confirm(`Excluir "${l.descricao}"?`)) {
      return;
    }
    setErro('');
    try {
      await api.delete(`/lancamentos/${l.id}`, { params: todas ? { todasParcelas: true } : {} });
      if (dados.itens.length === 1 && pagina > 1) setPagina(pagina - 1);
      else await carregar();
    } catch (e) {
      setErro(lerErro(e).mensagem);
    }
  }

  const opcoesCategoriaForm = [
    { valor: '', texto: 'Selecione' },
    ...categorias.filter((c) => c.tipo === form.tipo).map((c) => ({ valor: String(c.id), texto: c.nome })),
  ];
  const opcoesFonteForm = [
    { valor: '', texto: 'Selecione' },
    ...fontes.map((f) => ({ valor: String(f.id), texto: f.nome })),
  ];
  const opcoesCategoriaFiltro = [
    { valor: '', texto: 'Todas' },
    ...categorias.map((c) => ({ valor: String(c.id), texto: c.nome })),
  ];
  const opcoesFonteFiltro = [
    { valor: '', texto: 'Todas' },
    ...fontes.map((f) => ({ valor: String(f.id), texto: f.nome })),
  ];

  return (
    <section>
      <h2>Lançamentos</h2>

      <div className="painel">
        <h3>{form.id ? 'Editar lançamento' : 'Novo lançamento'}</h3>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <form onSubmit={salvar} noValidate>
          <div className="grade-form">
            <Selecao rotulo="Tipo" nome="tipo" valor={form.tipo} aoMudar={mudar} erro={campos.tipo} opcoes={TIPOS} />
            <Campo rotulo="Descrição" nome="descricao" valor={form.descricao} aoMudar={mudar} erro={campos.descricao} />
            <Campo rotulo="Valor (R$)" nome="valor" tipo="number" step="0.01" min="0"
              valor={form.valor} aoMudar={mudar} erro={campos.valor} />
            <Campo rotulo="Data" nome="data" tipo="date" valor={form.data} aoMudar={mudar} erro={campos.data} />
            <Selecao rotulo="Categoria" nome="categoriaId" valor={form.categoriaId} aoMudar={mudar}
              erro={campos.categoriaId} opcoes={opcoesCategoriaForm} />
            <Selecao rotulo="Fonte/Destino" nome="fonteDestinoId" valor={form.fonteDestinoId} aoMudar={mudar}
              erro={campos.fonteDestinoId} opcoes={opcoesFonteForm} />
            {mostrarParcelas && (
              <Campo rotulo="Parcelas" nome="parcelas" tipo="number" min="1" max="48"
                valor={form.parcelas} aoMudar={mudar} erro={campos.parcelas} />
            )}
            <div className="botoes">
              <button type="submit" disabled={enviando}>{form.id ? 'Salvar' : 'Adicionar'}</button>
              {form.id && <button type="button" className="secundario" onClick={cancelar}>Cancelar</button>}
            </div>
          </div>
        </form>
      </div>

      <div className="painel">
        <h3>Filtros</h3>
        <div className="grade-form">
          <Campo rotulo="De" nome="inicio" tipo="date" valor={filtro.inicio} aoMudar={mudarFiltro} />
          <Campo rotulo="Até" nome="fim" tipo="date" valor={filtro.fim} aoMudar={mudarFiltro} />
          <Selecao rotulo="Tipo" nome="tipo" valor={filtro.tipo} aoMudar={mudarFiltro} opcoes={TIPOS_FILTRO} />
          <Selecao rotulo="Categoria" nome="categoriaId" valor={filtro.categoriaId} aoMudar={mudarFiltro}
            opcoes={opcoesCategoriaFiltro} />
          <Selecao rotulo="Fonte/Destino" nome="fonteDestinoId" valor={filtro.fonteDestinoId} aoMudar={mudarFiltro}
            opcoes={opcoesFonteFiltro} />
          <div className="botoes">
            <button type="button" className="secundario" onClick={limparFiltro}>Limpar filtros</button>
          </div>
        </div>
      </div>

      <div className="totais">
        <div><span>Entradas</span><strong className="valor-entrada">{formatarMoeda(Number(dados.totais.entradas))}</strong></div>
        <div><span>Saídas</span><strong className="valor-saida">{formatarMoeda(Number(dados.totais.saidas))}</strong></div>
        <div><span>Saldo</span><strong>{formatarMoeda(Number(dados.totais.saldo))}</strong></div>
      </div>

      {carregando && <p className="aviso">Carregando...</p>}
      {!carregando && dados.itens.length === 0 && <p className="aviso">Nenhum lançamento neste período.</p>}
      {dados.itens.length > 0 && (
        <div className="tabela-rolavel">
          <table>
            <thead>
              <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Fonte/Destino</th><th>Valor</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {dados.itens.map((l) => (
                <tr key={l.id}>
                  <td>{formatarData(l.data)}</td>
                  <td>{l.descricao}{l.totalParcelas > 1 && ` — ${l.parcelaAtual}/${l.totalParcelas}`}</td>
                  <td>{l.categoria}</td>
                  <td>{l.fonteDestino}</td>
                  <td className={`valor-${l.tipo}`}>
                    {l.tipo === 'saida' ? '- ' : ''}{formatarMoeda(Number(l.valor))}
                  </td>
                  <td className="acoes">
                    <button className="secundario" onClick={() => editar(l)}>Editar</button>
                    <button className="perigo" onClick={() => excluir(l)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dados.totalPaginas > 1 && (
        <div className="paginacao">
          <button className="secundario" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
          <span>Página {pagina} de {dados.totalPaginas}</span>
          <button className="secundario" disabled={pagina >= dados.totalPaginas} onClick={() => setPagina(pagina + 1)}>Próxima</button>
        </div>
      )}
    </section>
  );
}
