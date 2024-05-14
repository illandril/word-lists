import fs from 'node:fs';
import { pipeline } from 'node:stream';
import zlib from 'node:zlib';
import { program } from 'commander';

program
  .command('brotli')
  .description('Compress a file using BROTLI compression')
  .argument('<input>', 'Path to the input file')
  .action(async (inputPath) => {
    const inputStats = fs.lstatSync(inputPath);
    if (!inputStats.isFile()) {
      program.error(`Could not read ${inputPath} - not a file`);
    }

    const brotli = zlib.createBrotliCompress({
      params: {
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
        [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: inputStats.size,
      },
    });
    const outputPath = `${inputPath}.br`;
    if (fs.existsSync(outputPath)) {
      program.error(`Could not write to ${outputPath} - file already exists`);
    }

    const inputStream = fs.createReadStream(inputPath);
    inputStream.setEncoding('utf-8');

    const outputStream = fs.createWriteStream(outputPath, {
      encoding: 'binary',
    });
    pipeline(inputStream, brotli, outputStream, (err) => {
      if (err) {
        outputStream.end();
        program.error(`Error: ${err.message}`);
      }
    });
  });

program.parse();
