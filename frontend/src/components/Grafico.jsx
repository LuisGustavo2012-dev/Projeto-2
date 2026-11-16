import { formatarMoeda } from '../services/validacoes.js';

export default function Grafico({ titulo, itens, cor }) {
  if (itens.length === 0) return null;
  const maior = Math.max(...itens.map((i) => i.valor), 0);
  return (
    <div className="painel">
      <h3>{titulo}</h3>
      {itens.map((i, n) => (
        <div key={n} className="barra-linha">
          <span className="barra-nome">{i.nome}</span>
          <div className="barra-fundo">
            <div className="barra" style={{ width: `${maior ? (i.valor / maior) * 100 : 0}%`, background: cor }} />
          </div>
          <span className="barra-valor">{formatarMoeda(i.valor)}</span>
        </div>
      ))}
    </div>
  );
}
