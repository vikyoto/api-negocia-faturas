require('dotenv').config();
const express = require('express');
const { consultarClientePorCpf, resolverCpfPorTelefone } = require('./services/clienteService');
const { normalizarCpf, normalizarTelefone } = require('./utils/normalizadores');

const app = express();
app.use(express.json());

const API_KEY = process.env.TOOL_API_KEY;

function checarApiKey(req, res, next) {
  if (!API_KEY) return next(); // sem chave configurada = endpoint aberto (não recomendado em produção)
  const chaveRecebida = req.header('x-api-key');
  if (chaveRecebida !== API_KEY) {
    return res.status(401).json({ erro: 'não autorizado' });
  }
  next();
}

// Tool 1: cliente liga e informa o CPF diretamente
app.post('/consultar-por-cpf', checarApiKey, async (req, res) => {
  try {
    const cpf = normalizarCpf(req.body?.cpf);
    if (!cpf) {
      return res.status(400).json({ erro: 'cpf inválido ou ausente' });
    }

    const resultado = await consultarClientePorCpf(cpf);
    res.json(resultado);
  } catch (err) {
    console.error('Erro em /consultar-por-cpf:', err.message);
    res.status(502).json({ erro: 'falha ao consultar cliente' });
  }
});

// Tool 2: agente já sabe o telefone (caller ID) e precisa descobrir o CPF antes
app.post('/consultar-por-telefone', checarApiKey, async (req, res) => {
  try {
    const telefone = normalizarTelefone(req.body?.telefone);
    if (!telefone) {
      return res.status(400).json({ erro: 'telefone inválido ou ausente' });
    }

    const cpf = await resolverCpfPorTelefone(telefone);
    if (!cpf) {
      return res.json({ clienteEncontrado: false, motivo: 'telefone_sem_vinculo' });
    }

    const resultado = await consultarClientePorCpf(cpf);
    res.json(resultado);
  } catch (err) {
    console.error('Erro em /consultar-por-telefone:', err.message);
    res.status(502).json({ erro: 'falha ao consultar cliente' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
