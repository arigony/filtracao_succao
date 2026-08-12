import { mkdir, writeFile } from "node:fs/promises";

const OUTPUT = new URL("../referencia/img/", import.meta.url);

const palette = {
  navy: "#071f3a",
  ink: "#142b27",
  muted: "#526861",
  blue: "#176fc2",
  blueSoft: "#edf6ff",
  green: "#249447",
  greenSoft: "#eef9f0",
  orange: "#ef8a00",
  orangeSoft: "#fff7e8",
  red: "#d83425",
  purple: "#7a4bc2",
  purpleSoft: "#f5f0ff"
};

function lines(textLines, x, y, className = "body", lineHeight = 38, anchor = "start") {
  return `<text x="${x}" y="${y}" class="${className}" text-anchor="${anchor}">${textLines.map((line, index) => `<tspan x="${x}" dy="${index ? lineHeight : 0}">${line}</tspan>`).join("")}</text>`;
}

function card({ x, y, width, height, number, color, fill, textLines, fontSize = 31 }) {
  return `<g filter="url(#shadow)">
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="18" fill="${fill}" stroke="${color}" stroke-width="3"/>
    <circle cx="${x + 52}" cy="${y + 53}" r="32" fill="${color}"/>
    <circle cx="${x + 52}" cy="${y + 53}" r="27" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>
    <text x="${x + 52}" y="${y + 64}" class="number" text-anchor="middle">${number}</text>
    ${lines(textLines, x + 104, y + 49, "cardText", fontSize + 9).replace('class="cardText"', `class="cardText" font-size="${fontSize}"`)}
  </g>`;
}

function label(textLines, x, y, pointX, pointY, anchor = "start") {
  const lineEnd = anchor === "end" ? x + 18 : x - 18;
  return `<g>
    <circle cx="${pointX}" cy="${pointY}" r="6" fill="#101817"/>
    <path d="M ${pointX} ${pointY} L ${lineEnd} ${y - 9}" fill="none" stroke="#101817" stroke-width="3"/>
    ${lines(textLines, x, y, "label", 31, anchor)}
  </g>`;
}

function baseDefs() {
  return `<defs>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".92"/>
      <stop offset=".45" stop-color="#dff4fb" stop-opacity=".55"/>
      <stop offset="1" stop-color="#a8dce9" stop-opacity=".42"/>
    </linearGradient>
    <linearGradient id="steel" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5d6867"/><stop offset=".3" stop-color="#e8eeee"/><stop offset=".55" stop-color="#7c8987"/><stop offset="1" stop-color="#d9e1df"/>
    </linearGradient>
    <linearGradient id="porcelain" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e9efec"/>
    </linearGradient>
    <linearGradient id="amberLiquid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd65a"/><stop offset="1" stop-color="#e99713"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#18352f" flood-opacity=".13"/></filter>
    <marker id="arrowBlue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="${palette.blue}"/></marker>
    <marker id="arrowGreen" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="${palette.green}"/></marker>
    <marker id="arrowOrange" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="${palette.orange}"/></marker>
    <style><![CDATA[
      text{font-family:Arial,"Segoe UI",sans-serif;fill:${palette.ink}}
      .heading{font-size:48px;font-weight:800;fill:#fff;letter-spacing:-1px}
      .subheading{font-size:23px;font-weight:700;fill:#d8e8f5}
      .label{font-size:26px;font-weight:800;fill:#101817}
      .body{font-size:30px;font-weight:650}
      .cardText{font-weight:700;fill:${palette.ink}}
      .number{font-size:35px;font-weight:900;fill:#fff}
      .small{font-size:23px;font-weight:700;fill:${palette.muted}}
      .tiny{font-size:19px;font-weight:750;fill:${palette.muted}}
      .glass{fill:url(#glass);stroke:#2774b8;stroke-width:4;stroke-linejoin:round}
      .glassThin{fill:none;stroke:#5aa6d3;stroke-width:4;stroke-linecap:round}
      .porcelain{fill:url(#porcelain);stroke:#617b78;stroke-width:4}
      .hose{fill:none;stroke:#26312f;stroke-width:24;stroke-linecap:round;stroke-linejoin:round}
      .leader{fill:none;stroke:#101817;stroke-width:3}
    ]]></style>
  </defs>`;
}

