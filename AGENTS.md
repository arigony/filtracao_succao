# AGENTS.md — Laboratório de Filtração por Sucção

## Segurança científica

- A montagem obrigatória é: bancada aberta → suporte universal → garra → kitassato de parede espessa → adaptador de borracha → funil de Büchner → papel-filtro.
- O circuito de vácuo obrigatório é: kitassato → mangueira de parede espessa → armadilha de vácuo com respiro → aspirador de água.
- O kitassato deve permanecer estabilizado pela garra; não representar um Erlenmeyer comum ou vidro de parede fina sob vácuo.
- O papel deve cobrir todos os orifícios, ser colocado com a concavidade para baixo e ser molhado com pequena quantidade de solvente frio compatível antes da mistura.
- A mistura só pode ser transferida depois de confirmar sucção, vedação e assentamento do papel.
- Para lavar a torta, desfazer o vácuo antes de adicionar solvente. Reaplicar a sucção apenas depois de distribuí-lo suavemente.
- Sempre abrir o sistema para a atmosfera antes de desligar o aspirador, prevenindo retroaspiração.
- A mangueira não pode estar dobrada, tensionada ou solta. A armadilha não pode ser omitida.
- Não adicionar manta, chama, macaquinho, condensador ou outro equipamento de aquecimento à montagem.
- A animação de fluxo só pode ser liberada após validação das regras críticas.

## Pedagogia e dados

- O fluxo é ver → montar → verificar → corrigir → operar → visualizar em RA.
- O modo diagnóstico apresenta exatamente cinco erros e exige uma tentativa antes da explicação.
- Peças, etapas, fases e erros pertencem aos arquivos JSON em `data/`.
- O feedback deve explicar risco, princípio e correção.
- A experiência não deve introduzir reação específica, autenticação, banco de dados, ranking ou física avançada.

## Visual, acessibilidade e técnica

- Manter aparência universitária clara, responsiva e utilizável por toque, mouse e teclado.
- Azul indica água/vácuo, verde indica condição correta, amarelo atenção e vermelho erro crítico; texto e ícones devem acompanhar as cores.
- Vidro deve ser transparente e legível; Büchner deve parecer porcelana; mangueiras devem parecer espessas e flexíveis.
- Respeitar `prefers-reduced-motion` e oferecer controle explícito.
- O projeto permanece estático, modular, compatível com GitHub Pages e baseado em HTML, CSS, ES Modules e Three.js fixado.
- Usar apenas caminhos relativos e preservar fallback 3D quando WebXR não estiver disponível.

