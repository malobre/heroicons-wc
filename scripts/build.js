import { mkdir, readdir, readFile, writeFile, rm } from "node:fs/promises";
import * as path from "node:path";
import * as changeCase from "change-case";
import ora from "ora";
import * as csso from "csso";
import { minify as minifyHtml } from "html-minifier-terser";

const utils = {
  escapeSingleQuotes: (str) =>
    str.includes("'")
      ? str.replaceAll(/([^'\\]*(?:\\.[^'\\]*)*)'/g, "$1\\'")
      : str,

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

const build = async ({ className, tagName, svg, css }) => ({
  js: utils.dedent`
    export default class ${className} extends HTMLElement {
      constructor() {
        super();

        this.ariaHidden ??= "true";

        this.attachShadow({ mode: "open" }).innerHTML =
          '${utils.escapeSingleQuotes(
            `<style>${csso.minify(css).css}</style>${await minifyHtml(svg, { collapseWhitespace: true })}`,
          )}';
      }
    }

    if (!Object.is(customElements.get("${tagName}"), ${className})) {
      window.customElements.define("${tagName}", ${className});
    }
  `,
  dts: utils.dedent`
    export default class ${className} extends HTMLElement {
      constructor();
    }

    declare global {
      interface HTMLElementTagNameMap {
        "${tagName}": ${className};
      }
    }
  `,
});

await (async () => {
  const iconDirPaths = ["24/solid", "24/outline", "20/solid", "16/solid"];

  const spinner = ora().start("Cleaning up previous build");

  await Promise.all(
    iconDirPaths.map(async (path) => {
      await rm(path, { recursive: true, force: true });
    }),
  );

  spinner.succeed().start("Creating artifacts directories");

  await Promise.all(
    iconDirPaths.map(async (path) => {
      await mkdir(path, { recursive: true });
    }),
  );

  spinner.succeed().start("Generating web components");

  const promises = [];

  for (const iconDirPath of iconDirPaths) {
    const size = iconDirPath.startsWith("24")
      ? "width: 1.50rem; height: 1.50rem;"
      : iconDirPath.startsWith("20")
        ? "width: 1.25rem; height: 1.25rem;"
        : "width: 1.00rem; height: 1.00rem;";

    for (const dirEntry of await readdir(
      path.join("node_modules", "heroicons", iconDirPath),
      { withFileTypes: true },
    )) {
      if (!dirEntry.isFile()) {
        console.warn(`\nSkipping non-file entry: ${dirEntry.name}`);
        continue;
      }

      if (path.extname(dirEntry.name) !== ".svg") {
        console.warn(`\nSkipping non-svg entry: ${dirEntry.name}`);
        continue;
      }

      promises.push(
        readFile(path.join(dirEntry.parentPath, dirEntry.name), {
          encoding: "utf-8",
        }).then(async (svg) => {
          const name = dirEntry.name.replace(/\.svg$/, "");
          const iconNamePascalCase = changeCase.pascalCase(name, {
            mergeAmbiguousCharacters: true,
          });

          const { js, dts } = await build({
            className: `Heroicon${iconNamePascalCase}Element`,
            tagName: `hi-${changeCase.kebabCase(iconDirPath)}-${changeCase.kebabCase(name)}`,
            svg,
            css: `
              :host {
                display: block;
                flex-shrink: 0;
                line-height: 1;
                ${size}
              }
            `,
          });

          await Promise.all([
            writeFile(`${iconDirPath}/${iconNamePascalCase}.js`, js),
            writeFile(`${iconDirPath}/${iconNamePascalCase}.d.ts`, dts),
          ]);
        }),
      );
    }
  }

  await Promise.all(promises);

  spinner.succeed();
})();
