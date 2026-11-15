import { Router } from 'express';
import * as FonteDestino from '../models/fonteDestino.js';
import { autenticar } from '../middlewares/autenticar.js';
import { validarId } from '../middlewares/validarId.js';

const router = Router();
router.use(autenticar);

const TIPOS = ['renda', 'conta', 'cartao_credito'];

const diaValido = (v) => {
  if (v === undefined || v === null || v === '') return false;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 31;
};

// devolve { campos, dados }: os erros e os dados ja limpos para gravar
function validar(body) {
  const { nome, tipo, diaFechamento, diaVencimento, limite } = body ?? {};
  const campos = {};

  if (typeof nome !== 'string' || !nome.trim()) campos.nome = 'Informe o nome.';
  else if (nome.trim().length > 60) campos.nome = 'O nome deve ter no máximo 60 caracteres.';

  if (!TIPOS.includes(tipo)) {
    campos.tipo = 'O tipo deve ser "renda", "conta" ou "cartao_credito".';
  }

  const dados = {
    nome: typeof nome === 'string' ? nome.trim() : '',
    tipo,
    diaFechamento: null,
    diaVencimento: null,
    limite: null,
  };

  if (tipo === 'cartao_credito') {
    if (!diaValido(diaFechamento)) campos.diaFechamento = 'Informe o dia de fechamento (1 a 31).';
    if (!diaValido(diaVencimento)) campos.diaVencimento = 'Informe o dia de vencimento (1 a 31).';
    const lim = Number(limite);
    if (limite === undefined || limite === null || limite === '' || !Number.isFinite(lim) || lim <= 0 || lim >= 1e10) {
      campos.limite = 'Informe um limite maior que zero.';
    }
    if (!campos.diaFechamento) dados.diaFechamento = Number(diaFechamento);
    if (!campos.diaVencimento) dados.diaVencimento = Number(diaVencimento);
    if (!campos.limite) dados.limite = lim;
  }
  return { campos, dados };
}

const duplicada = (res) =>
  res.status(409).json({
    erro: 'Fonte/destino já cadastrado.',
    campos: { nome: 'Já existe uma fonte/destino com este nome.' },
  });

const naoEncontrada = (res) => res.status(404).json({ erro: 'Fonte/destino não encontrado.' });

router.get('/', async (req, res, next) => {
  try {
    res.json(await FonteDestino.listar(req.usuarioId));
  } catch (erro) {
    next(erro);
  }
});

router.post('/', async (req, res, next) => {
  const { campos, dados } = validar(req.body);
  if (Object.keys(campos).length) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }
  try {
    return res.status(201).json(await FonteDestino.criar(req.usuarioId, dados));
  } catch (erro) {
    if (erro.code === '23505') return duplicada(res);
    return next(erro);
  }
});

router.put('/:id', validarId, async (req, res, next) => {
  const { campos, dados } = validar(req.body);
  if (Object.keys(campos).length) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }
  try {
    const atual = await FonteDestino.buscar(req.usuarioId, req.id);
    if (!atual) return naoEncontrada(res);
    return res.json(await FonteDestino.atualizar(req.usuarioId, req.id, dados));
  } catch (erro) {
    if (erro.code === '23505') return duplicada(res);
    return next(erro);
  }
});

router.delete('/:id', validarId, async (req, res, next) => {
  try {
    const atual = await FonteDestino.buscar(req.usuarioId, req.id);
    if (!atual) return naoEncontrada(res);

    if ((await FonteDestino.contarLancamentos(req.usuarioId, req.id)) > 0) {
      return res.status(409).json({
        erro: 'Não é possível excluir uma fonte/destino que possui lançamentos.',
      });
    }
    await FonteDestino.excluir(req.usuarioId, req.id);
    return res.status(204).end();
  } catch (erro) {
    if (erro.code === '23503') {
      return res.status(409).json({ erro: 'Não é possível excluir uma fonte/destino que possui lançamentos.' });
    }
    return next(erro);
  }
});

export default router;
