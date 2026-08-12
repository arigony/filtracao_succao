# Substituição futura por modelos GLB

Cada peça é exposta no mapa `components` de `js/apparatus.js` pelo mesmo identificador usado em `data/pieces.json`. Um carregador GLB futuro pode substituir o conteúdo visual de um grupo sem alterar seleção, montagem guiada, diagnóstico ou procedimento.

## Contrato de substituição

- preservar o identificador `pieceId` no grupo raiz e nas malhas selecionáveis;
- manter origem e escala compatíveis com a posição atual do grupo;
- preservar `labelOffset` para os rótulos;
- manter estados especiais como filhos nomeados ou referências em `userData` (`filtrate`, `cake`, `dry`, `wet`, `water`);
- manter materiais clonáveis para destaque e pré-visualização em RA;
- validar limites, suporte sobre a superfície e escala de 0,48 m dos USDZ após a troca.

Os modelos procedurais permanecem como fallback obrigatório para carregamento offline e GitHub Pages.

