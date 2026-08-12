import { writeFile, mkdir } from 'node:fs/promises';
import { createApparatus } from '../js/apparatus.js';
import { USDZExporter } from '../vendor/addons/exporters/USDZExporter.js';

const apparatus = createApparatus();
apparatus.setFullAssembly();
apparatus.root.updateMatrixWorld(true);

// Quick Look works best with a self-contained static model.
// Clone the visible complete assembly without changing the browser experience.
const exportRoot = apparatus.root.clone(true);
exportRoot.name = 'SuctionFiltrationApparatus';
exportRoot.updateMatrixWorld(true);

const exporter = new USDZExporter();
const arrayBuffer = await exporter.parseAsync(exportRoot, {
  quickLookCompatible: true
});

await mkdir(new URL('../assets/', import.meta.url), { recursive: true });
await writeFile(new URL('../assets/filtracao-succao.usdz', import.meta.url), Buffer.from(arrayBuffer));
console.log(`Generated assets/filtracao-succao.usdz (${arrayBuffer.byteLength} bytes)`);
