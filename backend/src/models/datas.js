export const pad = (n) => String(n).padStart(2, '0');

export function dataValida(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [a, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function hojeISO() {
  const h = new Date();
  return `${h.getFullYear()}-${pad(h.getMonth() + 1)}-${pad(h.getDate())}`;
}

export function mesAtual() {
  const h = new Date();
  const ano = h.getFullYear();
  const mes = h.getMonth();
  const ultimo = new Date(ano, mes + 1, 0).getDate();
  return { inicio: `${ano}-${pad(mes + 1)}-01`, fim: `${ano}-${pad(mes + 1)}-${pad(ultimo)}` };
}

const DIA_MS = 86400000;
const paraData = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d));
};
const paraISO = (dt) => dt.toISOString().slice(0, 10);

// periodo anterior de mesmo tamanho; se for um mes inteiro, usa o mes anterior inteiro
export function periodoAnterior(inicio, fim) {
  const [ai, mi, di] = inicio.split('-').map(Number);
  const ultimo = new Date(Date.UTC(ai, mi, 0)).getUTCDate();
  if (di === 1 && fim === `${ai}-${pad(mi)}-${pad(ultimo)}`) {
    const pa = mi === 1 ? ai - 1 : ai;
    const pm = mi === 1 ? 12 : mi - 1;
    const ult = new Date(Date.UTC(pa, pm, 0)).getUTCDate();
    return { inicio: `${pa}-${pad(pm)}-01`, fim: `${pa}-${pad(pm)}-${pad(ult)}` };
  }
  const i = paraData(inicio);
  const f = paraData(fim);
  const dias = Math.round((f - i) / DIA_MS) + 1;
  const fimAnt = new Date(i.getTime() - DIA_MS);
  const iniAnt = new Date(fimAnt.getTime() - (dias - 1) * DIA_MS);
  return { inicio: paraISO(iniAnt), fim: paraISO(fimAnt) };
}
