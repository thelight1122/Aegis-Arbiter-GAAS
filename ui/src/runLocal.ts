// /src/runLocal.ts
import { localAegisBootstrap } from "./localAegisBootstrap.js";

async function main() {
  const handle = await localAegisBootstrap();

  console.log(await handle("/aegis help"));
  console.log(await handle("/aegis storage status"));
  console.log(await handle('/aegis bookcase shelve "test" "hello world" --unshelve="when ready"'));
  console.log(await handle("/aegis bookcase list"));
  console.log(await handle("/aegis audit --limit=20"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
