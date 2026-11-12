import { pool } from '../config/db.js';

const CATEGORIAS_PADRAO = [
  ['Salário', 'entrada'], ['Outras entradas', 'entrada'],
  ['Alimentação', 'saida'], ['Moradia', 'saida'], ['Saúde', 'saida'],
  ['Mobilidade', 'saida'], ['Lazer', 'saida'], ['Educação', 'saida'], ['Outros', 'saida'],
];

export async function cadastrar({ nome, email, cpf, senhaHash }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO usuarios (nome, email, cpf, senha_hash)
       VALUES ($1, $2, $3, $4) RETURNING id, nome, email`,
      [nome, email, cpf, senhaHash]
    );
    const usuario = rows[0];
    for (const [nomeCat, tipo] of CATEGORIAS_PADRAO) {
      await client.query(
        'INSERT INTO categorias (usuario_id, nome, tipo) VALUES ($1, $2, $3)',
        [usuario.id, nomeCat, tipo]
      );
    }
    await client.query(
      `INSERT INTO fontes_destinos (usuario_id, nome, tipo)
       VALUES ($1, 'Conta corrente', 'conta'), ($1, 'Salário', 'renda')`,
      [usuario.id]
    );
    await client.query('COMMIT');
    return usuario;
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
}
