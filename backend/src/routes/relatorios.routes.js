import { Router } from 'express';
import * as Relatorio from '../models/relatorio.js';
import * as FonteDestino from '../models/fonteDestino.js';
import { calcularFatura } from '../models/faturas.js';
import { autenticar } from '../middlewares/autenticar.js';
import { dataValida, mesAtual, periodoAnterior, hojeISO } from '../models/datas.js';

const router = Router();
router.use(autenticar);

function lerPeriodo(q) {
  const padrao = mesAtual();
  const inicio = q.inicio ?? padrao.inicio;
  const fim = q.fim ?? padrao.fim;
  const campos = {};
  if (!dataValida(inicio)) campos.inicio = 'Data inicial inválida (use AAAA-MM-DD).';
  if (!dataValida(fim)) campos.fim = 'Data final inválida (use AAAA-MM-DD).';
  if (!campos.inicio && !campos.fim && inicio > fim) campos.fim = 'A data final não pode ser anterior à inicial.';
  return { campos, periodo: { inicio, fim } };
}

// RF7: relatorio por categoria
router.get('/categorias', async (req, res, next) => {
  const { campos, periodo } = lerPeriodo(req.query);
  if (Object.keys(campos).length) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }
  try {
    const anterior = periodoAnterior(periodo.inicio, periodo.fim);
    const saidas = await Relatorio.porCategoria(req.usuarioId, 'saida', periodo, anterior);
    const entradas = await Relatorio.porCategoria(req.usuarioId, 'entrada', periodo, anterior);
    return res.json({
      periodo,
      periodoAnterior: anterior,
      totalSaidas: saidas.total,
      totalSaidasAnterior: saidas.totalAnterior,
      totalEntradas: entradas.total,
      totalEntradasAnterior: entradas.totalAnterior,
      saidas: saidas.categorias,
      entradas: entradas.categorias,
    });
  } catch (erro) {
    return next(erro);
  }
});

// RF8: relatorio por fonte/destino
router.get('/fontes-destinos', async (req, res, next) => {
  const { campos, periodo } = lerPeriodo(req.query);
  if (Object.keys(campos).length) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }
  try {
    const todas = await Relatorio.porFonteDestino(req.usuarioId, periodo);
    const soma = (campo) => todas.reduce((s, x) => s + Math.round(x[campo] * 100), 0) / 100;
    const entradas = soma('entradas');
    const saidas = soma('saidas');
    return res.json({
      periodo,
      entradasPorFonte: todas.filter((x) => x.entradas > 0).sort((a, b) => b.entradas - a.entradas),
      saidasPorDestino: todas.filter((x) => x.saidas > 0).sort((a, b) => b.saidas - a.saidas),
      saldoContas: todas.filter((x) => x.tipo === 'conta'),
      totais: { entradas, saidas, saldo: Math.round((entradas - saidas) * 100) / 100 },
    });
  } catch (erro) {
    return next(erro);
  }
});

// monta as faturas de um cartao: a aberta, as proximas e as fechadas ainda nao vencidas
function montarCartao(cartao, lancamentos, hoje, meses) {
  const regra = { diaFechamento: cartao.diaFechamento, diaVencimento: cartao.diaVencimento };
  const atual = calcularFatura(hoje, regra, 1);
  const faturas = new Map();

  const nova = (f) => ({
    referencia: f.referencia,
    status: f.referencia === atual.referencia ? 'aberta' : f.fechamento <= hoje ? 'fechada' : 'prevista',
    fechamento: f.fechamento,
    vencimento: f.vencimento,
    totalCent: 0,
    lancamentos: [],
  });

  for (let k = 0; k <= meses; k++) {
    const f = calcularFatura(hoje, regra, k + 1);
    faturas.set(f.referencia, nova(f));
  }
  const chaves = Array.from(faturas.keys());
  const ultimaDaJanela = chaves[chaves.length - 1];

  let usadoCent = 0;
  for (const l of lancamentos) {
    const f = calcularFatura(l.data, regra, l.parcelaAtual);
    if (f.vencimento < hoje) continue;              // fatura ja vencida: nao conta mais
    const cent = Math.round(Number(l.valor) * 100);
    usadoCent += cent;                              // limite comprometido

    let fatura = faturas.get(f.referencia);
    if (!fatura) {
      if (f.referencia > ultimaDaJanela) continue;  // alem da janela: so entra no limite
      fatura = nova(f);                             // fechada, aguardando vencimento
      faturas.set(f.referencia, fatura);
    }
    fatura.totalCent += cent;
    fatura.lancamentos.push({
      id: l.id,
      descricao: l.descricao,
      valor: cent / 100,
      data: l.data,
      parcela: `${l.parcelaAtual}/${l.totalParcelas}`,
      categoria: l.categoria,
    });
  }

  const limiteCent = Math.round(Number(cartao.limite) * 100);
  return {
    id: cartao.id,
    nome: cartao.nome,
    diaFechamento: cartao.diaFechamento,
    diaVencimento: cartao.diaVencimento,
    limite: limiteCent / 100,
    limiteUtilizado: usadoCent / 100,
    limiteDisponivel: (limiteCent - usadoCent) / 100,
    faturas: Array.from(faturas.values())
      .sort((a, b) => a.referencia.localeCompare(b.referencia))
      .map(({ totalCent, ...resto }) => ({ ...resto, total: totalCent / 100 })),
  };
}

// RF9: previsao de faturas
router.get('/faturas', async (req, res, next) => {
  const meses = req.query.meses === undefined ? 3 : Number(req.query.meses);
  if (!Number.isInteger(meses) || meses < 1 || meses > 12) {
    return res.status(400).json({
      erro: 'Dados inválidos.',
      campos: { meses: 'Informe a quantidade de meses (1 a 12).' },
    });
  }
  try {
    const hoje = hojeISO();
    const fontes = await FonteDestino.listar(req.usuarioId);
    const cartoes = fontes.filter((f) => f.tipo === 'cartao_credito');
    const lancamentos = await Relatorio.lancamentosDosCartoes(req.usuarioId, cartoes.map((c) => c.id));

    return res.json({
      hoje,
      cartoes: cartoes.map((c) =>
        montarCartao(c, lancamentos.filter((l) => l.fonteDestinoId === c.id), hoje, meses)
      ),
    });
  } catch (erro) {
    return next(erro);
  }
});

export default router;
