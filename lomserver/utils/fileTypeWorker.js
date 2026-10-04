import { parentPort, workerData } from 'node:worker_threads';
import { fileTypeFromFile } from 'file-type';

try {
  const type = await fileTypeFromFile(workerData);
  parentPort.postMessage({ type });
} catch {
  parentPort.postMessage({ error: true });
}
