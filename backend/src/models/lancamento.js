import { randomUUID } from 'node:crypto';
import { pool } from '../config/db.js';

const SELECT_BASE = `
  SELECT l.id, l.tipo, l.descricao, l.valor, to_char(l.data, 'YYYY-MM-DD') AS data,
         l.categoria_id AS "categoriaId", c.nome AS categoria,
         l.fonte_destino_id AS "fonteDestinoId", f.nome AS "fonteDestino",
         l.parcela_atual AS "parcelaAtual", l.total_parcelas AS "totalParcelas",
         l.grupo_parcelamento AS "grupoParcelamento"
    FROM lancamentos l
    JOIN categorias c ON c.id = l.categoria_id
    JOIN fontes_destinos f ON f.id = l.fonte_destino_id`;

// divide em centavos; a diferenca de arredondamento vai para a primeira parcela
export function dividirEmParcelas(totalCentavos, n) {
  const base = Math.floor(totalCentavos / n);
  const resto = totalCentavos - base * n;
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + resto : base));
}

const emReais = (centavos) => (centavos / 100).toFixed(2);

// soma N meses a uma data AAAA-MM-DD, mantendo o dia (ajusta para o ultimo dia do mes se preciso)
function somarMeses(iso, n) {
  const [a, m, dia] = iso.split('-').map(Number);
  const total = (m - 1) + n;
  const ano = a + Math.floor(total / 12);
  const mes = total % 12;
  const ultimo = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const diaFinal = Math.min(dia, ultimo);
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`;
}
export async function criar(usuarioId, d) {
  const partes = dividirEmParcelas(d.centavos, d.parcelas);
  const grupo = d.parcelas > 1 ? randomUUID() : null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ids = [];
    for (let i = 0; i < partes.length; i++) {
      const { rows } = await client.query(
        `INSERT INTO lancamentos
           (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id,
            parcela_atual, total_parcelas, grupo_parcelamento)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [usuarioId, d.tipo, d.descricao, emReais(partes[i]), somarMeses(d.data, i),
         d.categoriaId, d.fonteDestinoId, i + 1, d.parcelas, grupo]
      );
      ids.push(rows[0].id);
    }
    await client.query('COMMIT');
    const { rows } = await pool.query(
      `${SELECT_BASE} WHERE l.usuario_id = $1 AND l.id = ANY($2) ORDER BY l.parcela_atual`,
      [usuarioId, ids]
    );
    return rows;
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
}

export async function buscar(usuarioId, id) {
  const { rows } = await pool.query(
    `${SELECT_BASE} WHERE l.id = $1 AND l.usuario_id = $2`,
    [id, usuarioId]
  );
  return rows[0];
}

function montarFiltro(usuarioId, f) {
  const cond = ['l.usuario_id = $1'];
  const params = [usuarioId];
  const add = (sql, valor) => {
    params.push(valor);
    cond.push(sql.replace('?', `$${params.length}`));
  };
  add('l.data >= ?', f.inicio);
  add('l.data <= ?', f.fim);
  if (f.tipo) add('l.tipo = ?', f.tipo);
  if (f.categoriaId) add('l.categoria_id = ?', f.categoriaId);
  if (f.fonteDestinoId) add('l.fonte_destino_id = ?', f.fonteDestinoId);
  return { where: cond.join(' AND '), params };
}

export async function listar(usuarioId, f) {
  const { where, params } = montarFiltro(usuarioId, f);

  const resumo = await pool.query(
    `SELECT count(*)::int AS total,
            COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'entrada'), 0) AS entradas,
            COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'saida'), 0) AS saidas,
            COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'entrada'), 0)
              - COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'saida'), 0) AS saldo
       FROM lancamentos l WHERE ${where}`,
    params
  );
  const { total, entradas, saidas, saldo } = resumo.rows[0];

  const itens = await pool.query(
    `${SELECT_BASE} WHERE ${where}
      ORDER BY l.data DESC, l.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, f.porPagina, (f.pagina - 1) * f.porPagina]
  );

  return {
    itens: itens.rows,
    pagina: f.pagina,
    porPagina: f.porPagina,
    total,
    totalPaginas: Math.ceil(total / f.porPagina),
    totais: { entradas, saidas, saldo },
  };
}

export async function atualizar(usuarioId, id, d) {
  await pool.query(
    `UPDATE lancamentos
        SET tipo = $3, descricao = $4, valor = $5, data = $6,
            categoria_id = $7, fonte_destino_id = $8
      WHERE id = $1 AND usuario_id = $2`,
    [id, usuarioId, d.tipo, d.descricao, emReais(d.centavos), d.data, d.categoriaId, d.fonteDestinoId]
  );
  return buscar(usuarioId, id);
}

export async function excluir(usuarioId, atual, todasParcelas) {
  if (todasParcelas && atual.grupoParcelamento) {
    await pool.query(
      'DELETE FROM lancamentos WHERE usuario_id = $1 AND grupo_parcelamento = $2',
      [usuarioId, atual.grupoParcelamento]
    );
  } else {
    await pool.query(
      'DELETE FROM lancamentos WHERE usuario_id = $1 AND id = $2',
      [usuarioId, atual.id]
    );
  }
}

