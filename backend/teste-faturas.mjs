import { calcularFatura } from './src/models/faturas.js';

const cartao = { diaFechamento: 10, diaVencimento: 17 };

const casos = [
  ['2026-11-09', 1],
  ['2026-11-10', 1],
  ['2026-11-15', 1],
  ['2026-12-20', 1],
  ['2026-11-15', 3],
];

for (const [data, parcela] of casos) {
  const f = calcularFatura(data, cartao, parcela);
  console.log(data, 'parcela', parcela, '->', f.referencia, 'fecha', f.fechamento, 'vence', f.vencimento);
}
