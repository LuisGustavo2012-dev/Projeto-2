import { pool } from '../config/db.js';

const COLUNAS = 'id, nome, tipo';

export async function listar(usuarioId) {
  const { rows } = await pool.query(
    `SELECT ${COLUNAS} FROM categorias WHERE usuario_id = $1 ORDER BY tipo, nome`,
    [usuarioId]
  );
  return rows;
}

export async function buscar(usuarioId, id) {
  const { rows } = await pool.query(
    `SELECT ${COLUNAS} FROM categorias WHERE id = $1 AND usuario_id = $2`,
    [id, usuarioId]
  );
  return rows[0];
}

export async function criar(usuarioId, { nome, tipo }) {
  const { rows } = await pool.query(
    `INSERT INTO categorias (usuario_id, nome, tipo) VALUES ($1, $2, $3) RETURNING ${COLUNAS}`,
    [usuarioId, nome, tipo]
  );
  return rows[0];
}

export async function contarLancamentos(usuarioId, id) {
  const { rows } = await pool.query(
    'SELECT count(*)::int AS total FROM lancamentos WHERE categoria_id = $1 AND usuario_id = $2',
    [id, usuarioId]
  );
  return rows[0].total;
}

export async function atualizar(usuarioId, id, { nome, tipo }) {
  const { rows } = await pool.query(
    `UPDATE categorias SET nome = $3, tipo = $4
      WHERE id = $1 AND usuario_id = $2 RETURNING ${COLUNAS}`,
    [id, usuarioId, nome, tipo]
  );
  return rows[0];
}

export async function excluir(usuarioId, id) {
  const { rowCount } = await pool.query(
    'DELETE FROM categorias WHERE id = $1 AND usuario_id = $2',
    [id, usuarioId]
  );
  return rowCount > 0;
}
