import fs from 'node:fs';
import { read } from './raw-data/file';

const outDir = new URL('../dist/', import.meta.url);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir);

const input = new URL('by-score/', import.meta.url);
const files = fs.readdirSync(input);
for (const file of files) {
  const words: string[] = [];
  for await (const line of read(new URL(file, input))) {
    words.push(line);
  }
  fs.writeFileSync(new URL(`length-${file.substring(0, file.indexOf('.'))}.json`, outDir), JSON.stringify(words));
  fs.writeFileSync(
    new URL(`length-${file.substring(0, file.indexOf('.'))}.js`, outDir),
    `export default ${JSON.stringify(words)}`,
  );
}
