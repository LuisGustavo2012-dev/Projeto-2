export default function Campo({ rotulo, nome, tipo = 'text', valor, aoMudar, erro, ...resto }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      <input
        type={tipo}
        name={nome}
        value={valor}
        onChange={aoMudar}
        className={erro ? 'invalido' : ''}
        {...resto}
      />
      {erro && <small className="erro">{erro}</small>}
    </label>
  );
}
