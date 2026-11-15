export function validarId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos: { id: 'Id inválido.' } });
  }
  req.id = id;
  next();
}
