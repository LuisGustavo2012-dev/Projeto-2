import { useEffect, useState } from 'react';
import { api, lerErro } from '../services/api.js';
import { formatarMoeda } from '../services/validacoes.js';

const formatarData = (s) => s.split('-').reverse().join('/');

export default function Dashboard() {
  const [resumo, setResumo] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([api.get('/lancamentos'), api.get('/relatorios/categorias')])
      .then(([l, c]) => {
        setResumo(l.data);
        setCategorias(c.data.saidas.slice(0, 5));
      })
      .catch((e) => setErro(lerErro(e).mensagem));
  }, []);

  if (erro) return <p className="erro">{erro}</p>;
  if (!resumo) return <p className="aviso">Carregando...</p>;

  const { totais } = resumo;
  const ultimas = resumo.itens.slice(0, 5);

  return (
    <section>
      <h2>Resumo do mês</h2>
      <div className="cards">
        <div className="card">
          <span>Entradas</span>
          <strong className="positivo">{formatarMoeda(totais.entradas)}</strong>
        </div>
        <div className="card">
          <span>Saídas</span>
          <strong className="negativo">{formatarMoeda(totais.saidas)}</strong>
        </div>
        <div className="card">
          <span>Saldo</span>
          <strong className={Number(totais.saldo) >= 0 ? 'positivo' : 'negativo'}>
            {formatarMoeda(totais.saldo)}
          </strong>
        </div>
      </div>
      <p className="aviso">{resumo.total} lançamentos neste mês.</p>

      <div className="painel">
        <h3>Últimas movimentações</h3>
        {ultimas.length === 0 ? (
          <p className="aviso">Nenhum lançamento neste mês.</p>
        ) : (
          <table>
            <tbody>
              {ultimas.map((l) => (
                <tr key={l.id}>
                  <td>{formatarData(l.data)}</td>
                  <td>{l.descricao}</td>
                  <td className={`valor-${l.tipo}`}>
                    {l.tipo === 'saida' ? '- ' : ''}{formatarMoeda(Number(l.valor))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="painel">
        <h3>Maiores gastos por categoria</h3>
        {categorias.length === 0 ? (
          <p className="aviso">Nenhuma saída neste mês.</p>
        ) : (
          <table>
            <tbody>
              {categorias.map((c) => (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>{formatarMoeda(c.total)}</td>
                  <td>{c.percentual.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
