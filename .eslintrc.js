const base = require("./node_modules/@mendix/pluggable-widgets-tools/configs/eslint.ts.base.json");

base["rules"]["@typescript-eslint/ban-ts-ignore"] = "warn";
base["rules"]["@typescript-eslint/no-empty-function"] = "warn";

module.exports = {
    ...base
};
