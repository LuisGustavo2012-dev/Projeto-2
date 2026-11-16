export default function Selecao({ rotulo, nome, valor, aoMudar, erro, opcoes }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      <select name={nome} value={valor} onChange={aoMudar} className={erro ? 'invalido' : ''}>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>{o.texto}</option>
        ))}
      </select>
      {erro && <small className="erro">{erro}</small>}
    </label>
  );
}
