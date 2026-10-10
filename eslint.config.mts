import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
  {
    languageOptions: {
      globals: {
        ...globals.browser
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            "eslint.config.mts",
            "manifest.json"
          ]
        },
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".json"]
      }
    }
  },
  ...obsidianmd.configs.recommended,
  {
    files: ["tests/**/*.ts"],
    languageOptions: { globals: globals.node },
    rules: { "import/no-nodejs-modules": "off" }
  },
  globalIgnores([
    "node_modules",
    "dist",
    ".recovery-local/**",
    ".release-prep/**",
    ".release-backups/**",
    ".release-quarantine/**",
    "esbuild.config.mjs",
    "scripts/**",
    "versions.json",
    "main.js"
  ])
);
