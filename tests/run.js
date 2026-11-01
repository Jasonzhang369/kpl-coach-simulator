/* node tests/run.js [套件名片段] */
const H = require("./harness");

const suites = ["core", "save", "stamina", "age", "econ", "systems"];

const only = process.argv[2];
let ran = 0;
suites.forEach(name => {
  if (only && name.indexOf(only) < 0) return;
  const env = H.makeEnv();          // 每个套件一份干净环境
  require("./suites/" + name)(env, H);
  ran++;
});

const { pass, fail, failures } = H.report();
console.log(`\n${"─".repeat(52)}`);
if (fail) {
  console.log("失败项：");
  failures.forEach(f => console.log("  ✗ " + f));
  console.log(`${"─".repeat(52)}`);
}
console.log(`套件 ${ran} 个 · 断言 ${pass + fail} 项 · 通过 ${pass} · 失败 ${fail}`);
process.exit(fail ? 1 : 0);
