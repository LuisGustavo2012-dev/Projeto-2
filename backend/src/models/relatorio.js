import { pool } from '../config/db.js';

const centavos = (v) => Math.round(Number(v) * 100);

// total por categoria no periodo e no periodo anterior
export async function porCategoria(usuarioId, tipo, periodo, anterior) {
  const { rows } = await pool.query(
    `SELECT c.id, c.nome,
            COALESCE(SUM(l.valor) FILTER (WHERE l.data BETWEEN $3 AND $4), 0) AS total,
            COALESCE(SUM(l.valor) FILTER (WHERE l.data BETWEEN $5 AND $6), 0) AS anterior
       FROM lancamentos l
       JOIN categorias c ON c.id = l.categoria_id
      WHERE l.usuario_id = $1 AND l.tipo = $2 AND l.data BETWEEN $5 AND $4
      GROUP BY c.id, c.nome
      ORDER BY total DESC, c.nome`,
    [usuarioId, tipo, periodo.inicio, periodo.fim, anterior.inicio, anterior.fim]
  );

  const totalCent = rows.reduce((s, r) => s + centavos(r.total), 0);
  const anteriorCent = rows.reduce((s, r) => s + centavos(r.anterior), 0);

  const categorias = rows.map((r) => {
    const total = centavos(r.total);
    const ant = centavos(r.anterior);
    return {
      id: r.id,
      nome: r.nome,
      total: total / 100,
      percentual: totalCent ? Math.round((total / totalCent) * 10000) / 100 : 0,
      periodoAnterior: ant / 100,
      variacao: (total - ant) / 100,
      variacaoPercentual: ant > 0 ? Math.round(((total - ant) / ant) * 10000) / 100 : null,
      tendencia: total > ant ? 'aumento' : total < ant ? 'reducao' : 'igual',
    };
  });

  return { total: totalCent / 100, totalAnterior: anteriorCent / 100, categorias };
}

export async function porFonteDestino(usuarioId, periodo) {
  const { rows } = await pool.query(
    `SELECT f.id, f.nome, f.tipo,
            COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'entrada'), 0) AS entradas,
            COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'saida'), 0) AS saidas
       FROM fontes_destinos f
       LEFT JOIN lancamentos l
              ON l.fonte_destino_id = f.id AND l.usuario_id = $1
             AND l.data BETWEEN $2 AND $3
      WHERE f.usuario_id = $1
      GROUP BY f.id, f.nome, f.tipo
      ORDER BY f.tipo, f.nome`,
    [usuarioId, periodo.inicio, periodo.fim]
  );
  return rows.map((r) => {
    const e = centavos(r.entradas);
    const s = centavos(r.saidas);
    return { id: r.id, nome: r.nome, tipo: r.tipo, entradas: e / 100, saidas: s / 100, saldo: (e - s) / 100 };
  });
}

// todas as saidas dos cartoes (as parcelas futuras tem a data da compra)
export async function lancamentosDosCartoes(usuarioId, idsCartoes) {
  if (!idsCartoes.length) return [];
  const { rows } = await pool.query(
    `SELECT l.id, l.descricao, l.valor, to_char(l.data, 'YYYY-MM-DD') AS data,
            l.fonte_destino_id AS "fonteDestinoId",
            l.parcela_atual AS "parcelaAtual", l.total_parcelas AS "totalParcelas",
            c.nome AS categoria
       FROM lancamentos l
       JOIN categorias c ON c.id = l.categoria_id
      WHERE l.usuario_id = $1 AND l.tipo = 'saida' AND l.fonte_destino_id = ANY($2)
      ORDER BY l.data, l.id`,
    [usuarioId, idsCartoes]
  );
  return rows;
}
