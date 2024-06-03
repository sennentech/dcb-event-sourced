import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier"

export default [
    {
        files: ["**/*.ts"],
        languageOptions: {
            globals: globals.node
        },
    },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: ["**/node_modules/", "**/dist/", ".history/", "coverage/"],
    },
    {
        rules: {
            "@typescript-eslint/prefer-as-const": "off",
            "no-undef": "off"
        }
    },
    prettier,
];