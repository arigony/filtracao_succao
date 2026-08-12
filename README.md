# Filtração por sucção — laboratório 3D interativo

Experiência estática e responsiva para estudar a montagem e a operação segura da filtração por sucção. O projeto utiliza HTML semântico, CSS, JavaScript ES Modules e Three.js fixado, sem servidor de aplicação ou banco de dados.

## Experiências

- exploração da montagem e das peças;
- montagem guiada em oito etapas;
- procedimento operacional em seis fases com bloqueios de segurança;
- diagnóstico de exatamente cinco erros;
- realidade aumentada progressiva com fallback 3D;
- guia científico em `referencia/filtracao-succao.html`.

## Execução local

Sirva a pasta por HTTP para permitir o carregamento dos JSON e dos módulos ES. No Windows, dê dois cliques em `abrir-laboratorio.cmd`; o inicializador procura `py` ou `python`, abre `http://127.0.0.1:4173/` e mantém o servidor ativo até a janela ser fechada.

Como alternativa, execute `npm run serve` e abra o endereço exibido. Não abra `index.html` diretamente por `file://`, pois navegadores bloqueiam os módulos e as requisições aos arquivos JSON nesse protocolo.

## Ilustrações do guia científico

As quatro imagens de `referencia/img/` são infográficos SVG vetoriais e autocontidos. Para regenerá-los após alterar o desenho ou os textos, execute `node scripts/generate-reference-svgs.mjs`.

## Referência científica

Lisa Nichols, [Suction Filtration — Chemistry LibreTexts](https://chem.libretexts.org/Bookshelves/Organic_Chemistry/Organic_Chemistry_Lab_Techniques_(Nichols)/01%3A_General_Techniques/1.05%3A_Filtering_Methods/1.5D%3A_Suction_Filtration).

O texto e as ilustrações deste repositório são materiais didáticos originais e não reproduzem a página de referência.
