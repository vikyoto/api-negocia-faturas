/**
 * Remove tudo que não for dígito de um CPF (pontos, traço, espaços)
 * e valida se sobraram 11 dígitos.
 */
function normalizarCpf(cpfBruto) {
  if (!cpfBruto) return null;
  const digitos = String(cpfBruto).replace(/\D/g, '');
  return digitos.length === 11 ? digitos : null;
}

/**
 * Normaliza telefone para o formato "DDD + número" (sem DDI, sem símbolos),
 * que foi o formato observado no exemplo fornecido (ex: 62996736014).
 *
 * ATENÇÃO: ainda não temos certeza de todos os formatos que a 11labs pode
 * enviar (com +55, com parênteses, etc). Esta função cobre os casos mais
 * comuns, mas deve ser revisada assim que houver mais exemplos reais.
 */
function normalizarTelefone(telefoneBruto) {
  if (!telefoneBruto) return null;

  let digitos = String(telefoneBruto).replace(/\D/g, '');

  // Remove o "55" (DDI Brasil) do início quando o número tiver mais dígitos
  // do que um telefone nacional completo (DDD + 8 ou 9 dígitos = 10 ou 11).
  if (digitos.length > 11 && digitos.startsWith('55')) {
    digitos = digitos.slice(2);
  }

  // Um telefone nacional válido tem 10 (fixo) ou 11 (celular) dígitos.
  if (digitos.length !== 10 && digitos.length !== 11) {
    return null;
  }

  return digitos;
}

module.exports = { normalizarCpf, normalizarTelefone };
