import { useEffect, useState } from 'react';
import { api, lerErro } from '../services/api.js';
import { formatarMoeda } from '../services/validacoes.js';
import Campo from './Campo.jsx';
import Grafico from './Grafico.jsx';

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

const SETA = { aumento: '▲ Aumento', reducao: '▼ Redução', igual: '= Igual' };

function TabelaCategorias({ titulo, linhas }) {
  return (
    <div className="painel">
      <h3>{titulo}</h3>
      {linhas.length === 0 ? (
        <p className="aviso">Nada neste período.</p>
      ) : (
        <div className="tabela-rolavel">
          <table>
            <thead>
              <tr><th>Categoria</th><th>Total</th><th>%</th><th>Período anterior</th><th>Variação</th><th></th></tr>
            </thead>
            <tbody>
              {linhas.map((c) => (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>{formatarMoeda(c.total)}</td>
                  <td>{c.percentual.toFixed(1)}%</td>
                  <td>{formatarMoeda(c.periodoAnterior)}</td>
                  <td>
                    {formatarMoeda(c.variacao)}
                    {c.variacaoPercentual !== null && ` (${c.variacaoPercentual.toFixed(1)}%)`}
                  </td>
                  <td>{SETA[c.tendencia]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TabelaFontes({ titulo, linhas, campo }) {
  return (
    <div className="painel">
      <h3>{titulo}</h3>
      {linhas.length === 0 ? (
        <p className="aviso">Nada neste período.</p>
      ) : (
        <table>
          <thead><tr><th>Nome</th><th>Valor</th></tr></thead>
          <tbody>
            {linhas.map((f) => (
              <tr key={f.id}><td>{f.nome}</td><td>{formatarMoeda(f[campo])}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function Relatorios() {
  const [periodo, setPeriodo] = useState(mesAtual());
  const [cat, setCat] = useState(null);
  const [fon, setFon] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      setErro('');
      try {
        const [c, f] = await Promise.all([
          api.get('/relatorios/categorias', { params: periodo }),
          api.get('/relatorios/fontes-destinos', { params: periodo }),
        ]);
        setCat(c.data);
        setFon(f.data);
      } catch (e) {
        setErro(lerErro(e).mensagem);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [periodo]);

  function mudar(evento) {
    const { name, value } = evento.target;
    setPeriodo((p) => ({ ...p, [name]: value }));
  }

  return (
    <section>
      <h2>Relatórios</h2>

      <div className="painel">
        <div className="grade-form">
          <Campo rotulo="De" nome="inicio" tipo="date" valor={periodo.inicio} aoMudar={mudar} />
          <Campo rotulo="Até" nome="fim" tipo="date" valor={periodo.fim} aoMudar={mudar} />
        </div>
        {cat && (
          <p className="aviso">
            Período anterior comparado: {formatarData(cat.periodoAnterior.inicio)} a {formatarData(cat.periodoAnterior.fim)}
          </p>
        )}
      </div>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {carregando && <p className="aviso">Carregando...</p>}

      {!carregando && cat && fon && (
        <>
          <div className="totais">
            <div><span>Entradas</span><strong className="valor-entrada">{formatarMoeda(fon.totais.entradas)}</strong></div>
            <div><span>Saídas</span><strong className="valor-saida">{formatarMoeda(fon.totais.saidas)}</strong></div>
            <div><span>Saldo</span><strong>{formatarMoeda(fon.totais.saldo)}</strong></div>
          </div>

          <Grafico titulo="Gráfico: saídas por categoria" cor="#dc2626" itens={cat.saidas.map((c) => ({ nome: c.nome, valor: c.total }))} />
          <TabelaCategorias titulo="Saídas por categoria" linhas={cat.saidas} />
          <TabelaCategorias titulo="Entradas por categoria" linhas={cat.entradas} />
          <Grafico titulo="Gráfico: entradas por fonte" cor="#15803d" itens={fon.entradasPorFonte.map((f) => ({ nome: f.nome, valor: f.entradas }))} />
          <Grafico titulo="Gráfico: saídas por destino" cor="#dc2626" itens={fon.saidasPorDestino.map((f) => ({ nome: f.nome, valor: f.saidas }))} />
          <TabelaFontes titulo="Entradas por fonte" linhas={fon.entradasPorFonte} campo="entradas" />
          <TabelaFontes titulo="Saídas por destino" linhas={fon.saidasPorDestino} campo="saidas" />

          <div className="painel">
            <h3>Saldo por conta</h3>
            {fon.saldoContas.length === 0 ? (
              <p className="aviso">Nenhuma conta cadastrada.</p>
            ) : (
              <table>
                <thead><tr><th>Conta</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr></thead>
                <tbody>
                  {fon.saldoContas.map((c) => (
                    <tr key={c.id}>
                      <td>{c.nome}</td>
                      <td>{formatarMoeda(c.entradas)}</td>
                      <td>{formatarMoeda(c.saidas)}</td>
                      <td>{formatarMoeda(c.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </section>
  );
}

