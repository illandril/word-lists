import fs from 'node:fs';
import readline from 'node:readline';
import type stream from 'node:stream';
import zlib from 'node:zlib';

export const read = (file: string | URL) => {
  let inputStream: stream.Readable = fs.createReadStream(file);
  if ((typeof file === 'string' ? file : file.pathname).endsWith('.br')) {
    inputStream = inputStream.pipe(zlib.createBrotliDecompress());
  }
  return readline.createInterface({ input: inputStream, crlfDelay: Number.POSITIVE_INFINITY });
};
