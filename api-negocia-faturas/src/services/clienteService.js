const { bridgePost } = require('../bridgeClient');

const DIAS_LIMITE = parseInt(process.env.DIAS_LIMITE_ATRASO || '60', 10); //puxa || seta valor reserva caso nao tenha na ENV
const CLIENTE_BASE_URL = process.env.CLIENTE_BASE_URL;

/**
 * Calcula quantos dias se passaram entre a dataVencimento (formato YYYY-MM-DD)
 * e hoje, usando UTC para evitar problemas de fuso horário.
 */
function calcularDiasEmAtraso(dataVencimento) {
  const hoje = new Date();
  const vencimento = new Date(`${dataVencimento}T00:00:00Z`);

  const hojeUTC = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
  const vencimentoUTC = Date.UTC(
    vencimento.getUTCFullYear(),
    vencimento.getUTCMonth(),
    vencimento.getUTCDate()
  );

  return Math.floor((hojeUTC - vencimentoUTC) / (1000 * 60 * 60 * 24));
}

/**
 * Define o percentual de desconto da oferta com base nos dias em atraso.
 * Faixas (cumulativas, usa sempre o maior degrau atingido):
 *   > 120 dias -> 50%
 *   >  90 dias -> 25%
 *   >  60 dias -> 15%
 *   caso contrário -> 0% (sem desconto)
 */
function calcularPercentualDesconto(diasEmAtraso) {
  if (diasEmAtraso > 120) return 0.5;
  if (diasEmAtraso > 90) return 0.25;
  if (diasEmAtraso > 60) return 0.15;
  return 0;
}

/**
 * Aplica o desconto sobre o valor da fatura e arredonda para 2 casas decimais.
 */
function calcularValorOferta(valor, diasEmAtraso) {
  const percentual = calcularPercentualDesconto(diasEmAtraso);
  const valorComDesconto = valor * (1 - percentual);
  return Math.round(valorComDesconto * 100) / 100;
}

/**
 * Percorre contratosConta -> faturas, filtra as faturas com status "Vencido"
 * e vencidas há mais de DIAS_LIMITE dias, e agrupa o resultado por contrato.
 * Contratos sem nenhuma fatura relevante não entram no resultado.
 */
function extrairFaturasVencidas(contratosConta) {
  const contratos = [];

  for (const contrato of contratosConta || []) {
    const faturasVencidas = [];

    for (const fatura of contrato.faturas || []) {
      if (fatura.status === 'Vencido' && fatura.dataVencimento) {
        const diasEmAtraso = calcularDiasEmAtraso(fatura.dataVencimento);

        if (diasEmAtraso > DIAS_LIMITE) {
          const valor = fatura.valorFinal ?? fatura.valor;
          const percentualDescontoAplicado = calcularPercentualDesconto(diasEmAtraso);

          faturasVencidas.push({
            idFatura: fatura.idFatura,
            valor,
            dataVencimento: fatura.dataVencimento,
            diasEmAtraso,
            percentualDescontoAplicado,
            valorOferta: calcularValorOferta(valor, diasEmAtraso)
          });
        }
      }
    }

    if (faturasVencidas.length > 0) {
      contratos.push({
        numeroContrato: contrato.numero,
        faturasVencidas
      });
    }
  }

  return contratos;
}

/**
 * Fluxo principal: dado um CPF, consulta o cliente via bridge e monta
 * a resposta estruturada que a 11labs vai usar.
 */
async function consultarClientePorCpf(cpf) {
  const cliente = await bridgePost('get', `${CLIENTE_BASE_URL}/clientes/consultar/${cpf}`);

  if (!cliente || !cliente.cpfCnpj) {
    return { clienteEncontrado: false, motivo: 'cpf_nao_encontrado' };
  }

  if (!cliente.inadimplente) {
    return {
      clienteEncontrado: true,
      cpfCnpj: cliente.cpfCnpj,
      inadimplente: false
    };
  }

  const contratos = extrairFaturasVencidas(cliente.contratosConta);

  return {
    clienteEncontrado: true,
    cpfCnpj: cliente.cpfCnpj,
    inadimplente: true,
    situacaoFaturas: contratos.length > 0
      ? 'possui_faturas_vencidas'
      : 'sem_faturas_vencidas_apos_limite',
    diasLimiteConsiderado: DIAS_LIMITE,
    contratos
  };
}

/**
 * Resolve um telefone para um CPF usando /clientes/contas-ativas/{telefone}.
 * Retorna null se não houver vínculo (cliente não localizado pelo telefone).
 */
async function resolverCpfPorTelefone(telefone) {
  const dados = await bridgePost('get', `${CLIENTE_BASE_URL}/clientes/contas-ativas/${telefone}`);

  if (!dados || !dados.cpfCnpj) {
    return null;
  }

  return dados.cpfCnpj;
}

module.exports = {
  consultarClientePorCpf,
  resolverCpfPorTelefone,
  extrairFaturasVencidas,
  calcularDiasEmAtraso,
  calcularPercentualDesconto,
  calcularValorOferta
};
