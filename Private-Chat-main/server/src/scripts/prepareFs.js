'use strict';

const path = require('path');
const fs = require('fs-extra');

async function main() {
  const dir = path.resolve(__dirname, '../../storage');
  await fs.ensureDir(dir);
  console.log('Ensured storage directory at', dir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});




