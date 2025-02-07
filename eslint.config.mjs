import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierPlugin from "eslint-plugin-prettier";

export default [
    {
        files: ["**/*.ts"],
        languageOptions: {
            parser: tsParser,
            globals: globals.node,
        },
        plugins: {
            "@typescript-eslint": tseslint,
            prettier: prettierPlugin,
        },
        rules: {
            // Spread the recommended rules instead of referencing them directly
            ...pluginJs.configs.recommended.rules,
            ...tseslint.configs.recommended.rules,

            "@typescript-eslint/prefer-as-const": "off",
            "no-undef": "off",
            "prettier/prettier": "error",
        },
    },
    {
        ignores: ["**/node_modules/", "**/dist/", ".history/", "coverage/"],
    }
];
