import { useEffect, useState } from 'react';
import { api, lerErro } from '../services/api.js';
import { formatarMoeda } from '../services/validacoes.js';
import Selecao from './Selecao.jsx';

const formatarData = (s) => s.split('-').reverse().join('/');
const formatarRef = (s) => s.split('-').reverse().join('/');
const STATUS = { aberta: 'Aberta', fechada: 'Fechada', prevista: 'Prevista' };
const MESES = [
  { valor: '3', texto: '3 meses' },
  { valor: '6', texto: '6 meses' },
  { valor: '12', texto: '12 meses' },
];

export default function Faturas() {
  const [meses, setMeses] = useState('3');
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      setErro('');
      try {
        const { data } = await api.get('/relatorios/faturas', { params: { meses } });
        setDados(data);
      } catch (e) {
        setErro(lerErro(e).mensagem);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [meses]);

  return (
    <section>
      <h2>Faturas</h2>

      <div className="painel">
        <div className="grade-form">
          <Selecao rotulo="Previsão para os próximos" nome="meses" valor={meses}
            aoMudar={(e) => setMeses(e.target.value)} opcoes={MESES} />
        </div>
      </div>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {carregando && <p className="aviso">Carregando...</p>}
      {!carregando && dados && dados.cartoes.length === 0 && (
        <p className="aviso">Nenhum cartão de crédito cadastrado.</p>
      )}

      {!carregando && dados && dados.cartoes.map((c) => (
        <div key={c.id} className="cartao">
          <h3>{c.nome}</h3>
          <div className="totais">
            <div><span>Limite</span><strong>{formatarMoeda(c.limite)}</strong></div>
            <div><span>Utilizado</span><strong className="valor-saida">{formatarMoeda(c.limiteUtilizado)}</strong></div>
            <div><span>Disponível</span><strong className="valor-entrada">{formatarMoeda(c.limiteDisponivel)}</strong></div>
          </div>

          {c.faturas.map((f) => (
            <div key={f.referencia} className="painel">
              <h4>
                Fatura {formatarRef(f.referencia)} · {STATUS[f.status]} · {formatarMoeda(f.total)}
              </h4>
              <p className="aviso">
                Fecha em {formatarData(f.fechamento)} · vence em {formatarData(f.vencimento)}
              </p>
              {f.lancamentos.length === 0 ? (
                <p className="aviso">Sem lançamentos nesta fatura.</p>
              ) : (
                <div className="tabela-rolavel">
                  <table>
                    <thead><tr><th>Compra</th><th>Descrição</th><th>Categoria</th><th>Parcela</th><th>Valor</th></tr></thead>
                    <tbody>
                      {f.lancamentos.map((l) => (
                        <tr key={l.id}>
                          <td>{formatarData(l.data)}</td>
                          <td>{l.descricao}</td>
                          <td>{l.categoria}</td>
                          <td>{l.parcela}</td>
                          <td>{formatarMoeda(l.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
