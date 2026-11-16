import 'dotenv/config';
import bcrypt from 'bcrypt';
import { pool } from '../src/config/db.js';
import * as Usuario from '../src/models/usuario.js';
import * as Categoria from '../src/models/categoria.js';
import * as FonteDestino from '../src/models/fonteDestino.js';
import * as Lancamento from '../src/models/lancamento.js';

const hoje = new Date();
const pad = (n) => String(n).padStart(2, '0');

// data (AAAA-MM-DD) de N meses atras; no mes atual nunca passa de hoje
function data(mesesAtras, dia) {
  const base = new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras, 1);
  const ultimo = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  let d = Math.min(dia, ultimo);
  if (mesesAtras === 0) d = Math.min(d, hoje.getDate());
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(d)}`;
}

const cartao = (nome, fechamento, vencimento, limite) => ({
  nome, tipo: 'cartao_credito', diaFechamento: fechamento, diaVencimento: vencimento, limite,
});
const simples = (nome, tipo) => ({
  nome, tipo, diaFechamento: null, diaVencimento: null, limite: null,
});

async function criarUsuario(u) {
  const senhaHash = await bcrypt.hash(u.senha, 10);
  return Usuario.cadastrar({ nome: u.nome, email: u.email, cpf: u.cpf, senhaHash });
}

async function contexto(usuario) {
  const cats = await Categoria.listar(usuario.id);
  const fontes = await FonteDestino.listar(usuario.id);
  const achar = (lista, nome, tipo) => {
    const item = lista.find((x) => x.nome === nome && (!tipo || x.tipo === tipo));
    if (!item) throw new Error(`Nao encontrei "${nome}" para ${usuario.email}`);
    return item.id;
  };
  return {
    cat: (nome, tipo) => achar(cats, nome, tipo),
    fonte: (nome) => achar(fontes, nome),
    lancar: (tipo, descricao, valor, mesesAtras, dia, categoriaId, fonteDestinoId, parcelas = 1) =>
      Lancamento.criar(usuario.id, {
        tipo,
        descricao,
        centavos: Math.round(valor * 100),
        data: data(mesesAtras, dia),
        categoriaId,
        fonteDestinoId,
        parcelas,
      }),
  };
}

async function semearAna() {
  const ana = await criarUsuario({ nome: 'Ana Souza', email: 'ana@email.com', cpf: '52998224725', senha: 'senha1234' });
  await FonteDestino.criar(ana.id, cartao('Cartão Nubank', 3, 10, 5000));
  await FonteDestino.criar(ana.id, cartao('Visa Crédito', 25, 5, 8000));
  await FonteDestino.criar(ana.id, simples('Poupança', 'conta'));
  await FonteDestino.criar(ana.id, simples('Freelance', 'renda'));

  const a = await contexto(ana);
  const conta = a.fonte('Conta corrente');
  const salario = a.fonte('Salário');
  const freelance = a.fonte('Freelance');
  const poupanca = a.fonte('Poupança');
  const nubank = a.fonte('Cartão Nubank');
  const visa = a.fonte('Visa Crédito');

  for (const m of [2, 1, 0]) {
    const v = m * 40;
    await a.lancar('entrada', 'Salário', 4500, m, 5, a.cat('Salário'), salario);
    await a.lancar('entrada', 'Projeto freelance', 800 - v, m, 18, a.cat('Outras entradas'), freelance);
    await a.lancar('entrada', 'Rendimento da poupança', 35.2, m, 28, a.cat('Outras entradas'), poupanca);
    await a.lancar('saida', 'Aluguel', 1500, m, 6, a.cat('Moradia'), conta);
    await a.lancar('saida', 'Condomínio', 380, m, 7, a.cat('Moradia'), conta);
    await a.lancar('saida', 'Mercado', 230.4 + v, m, 8, a.cat('Alimentação'), nubank);
    await a.lancar('saida', 'Padaria e feira', 95.7, m, 14, a.cat('Alimentação'), conta);
    await a.lancar('saida', 'Supermercado', 312.1, m, 24, a.cat('Alimentação'), nubank);
    await a.lancar('saida', 'Transporte por aplicativo', 85.9 + v, m, 12, a.cat('Mobilidade'), nubank);
    await a.lancar('saida', 'Combustível', 180, m, 20, a.cat('Mobilidade'), conta);
    await a.lancar('saida', 'Farmácia', 64.3, m, 10, a.cat('Saúde'), conta);
    await a.lancar('saida', 'Cinema e jantar', 120 + v, m, 19, a.cat('Lazer'), visa);
  }

  // compras parceladas
  await a.lancar('saida', 'Notebook', 3600, 2, 10, a.cat('Educação'), visa, 12);
  await a.lancar('saida', 'Celular', 1800, 1, 14, a.cat('Outros'), nubank, 6);
  await a.lancar('saida', 'Geladeira', 2400, 0, 3, a.cat('Moradia'), visa, 10);
}

async function semearBruno() {
  const bruno = await criarUsuario({ nome: 'Bruno Lima', email: 'bruno@email.com', cpf: '11144477735', senha: 'senha1234' });
  await FonteDestino.criar(bruno.id, cartao('Cartão Inter', 15, 22, 3000));

  const b = await contexto(bruno);
  const conta = b.fonte('Conta corrente');
  const salario = b.fonte('Salário');
  const inter = b.fonte('Cartão Inter');

  for (const m of [2, 1, 0]) {
    const v = m * 25;
    await b.lancar('entrada', 'Salário', 3200, m, 5, b.cat('Salário'), salario);
    await b.lancar('saida', 'Aluguel', 900, m, 10, b.cat('Moradia'), conta);
    await b.lancar('saida', 'Mercado', 410.5 + v, m, 9, b.cat('Alimentação'), inter);
    await b.lancar('saida', 'Transporte', 150, m, 11, b.cat('Mobilidade'), conta);
    await b.lancar('saida', 'Academia', 99.9, m, 4, b.cat('Saúde'), conta);
    await b.lancar('saida', 'Streaming e lazer', 79.9 + v, m, 17, b.cat('Lazer'), inter);
  }
  await b.lancar('saida', 'TV 50 polegadas', 1500, 1, 8, b.cat('Lazer'), inter, 5);
}

async function main() {
  await pool.query('TRUNCATE usuarios RESTART IDENTITY CASCADE');
  await semearAna();
  await semearBruno();

  const { rows } = await pool.query(
    `SELECT u.email, count(l.id)::int AS lancamentos,
            to_char(min(l.data), 'YYYY-MM-DD') AS primeiro, to_char(max(l.data), 'YYYY-MM-DD') AS ultimo
       FROM usuarios u LEFT JOIN lancamentos l ON l.usuario_id = u.id
      GROUP BY u.email ORDER BY u.email`
  );
  console.table(rows);
  console.log('Seed concluido. Usuarios: ana@email.com e bruno@email.com (senha: senha1234)');
}

main()
  .catch((erro) => {
    console.error('Erro no seed:', erro);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
