import { useEffect, useState } from 'react';
import { api, lerErro } from '../services/api.js';
import { formatarMoeda } from '../services/validacoes.js';

export default function Dashboard() {
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api
      .get('/lancamentos')
      .then((resposta) => setResumo(resposta.data))
      .catch((e) => setErro(lerErro(e).mensagem));
  }, []);

  if (erro) return <p className="erro">{erro}</p>;
  if (!resumo) return <p className="aviso">Carregando...</p>;

  const { totais } = resumo;
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
    </section>
  );
}
