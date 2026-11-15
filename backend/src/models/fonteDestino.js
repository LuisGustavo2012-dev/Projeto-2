import { pool } from '../config/db.js';

const COLUNAS = `id, nome, tipo, dia_fechamento AS "diaFechamento",
                 dia_vencimento AS "diaVencimento", limite`;

export async function listar(usuarioId) {
  const { rows } = await pool.query(
    `SELECT ${COLUNAS} FROM fontes_destinos WHERE usuario_id = $1 ORDER BY tipo, nome`,
    [usuarioId]
  );
  return rows;
}

export async function buscar(usuarioId, id) {
  const { rows } = await pool.query(
    `SELECT ${COLUNAS} FROM fontes_destinos WHERE id = $1 AND usuario_id = $2`,
    [id, usuarioId]
  );
  return rows[0];
}

export async function criar(usuarioId, d) {
  const { rows } = await pool.query(
    `INSERT INTO fontes_destinos (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLUNAS}`,
    [usuarioId, d.nome, d.tipo, d.diaFechamento, d.diaVencimento, d.limite]
  );
  return rows[0];
}

export async function contarLancamentos(usuarioId, id) {
  const { rows } = await pool.query(
    'SELECT count(*)::int AS total FROM lancamentos WHERE fonte_destino_id = $1 AND usuario_id = $2',
    [id, usuarioId]
  );
  return rows[0].total;
}

export async function atualizar(usuarioId, id, d) {
  const { rows } = await pool.query(
    `UPDATE fontes_destinos
        SET nome = $3, tipo = $4, dia_fechamento = $5, dia_vencimento = $6, limite = $7
      WHERE id = $1 AND usuario_id = $2 RETURNING ${COLUNAS}`,
    [id, usuarioId, d.nome, d.tipo, d.diaFechamento, d.diaVencimento, d.limite]
  );
  return rows[0];
}

export async function excluir(usuarioId, id) {
  const { rowCount } = await pool.query(
    'DELETE FROM fontes_destinos WHERE id = $1 AND usuario_id = $2',
    [id, usuarioId]
  );
  return rowCount > 0;
}