function frame({ title, subtitle, description, scene }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 1080" role="img" aria-labelledby="title desc">
  <title id="title">${title}</title>
  <desc id="desc">${description}</desc>
  ${baseDefs()}
  <rect width="1440" height="1080" fill="#fbfdfc"/>
  <rect x="22" y="20" width="930" height="112" rx="18" fill="${palette.navy}" filter="url(#shadow)"/>
  <text x="54" y="91" class="heading">${title}</text>
  <text x="985" y="58" class="subheading" fill="${palette.navy}">FILTRAÇÃO</text>
  <text x="985" y="88" class="subheading" fill="${palette.navy}">POR SUCÇÃO</text>
  ${scene}
  </svg>`;
}

function fullAssembly({ showFlow = false, ventOpen = true } = {}) {
  return `<g id="montagem">
    <ellipse cx="930" cy="1008" rx="430" ry="35" fill="#193e35" opacity=".08"/>
    <g id="suporte">
      <rect x="500" y="955" width="250" height="48" rx="8" fill="#3f4a49" stroke="#17201f" stroke-width="4"/>
      <rect x="610" y="205" width="24" height="765" rx="10" fill="url(#steel)" stroke="#2e3937" stroke-width="3"/>
      <rect x="575" y="560" width="95" height="54" rx="10" fill="#3d4846" stroke="#18211f" stroke-width="4"/>
      <path d="M665 588 H805" stroke="url(#steel)" stroke-width="20" stroke-linecap="round"/>
      <path d="M795 570 l55 18 -55 18" fill="none" stroke="#37413f" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="572" cy="587" r="18" fill="#1f2927"/>
    </g>
    <g id="kitassato">
      <path d="M790 585 L900 585 L930 676 L984 850 Q990 900 930 920 H760 Q700 900 708 850 L760 676 Z" class="glass"/>
      <path d="M774 585 V525 H916 V585" class="glass"/>
      <ellipse cx="845" cy="875" rx="95" ry="24" fill="#e8b24a" opacity=".48"/>
      <path d="M930 677 C980 670 1008 658 1037 637" class="glassThin" stroke-width="26"/>
      <path d="M1030 638 C1060 622 1074 610 1092 604" class="hose"/>
    </g>
    <g id="adaptador">
      <path d="M788 543 L902 543 L888 484 H802 Z" fill="#202a28" stroke="#111817" stroke-width="4"/>
      <ellipse cx="845" cy="484" rx="43" ry="13" fill="#111817"/>
    </g>
    <g id="buchner">
      <path d="M720 280 Q720 255 750 255 H940 Q970 255 970 280 V455 Q970 485 940 485 H750 Q720 485 720 455 Z" class="porcelain"/>
      <ellipse cx="845" cy="280" rx="125" ry="29" fill="#fff" stroke="#617b78" stroke-width="4"/>
      <ellipse cx="845" cy="410" rx="105" ry="22" fill="#f5f6ef" stroke="#97aaa6" stroke-width="3"/>
      <path d="M815 480 H875 L887 540 H803 Z" class="porcelain"/>
      ${ventOpen ? '<ellipse cx="845" cy="407" rx="97" ry="17" fill="#fffdf4" stroke="#b7c3bd" stroke-width="2"/>' : ""}
    </g>
    <g id="armadilha">
      <path d="M1094 690 H1180 L1200 758 L1240 900 Q1244 937 1204 952 H1070 Q1030 937 1035 900 L1075 758 Z" class="glass"/>
      <path d="M1100 690 V632 H1175 V690" class="glass"/>
      <path d="M1122 632 V535 H1153 V632" class="glass"/>
      <path d="M1078 756 C1048 748 1025 733 1008 713" class="glassThin" stroke-width="24"/>
      <rect x="1102" y="625" width="71" height="27" rx="8" fill="#23302d"/>
      <path d="M1138 535 C1138 492 1165 475 1192 458 C1218 442 1228 420 1228 393" class="hose"/>
      <circle cx="1192" cy="458" r="13" fill="#26312f"/>
      <path d="M1192 458 V343" stroke="#26312f" stroke-width="18" stroke-linecap="round"/>
      <rect x="1164" y="376" width="70" height="25" rx="7" fill="${ventOpen ? palette.green : palette.red}" transform="rotate(-10 1199 388)"/>
      ${ventOpen ? '<path d="M1192 330 V286" stroke="#249447" stroke-width="8" marker-end="url(#arrowGreen)"/>' : ""}
    </g>
    <path d="M1228 393 C1265 380 1288 409 1280 455 C1270 520 1262 593 1270 660" class="hose"/>
    <g id="aspirador">
      <path d="M1350 855 V315 Q1350 245 1295 245 H1260" fill="none" stroke="url(#steel)" stroke-width="36" stroke-linecap="round"/>
      <path d="M1270 660 H1322" stroke="${palette.blue}" stroke-width="28" stroke-linecap="round"/>
      <path d="M1324 610 V760" stroke="${palette.blue}" stroke-width="42" stroke-linecap="round"/>
      <path d="M1324 765 V910" stroke="#42aee5" stroke-width="14" stroke-linecap="round" opacity=".75"/>
    </g>
    ${showFlow ? `<path d="M975 670 C1030 660 1040 735 1090 744 C1135 750 1138 660 1138 545 C1138 500 1180 480 1200 455 C1240 410 1260 470 1270 620" fill="none" stroke="${palette.blue}" stroke-width="7" stroke-dasharray="15 11" marker-end="url(#arrowBlue)"/>` : ""}
  </g>`;
}

function paperCloseup({ transfer = false } = {}) {
  return `<g>
    <ellipse cx="920" cy="968" rx="330" ry="30" fill="#193e35" opacity=".08"/>
    <g>
      <path d="M650 510 Q650 475 690 475 H1050 Q1090 475 1090 510 V745 Q1090 785 1050 785 H690 Q650 785 650 745 Z" class="porcelain"/>
      <ellipse cx="870" cy="510" rx="220" ry="54" fill="#fff" stroke="#617b78" stroke-width="5"/>
      <ellipse cx="870" cy="635" rx="185" ry="42" fill="${transfer ? "#dcebf0" : "#e8f4f8"}" stroke="${palette.blue}" stroke-width="4"/>
      ${[[-110,-10],[-55,-20],[0,-25],[55,-20],[110,-10],[-80,15],[-25,10],[30,10],[85,15]].map(([x,y]) => `<circle cx="${870 + x}" cy="${635 + y}" r="8" fill="#344a46" opacity=".75"/>`).join("")}
      <ellipse cx="870" cy="627" rx="174" ry="34" fill="${transfer ? "#dcecf1" : "#fdfcf4"}" stroke="#778c87" stroke-width="3"/>
      ${transfer ? '<ellipse cx="870" cy="611" rx="92" ry="28" fill="#ead9a5" stroke="#c69635" stroke-width="3"/><circle cx="835" cy="605" r="9" fill="#fff3c8"/><circle cx="890" cy="617" r="8" fill="#fff3c8"/>' : ""}
      <path d="M810 785 H930 L950 900 H790 Z" class="porcelain"/>
      <path d="M790 900 L950 900 L980 960 H760 Z" class="glass"/>
    </g>
    ${transfer ? `<g transform="rotate(25 890 285)">
      <path d="M745 180 H900 V310 L960 400 Q975 445 930 465 H710 Q665 445 680 400 L740 310 Z" class="glass"/>
      <path d="M700 392 Q820 350 945 402 L930 447 H708 Z" fill="url(#amberLiquid)" opacity=".82"/>
      <path d="M900 240 H1040" class="glassThin" stroke-width="30"/>
    </g>
    <path d="M1012 360 C1000 430 955 500 900 573" fill="none" stroke="#d79b38" stroke-width="24" stroke-linecap="round" marker-end="url(#arrowOrange)"/>
    <circle cx="966" cy="456" r="9" fill="#fff2bd"/><circle cx="946" cy="490" r="8" fill="#fff2bd"/><circle cx="928" cy="522" r="10" fill="#fff2bd"/>` : `<g transform="rotate(-18 940 290)">
      <path d="M960 170 H1050 V360 H960 Z" class="glass"/>
      <path d="M978 235 H1033 V344 H978 Z" fill="#77cbe8" opacity=".6"/>
      <path d="M1005 360 V445" stroke="#77cbe8" stroke-width="18" stroke-linecap="round"/>
    </g>
    <circle cx="980" cy="453" r="12" fill="#59b9df"/><circle cx="958" cy="494" r="10" fill="#59b9df"/><circle cx="940" cy="531" r="9" fill="#59b9df"/>
    <path d="M972 460 C960 505 930 560 895 598" fill="none" stroke="${palette.blue}" stroke-width="7" marker-end="url(#arrowBlue)"/>`}
    <path d="M870 675 V830" fill="none" stroke="${palette.blue}" stroke-width="8" stroke-dasharray="14 10" marker-end="url(#arrowBlue)"/>
    <g transform="translate(1125 535)">
      <circle cx="0" cy="0" r="72" fill="#fff" stroke="${palette.blue}" stroke-width="4" filter="url(#shadow)"/>
      <circle cx="0" cy="0" r="52" fill="#fdfcf4" stroke="#778c87" stroke-width="3"/>
      <path d="M-38 13 Q0 42 38 13" fill="none" stroke="#7c8f8a" stroke-width="5"/>
      <text x="0" y="104" class="tiny" text-anchor="middle">concavidade para baixo</text>
    </g>
  </g>`;
}

function renderMontagem() {
  const scene = `${card({x:35,y:190,width:405,height:190,number:1,color:palette.orange,fill:palette.orangeSoft,textLines:["Prenda o kitassato", "de parede espessa", "sem forçar o vidro."],fontSize:29})}
  ${card({x:35,y:410,width:405,height:190,number:2,color:palette.blue,fill:palette.blueSoft,textLines:["Instale a armadilha", "entre o kitassato", "e o aspirador."],fontSize:29})}
  ${card({x:35,y:630,width:405,height:190,number:3,color:palette.green,fill:palette.greenSoft,textLines:["Use mangueiras", "espessas, firmes", "e sem dobras."],fontSize:29})}
  ${fullAssembly({showFlow:true,ventOpen:true})}
  ${label(["Funil de", "Büchner"],1005,245,938,310)}
  ${label(["Kitassato"],680,948,752,850,"end")}
  ${label(["Armadilha", "de vácuo"],1260,920,1203,840)}
  ${label(["Respiro", "com pinça"],1270,270,1202,388)}
  <rect x="502" y="1017" width="818" height="46" rx="18" fill="#eaf6fb" stroke="#a8d5e8" stroke-width="2"/>
  <text x="911" y="1048" class="small" text-anchor="middle">Caminho do vácuo: kitassato → armadilha → aspirador de água</text>`;
  return frame({title:"1. Montagem do circuito",subtitle:"Montagem",description:"Infográfico da montagem completa com kitassato, Büchner, armadilha, respiro e aspirador.",scene});
}

function renderPapel() {
  const scene = `${card({x:35,y:190,width:485,height:170,number:1,color:palette.blue,fill:palette.blueSoft,textLines:["Papel do tamanho exato:", "cobre todos os orifícios."],fontSize:28})}
  ${card({x:35,y:390,width:485,height:170,number:2,color:palette.green,fill:palette.greenSoft,textLines:["Ligue a sucção antes", "de adicionar solvente."],fontSize:28})}
  ${card({x:35,y:590,width:485,height:190,number:3,color:palette.orange,fill:palette.orangeSoft,textLines:["Molhe com pequena porção", "de solvente frio", "compatível."],fontSize:28})}
  ${paperCloseup()}
  <rect x="62" y="850" width="1280" height="154" rx="22" fill="#fff5db" stroke="#d69a20" stroke-width="4" filter="url(#shadow)"/>
  <circle cx="135" cy="927" r="46" fill="#d69a20"/><path d="M135 895 V935" stroke="#fff" stroke-width="10" stroke-linecap="round"/><circle cx="135" cy="958" r="7" fill="#fff"/>
  ${lines(["ETAPA OBRIGATÓRIA: só derrame a mistura depois que o solvente escoar", "e o papel permanecer aderido à placa perfurada."],205,905,"body",42)}`;
  return frame({title:"2. Molhar e assentar o papel",subtitle:"Antes da mistura",description:"Close-up vetorial do papel cobrindo os orifícios e sendo molhado com solvente frio sob sucção.",scene});
}

function renderTransferencia() {
  const scene = `${card({x:35,y:190,width:480,height:170,number:1,color:palette.orange,fill:palette.orangeSoft,textLines:["Homogeneíze a suspensão", "antes de verter."],fontSize:28})}
  ${card({x:35,y:390,width:480,height:190,number:2,color:palette.blue,fill:palette.blueSoft,textLines:["Transfira em porções", "e direcione o sólido", "para o centro."],fontSize:28})}
  ${card({x:35,y:610,width:480,height:190,number:3,color:palette.green,fill:palette.greenSoft,textLines:["Use pouco solvente frio", "para recuperar o material", "que ficou no frasco."],fontSize:27})}
  ${paperCloseup({transfer:true})}
  <rect x="92" y="858" width="1240" height="142" rx="22" fill="#eef9f0" stroke="${palette.green}" stroke-width="4" filter="url(#shadow)"/>
  <circle cx="158" cy="929" r="43" fill="${palette.green}"/><path d="M136 929 l15 16 32-36" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  ${lines(["O papel já está molhado e assentado. Evite excesso de solvente:", "ele pode dissolver cristais e reduzir o rendimento."],225,910,"body",41)}`;
  return frame({title:"3. Transferência da suspensão",subtitle:"Filtração",description:"Infográfico da suspensão sendo vertida em porções para o centro do papel já molhado.",scene});
}

function renderEncerramento() {
  const scene = `${card({x:35,y:190,width:445,height:165,number:1,color:palette.green,fill:palette.greenSoft,textLines:["Abra a pinça", "do respiro."],fontSize:31})}
  ${card({x:35,y:385,width:445,height:185,number:2,color:palette.blue,fill:palette.blueSoft,textLines:["Iguale a pressão", "do sistema com", "a atmosfera."],fontSize:29})}
  ${card({x:35,y:600,width:445,height:185,number:3,color:palette.orange,fill:palette.orangeSoft,textLines:["Somente depois", "desligue a água", "do aspirador."],fontSize:29})}
  ${fullAssembly({showFlow:false,ventOpen:true})}
  <path d="M1192 334 C1160 285 1110 270 1065 292" fill="none" stroke="${palette.green}" stroke-width="9" marker-end="url(#arrowGreen)"/>
  <path d="M1192 334 C1230 280 1275 278 1310 303" fill="none" stroke="${palette.green}" stroke-width="9" marker-end="url(#arrowGreen)"/>
  <text x="1185" y="235" class="label" text-anchor="middle" fill="${palette.green}">ENTRADA DE AR</text>
  ${label(["Derivação", "do respiro"],1045,330,1192,388,"end")}
  ${label(["Armadilha"],1015,960,1088,872,"end")}
  ${label(["Aspirador", "de água"],1360,695,1324,665,"end")}
  <rect x="488" y="1012" width="848" height="52" rx="20" fill="#eaf7ee" stroke="${palette.green}" stroke-width="3"/>
  <text x="912" y="1046" class="body" text-anchor="middle">ORDEM SEGURA: ventilar primeiro → desligar depois</text>`;
  return frame({title:"4. Encerramento seguro",subtitle:"Ventilação",description:"Infográfico da abertura do respiro antes de desligar o aspirador para evitar retroaspiração.",scene});
}

await mkdir(OUTPUT, { recursive: true });
const assets = [
  ["montagem.svg", renderMontagem()],
  ["papel-molhado.svg", renderPapel()],
  ["transferencia.svg", renderTransferencia()],
  ["encerramento.svg", renderEncerramento()]
];

await Promise.all(assets.map(([filename, content]) => writeFile(new URL(filename, OUTPUT), `${content.replace(/[ \t]+$/gm, "")}\n`, "utf8")));
console.log(`Gerados ${assets.length} SVGs em ${OUTPUT.pathname}`);
