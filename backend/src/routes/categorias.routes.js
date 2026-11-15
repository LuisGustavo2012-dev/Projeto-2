import { Router } from 'express';
import * as Categoria from '../models/categoria.js';
import { autenticar } from '../middlewares/autenticar.js';
import { validarId } from '../middlewares/validarId.js';

const router = Router();
router.use(autenticar);

function validar(body) {
  const { nome, tipo } = body ?? {};
  const campos = {};
  if (typeof nome !== 'string' || !nome.trim()) campos.nome = 'Informe o nome.';
  else if (nome.trim().length > 60) campos.nome = 'O nome deve ter no máximo 60 caracteres.';
  if (!['entrada', 'saida'].includes(tipo)) campos.tipo = 'O tipo deve ser "entrada" ou "saida".';
  return campos;
}

const duplicada = (res) =>
  res.status(409).json({
    erro: 'Categoria já cadastrada.',
    campos: { nome: 'Já existe uma categoria com este nome e tipo.' },
  });

const naoEncontrada = (res) => res.status(404).json({ erro: 'Categoria não encontrada.' });

router.get('/', async (req, res, next) => {
  try {
    res.json(await Categoria.listar(req.usuarioId));
  } catch (erro) {
    next(erro);
  }
});

router.post('/', async (req, res, next) => {
  const campos = validar(req.body);
  if (Object.keys(campos).length) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }
  try {
    const categoria = await Categoria.criar(req.usuarioId, {
      nome: req.body.nome.trim(),
      tipo: req.body.tipo,
    });
    return res.status(201).json(categoria);
  } catch (erro) {
    if (erro.code === '23505') return duplicada(res);
    return next(erro);
  }
});

router.put('/:id', validarId, async (req, res, next) => {
  const campos = validar(req.body);
  if (Object.keys(campos).length) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }
  try {
    const atual = await Categoria.buscar(req.usuarioId, req.id);
    if (!atual) return naoEncontrada(res);

    if (atual.tipo !== req.body.tipo && (await Categoria.contarLancamentos(req.usuarioId, req.id)) > 0) {
      return res.status(409).json({
        erro: 'Não é possível mudar o tipo de uma categoria que já tem lançamentos.',
        campos: { tipo: 'Esta categoria já tem lançamentos.' },
      });
    }
    const categoria = await Categoria.atualizar(req.usuarioId, req.id, {
      nome: req.body.nome.trim(),
      tipo: req.body.tipo,
    });
    return res.json(categoria);
  } catch (erro) {
    if (erro.code === '23505') return duplicada(res);
    return next(erro);
  }
});

router.delete('/:id', validarId, async (req, res, next) => {
  try {
    const atual = await Categoria.buscar(req.usuarioId, req.id);
    if (!atual) return naoEncontrada(res);

    if ((await Categoria.contarLancamentos(req.usuarioId, req.id)) > 0) {
      return res.status(409).json({
        erro: 'Não é possível excluir uma categoria que possui lançamentos.',
      });
    }
    await Categoria.excluir(req.usuarioId, req.id);
    return res.status(204).end();
  } catch (erro) {
    if (erro.code === '23503') {
      return res.status(409).json({ erro: 'Não é possível excluir uma categoria que possui lançamentos.' });
    }
    return next(erro);
  }
});

export default router;
