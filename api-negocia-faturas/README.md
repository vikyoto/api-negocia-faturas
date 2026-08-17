# API de inadimplência

Ferramenta HTTP (webhook) para ser usada como *tool* em um agente de atendimento com ia.
Recebe CPF **ou** telefone do cliente, consulta a bridge (`url_bridge`)
que fala com a API da base de dados responsável pelas faturas, e devolve um JSON estruturado dizendo se o
cliente é inadimplente e, se for, quais faturas estão vencidas há mais de
`DIAS_LIMITE_ATRASO` dias (padrão: 15), detalhado por contrato.

## Rotas

### `POST /consultar-por-cpf`
Body:
```json
{ "cpf": "12345678900" }
```

### `POST /consultar-por-telefone`
Body:
```json
{ "telefone": "62996736014" }
```

Ambas exigem o header `x-api-key` com o valor de `TOOL_API_KEY` (se essa
variável estiver configurada).

## Formato de resposta

Cliente sem inadimplência:
```json
{
  "clienteEncontrado": true,
  "cpfCnpj": "12345678900",
  "inadimplente": false
}
```

Cliente inadimplente, com faturas vencidas há mais de 15 dias:
```json
{
  "clienteEncontrado": true,
  "cpfCnpj": "12345678900",
  "inadimplente": true,
  "situacaoFaturas": "possui_faturas_vencidas",
  "diasLimiteConsiderado": 15,
  "contratos": [
    {
      "numeroContrato": "123456",
      "faturasVencidas": [
        {
          "idFatura": "abc123",
          "valor": 66.81,
          "dataVencimento": "2026-05-11",
          "diasEmAtraso": 65,
          "percentualDescontoAplicado": 0.15,
          "valorOferta": 56.81
        }
      ]
    }
  ]
}
```

Cliente marcado como inadimplente, mas sem faturas vencidas há mais de 15 dias:
```json
{
  "clienteEncontrado": true,
  "cpfCnpj": "12345678900",
  "inadimplente": true,
  "situacaoFaturas": "sem_faturas_vencidas_apos_limite",
  "diasLimiteConsiderado": 15,
  "contratos": []
}
```

Telefone sem vínculo com nenhum CPF:
```json
{ "clienteEncontrado": false, "motivo": "telefone_sem_vinculo" }
```

CPF não encontrado na Base de dados:
```json
{ "clienteEncontrado": false, "motivo": "cpf_nao_encontrado" }
```


