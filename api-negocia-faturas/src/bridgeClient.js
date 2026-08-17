const axios = require('axios');

const BRIDGE_URL = process.env.BRIDGE_URL;
const BRIDGE_ACCESS_TOKEN = process.env.BRIDGE_ACCESS_TOKEN;
const CLIENTE_AUTHORIZATION = process.env.CLIENTE_AUTHORIZATION;


async function bridgePost(method, uri) {
  if (!BRIDGE_ACCESS_TOKEN) {
    throw new Error('BRIDGE_ACCESS_TOKEN não configurado (verifique as variáveis de ambiente)');
  }
  if (!CLIENTE_AUTHORIZATION) {
    throw new Error('CLIENTE_AUTHORIZATION não configurado (verifique as variáveis de ambiente)');
  }

  const payload = {
    request: {
      header: [
        { key: 'Authorization', value: CLIENTE_AUTHORIZATION }
      ],
      method,
      uri,
      data: null,
      timeout: 120
    },
    identifier: null
  };

  try {
    const response = await axios.post(BRIDGE_URL, payload, {
      headers: {
        'Content-type': 'application/json',
        'Access-Token': BRIDGE_ACCESS_TOKEN
      },
      timeout: 30000
    });

    return normalizarRespostaBridge(response.data);
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return null;
    }
    throw err;
  }
}

function normalizarRespostaBridge(corpoResposta) {
  let dados = corpoResposta;

  if (typeof dados === 'string') {
    try {
      dados = JSON.parse(dados);
    } catch {
      return null;
    }
  }

  if (!dados || typeof dados !== 'object') {
    return null;
  }

  // Envelopes comuns: { body: {...} } ou { data: {...} }
  if (dados.body && typeof dados.body === 'object') {
    return dados.body;
  }
  if (dados.data && typeof dados.data === 'object' && !dados.cpfCnpj) {
    return dados.data;
  }

  return dados;
}

module.exports = { bridgePost };
