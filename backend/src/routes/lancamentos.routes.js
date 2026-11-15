import { Router } from 'express';
import * as Lancamento from '../models/lancamento.js';
import * as Categoria from '../models/categoria.js';
import * as FonteDestino from '../models/fonteDestino.js';
import { autenticar } from '../middlewares/autenticar.js';
import { validarId } from '../middlewares/validarId.js';

const router = Router();
router.use(autenticar);

const dataValida = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [a, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

const idValido = (v) => {
  if (typeof v !== 'number' && typeof v !== 'string') return false;
  if (v === '') return false;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= 2147483647;
};

function validar(body) {
  const b = body ?? {};
  const campos = {};
  const dados = {};

  if (!['entrada', 'saida'].includes(b.tipo)) campos.tipo = 'O tipo deve ser "entrada" ou "saida".';
  else dados.tipo = b.tipo;

  if (typeof b.descricao !== 'string' || !b.descricao.trim()) campos.descricao = 'Informe a descrição.';
  else if (b.descricao.trim().length > 120) campos.descricao = 'A descrição deve ter no máximo 120 caracteres.';
  else dados.descricao = b.descricao.trim();

  const v = Number(b.valor);
  const centavos = Math.round(v * 100);
  if (b.valor === undefined || b.valor === null || b.valor === '' || !Number.isFinite(v)
      || v <= 0 || v >= 1e10 || Math.abs(v * 100 - centavos) > 1e-6) {
    campos.valor = 'O valor deve ser maior que zero, com no máximo 2 casas decimais.';
  } else {
    dados.centavos = centavos;
  }

  if (!dataValida(b.data)) campos.data = 'Informe uma data válida (AAAA-MM-DD).';
  else dados.data = b.data;

  if (!idValido(b.categoriaId)) campos.categoriaId = 'Informe a categoria.';
  else dados.categoriaId = Number(b.categoriaId);

  if (!idValido(b.fonteDestinoId)) campos.fonteDestinoId = 'Informe a fonte/destino.';
  else dados.fonteDestinoId = Number(b.fonteDestinoId);

  const p = b.parcelas === undefined || b.parcelas === null || b.parcelas === '' ? 1 : Number(b.parcelas);
  if (!Number.isInteger(p) || p < 1 || p > 48) campos.parcelas = 'O número de parcelas deve ser de 1 a 48.';
  else dados.parcelas = p;

  return { campos, dados };
}

// confere se categoria e fonte/destino sao do usuario e se o tipo combina
async function conferirRelacionamentos(usuarioId, dados) {
  const categoria = await Categoria.buscar(usuarioId, dados.categoriaId);
  if (!categoria) return { status: 404, corpo: { erro: 'Categoria não encontrada.' } };

  const fonte = await FonteDestino.buscar(usuarioId, dados.fonteDestinoId);
  if (!fonte) return { status: 404, corpo: { erro: 'Fonte/destino não encontrado.' } };

  if (categoria.tipo !== dados.tipo) {
    return {
      status: 400,
      corpo: {
        erro: 'Dados inválidos.',
        campos: { categoriaId: `A categoria informada é de ${categoria.tipo}, mas o lançamento é de ${dados.tipo}.` },
      },
    };
  }
  if (dados.parcelas > 1 && (fonte.tipo !== 'cartao_credito' || dados.tipo !== 'saida')) {
    return {
      status: 400,
      corpo: { erro: 'Dados inválidos.', campos: { parcelas: 'Só é possível parcelar saídas em cartão de crédito.' } },
    };
  }
  return { fonte };
}

const naoEncontrado = (res) => res.status(404).json({ erro: 'Lançamento não encontrado.' });

router.get('/', async (req, res, next) => {
  const q = req.query;
  const campos = {};

  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const pad = (n) => String(n).padStart(2, '0');
  const inicio = q.inicio ?? `${ano}-${pad(mes + 1)}-01`;
  const fim = q.fim ?? `${ano}-${pad(mes + 1)}-${pad(new Date(ano, mes + 1, 0).getDate())}`;

  if (!dataValida(inicio)) campos.inicio = 'Data inicial inválida (use AAAA-MM-DD).';
  if (!dataValida(fim)) campos.fim = 'Data final inválida (use AAAA-MM-DD).';
  if (!campos.inicio && !campos.fim && inicio > fim) campos.fim = 'A data final não pode ser anterior à inicial.';
  if (q.tipo !== undefined && !['entrada', 'saida'].includes(q.tipo)) campos.tipo = 'Tipo inválido.';
  if (q.categoriaId !== undefined && !idValido(q.categoriaId)) campos.categoriaId = 'Categoria inválida.';
  if (q.fonteDestinoId !== undefined && !idValido(q.fonteDestinoId)) campos.fonteDestinoId = 'Fonte/destino inválido.';

  const pagina = q.pagina === undefined ? 1 : Number(q.pagina);
  if (!Number.isInteger(pagina) || pagina < 1) campos.pagina = 'Página inválida.';

  if (Object.keys(campos).length) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }

  try {
    const resultado = await Lancamento.listar(req.usuarioId, {
      inicio,
      fim,
      tipo: q.tipo,
      categoriaId: q.categoriaId ? Number(q.categoriaId) : undefined,
      fonteDestinoId: q.fonteDestinoId ? Number(q.fonteDestinoId) : undefined,
      pagina,
      porPagina: 20,
    });
    return res.json(resultado);
  } catch (erro) {
    return next(erro);
  }
});

router.get('/:id', validarId, async (req, res, next) => {
  try {
    const lancamento = await Lancamento.buscar(req.usuarioId, req.id);
    if (!lancamento) return naoEncontrado(res);
    return res.json(lancamento);
  } catch (erro) {
    return next(erro);
  }
});

router.post('/', async (req, res, next) => {
  const { campos, dados } = validar(req.body);
  if (Object.keys(campos).length) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }
  try {
    const conferencia = await conferirRelacionamentos(req.usuarioId, dados);
    if (conferencia.status) return res.status(conferencia.status).json(conferencia.corpo);

    const criados = await Lancamento.criar(req.usuarioId, dados);
    return res.status(201).json(criados);
  } catch (erro) {
    return next(erro);
  }
});

router.put('/:id', validarId, async (req, res, next) => {
  const { campos, dados } = validar({ ...req.body, parcelas: 1 });
  if (Object.keys(campos).length) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }
  try {
    const atual = await Lancamento.buscar(req.usuarioId, req.id);
    if (!atual) return naoEncontrado(res);

    const conferencia = await conferirRelacionamentos(req.usuarioId, dados);
    if (conferencia.status) return res.status(conferencia.status).json(conferencia.corpo);

    if (atual.totalParcelas > 1 && conferencia.fonte.tipo !== 'cartao_credito') {
      return res.status(400).json({
        erro: 'Dados inválidos.',
        campos: { fonteDestinoId: 'Uma parcela de compra parcelada deve continuar em um cartão de crédito.' },
      });
    }
    const atualizado = await Lancamento.atualizar(req.usuarioId, req.id, dados);
    return res.json(atualizado);
  } catch (erro) {
    return next(erro);
  }
});

router.delete('/:id', validarId, async (req, res, next) => {
  try {
    const atual = await Lancamento.buscar(req.usuarioId, req.id);
    if (!atual) return naoEncontrado(res);

    await Lancamento.excluir(req.usuarioId, atual, req.query.todasParcelas === 'true');
    return res.status(204).end();
  } catch (erro) {
    return next(erro);
  }
});

export default router;
