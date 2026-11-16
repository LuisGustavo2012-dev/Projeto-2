// Valida os dois digitos verificadores do CPF
export function cpfValido(cpf) {
  const d = String(cpf).replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

// mascara 000.000.000-00 enquanto o usuario digita
export function mascararCpf(valor) {
  const d = String(valor).replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatarMoeda = (valor) => moeda.format(Number(valor));

// 2026-11-16 -> 16/11/2026
export const formatarData = (iso) => iso.split('-').reverse().join('/');
