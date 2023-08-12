module.exports = {
    parser: "@typescript-eslint/parser", // Specifies the ESLint parser
    parserOptions: {
        ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
        sourceType: "module", // Allows for the use of imports
        ecmaFeatures: {
            jsx: true // Allows for the parsing of JSX
        }
    },
    ignorePatterns: ["dist/**"],
    extends: [
        "plugin:@typescript-eslint/recommended", // Uses the recommended rules from the @typescript-eslint/eslint-plugin
        "prettier/@typescript-eslint", // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
        "plugin:prettier/recommended" // Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
    ],
    rules: {
        "no-use-before-define": "off",
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/camelcase": "off",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/consistent-type-assertions": "off",
        "no-multiple-empty-lines": ["error", { max: 3, maxEOF: 0, maxBOF: 0 }],
        "prettier/prettier": [
            "warn",
            {
                arrowParens: "avoid",
                bracketSpacing: true,
                htmlWhitespaceSensitivity: "css",
                insertPragma: false,
                jsxBracketSameLine: false,
                jsxSingleQuote: false,
                printWidth: 120,
                proseWrap: "preserve",
                quoteProps: "as-needed",
                requirePragma: false,
                semi: false,
                singleQuote: false,
                tabWidth: 4,
                trailingComma: "none",
                useTabs: false,
                vueIndentScriptAndStye: false
            }
        ]
    }
}
