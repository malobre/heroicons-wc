import { mkdir, readdir, readFile, writeFile, rm } from "node:fs/promises";
import ora from "ora";
import camelCase from "camelcase";
import svgo from "svgo";
import * as csso from "csso";

const utils = {
  pascalCase: (str) => camelCase(str, { pascalCase: true }),

  // Dedent, outdent, unindent ?
  // A tag function that removes:
  // - space indentations,
  // - empty or whitespace-only leading & trailing lines.
  dedent: function dedent(strings, ...values) {
    const lines = String.raw({ raw: strings }, ...values).split("\n");

    const firstNonEmptyLineIndex = Math.max(
      lines.findIndex((line) => line.trimEnd().length > 0),
      0,
    );

    const lastNonEmptyLineIndex = Math.max(
      lines.findLastIndex((line) => line.trimEnd().length > 0),
      0,
    );

    const INDENTATION_CHAR = " ";

    // compute the minimum indentation level
    let minIndentation;
    for (let n = firstNonEmptyLineIndex; n <= lastNonEmptyLineIndex; n++) {
      let indentation;

      const line = lines[n];

      // compute indentation
      for (let i = 0; i < line.length; i++) {
        if (line[i] !== INDENTATION_CHAR) {
          indentation = i;
          break;
        }
      }

      // line consisting entirely of `INDENTATION_CHAR`
      // this can only happen between non-empty lines
      if (indentation === undefined) continue;

      // new minimum indentation
      if (minIndentation === undefined || indentation < minIndentation) {
        minIndentation = indentation;

        // short-circuit absolute minimum
        if (minIndentation === 0) {
          break;
        }
      }
    }

    minIndentation ??= 0;

    // remove minimum indentation
    const dedentedLines = [];
    for (let n = firstNonEmptyLineIndex; n <= lastNonEmptyLineIndex; n++) {
      const line = lines[n];

      dedentedLines.push(line.substring(minIndentation));
    }

    return dedentedLines.join("\n");
  },
};

async function build(iconDir, distDir, tagPrefix, css) {
  const entries = await readdir(iconDir, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => {
        if (!entry.isFile()) {
          console.warn(`\nSkipping non-file entry: ${entry.name}`);
          return false;
        }

        if (!entry.name.endsWith(".svg")) {
          console.warn(`\nSkipping non-svg entry: ${entry.name}`);
          return false;
        }

        return true;
      })
      .map(async ({ name: inputFilename }) => {
        const iconNameKebabCase = inputFilename.replace(/\.svg$/, "");
        const iconNamePascalCase = utils.pascalCase(iconNameKebabCase);

        const className = `${iconNamePascalCase}IconElement`;
        const tagName = `${tagPrefix}-${iconNameKebabCase}`;

        const style = `<style>${csso.minify(css).css}</style>`;

        const svg = svgo.optimize(
          (await readFile(`${iconDir}/${inputFilename}`)).toString(),
        ).data;

        // Escape single quotes
        const innerHTML = `${style}${svg}`.replaceAll(
          /([^'\\]*(?:\\.[^'\\]*)*)'/g,
          "$1\\'",
        );

        const content = utils.dedent`
          export default class ${className} extends HTMLElement {
            constructor() {
              super();

              this.ariaHidden ??= "true";

              this.attachShadow({ mode: "open" }).innerHTML =
                '${innerHTML}';
            }
          }

          if (!Object.is(customElements.get("${tagName}"), ${className})) {
            window.customElements.define("${tagName}", ${className});
          }
        `;

        const declaration = utils.dedent`
          export default class ${className} extends HTMLElement {
            constructor();
          }

          declare global {
            interface HTMLElementTagNameMap {
              "${tagName}": ${className};
            }
          }
        `;

        await Promise.all([
          writeFile(`${distDir}/${iconNamePascalCase}.js`, content),
          writeFile(`${distDir}/${iconNamePascalCase}.d.ts`, declaration),
        ]);
      }),
  );
}

await (async () => {
  const sources = ["24/solid", "24/outline", "20/solid", "16/solid"];

  const spinner = ora().start("Cleaning up previous build");

  await Promise.all(
    sources.map((path) => rm(path, { recursive: true, force: true })),
  );

  spinner.succeed().start("Creating artifacts directories");

  await Promise.all(sources.map((path) => mkdir(path, { recursive: true })));

  spinner.succeed().start("Generating web components");

  await Promise.all(
    sources.map((path) =>
      build(
        `./node_modules/heroicons/${path}`,
        path,
        "hi-".concat(path.replace("/", "-")),
        `
          :host {
            display: block;
            flex-shrink: 0;
            ${
              path.startsWith("24")
                ? "width: 1.50rem; height: 1.50rem;"
                : path.startsWith("20")
                ? "width: 1.25rem; height: 1.25rem;"
                : "width: 1.00rem; height: 1.00rem;"
            }
          }
        `,
      ),
    ),
  );

  spinner.succeed();
})();
