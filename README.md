# BJJAcademy API

Backend que centraliza autenticação, academias, turmas, presenças e graduações para os apps BJJAcademy/Codex.

## Estado do projeto
- Versão v1 ainda em definição; endpoints estão descritos como rascunho.
- Nenhum código-fonte implementado neste repositório no momento.
- Especificação principal: docs/00-api-v1-spec.md (usa referências em docs/escopo/ para detalhar domínios).

## Como usar esta documentação
- Leia docs/00-api-v1-spec.md para entender escopo, papéis (roles) e convenções.
- Ao modelar endpoints, derive DTOs de request/response a partir dos domínios de negócio citados na spec.
- Mantenha decisões de autenticação/autorização alinhadas ao documento antes de iniciar implementação.

## Organização
- docs/00-api-v1-spec.md — rascunho de endpoints v1 e convenções (JSON, JWT, roles, padrões de erro iniciais).
- docs/escopo/ — documentos funcionais referenciados pela spec para regras de negócio (adicione aqui quando estiverem disponíveis).

## Próximos passos sugeridos
1) Consolidar os documentos em docs/escopo/ e trazer um resumo das regras principais para o README.
2) Definir modelo de dados e contratos de payload para cada rota da v1 (request/response e códigos de erro).
3) Fechar a estratégia de tokens (refresh, expiração, rotação) e o formato de erro padrão.
4) Documentar stack de backend, padrões de projeto e diretrizes de testes assim que o desenvolvimento começar.

## Contribuição
- Abra issue/discussão para alinhar decisões antes de alterar a especificação.
- Ao propor mudanças, explicite impacto em versão e compatibilidade; mantenha o documento atualizado.
- Inclua exemplos de requests/responses ou diagramas quando revisar a spec.

## Licença
A definir.
