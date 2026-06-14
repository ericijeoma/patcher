module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "browser-cannot-import-worker",
      severity: "error",
      from: { path: "^apps/web/" },
      to: { path: "^worker/" },
    },
    {
      name: "worker-cannot-import-ui",
      severity: "error",
      from: { path: "^worker/" },
      to: { path: "^apps/web/" },
    },
    {
      name: "sdk-is-isolated",
      severity: "error",
      from: { path: "^(?!packages/sdk/)" },
      to: { path: "^packages/sdk/internal/" },
      comment: "Nothing outside the SDK can touch its internal folder."
    },
    {
      name: "no-deep-imports",
      severity: "warn",
      from: {},
      to: { path: ".+/src/.*", pathNot: "index\\.ts$" },
      comment: "Always import from index.ts, not deep files."
    }
  ],
  options: {
    doNotFollow: "node_modules",
    tsPreCompilationDeps: true
  }
};
