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

/**
 * @param {Object} options
 * @param {string} options.className
 * @param {string} options.tagName
 * @param {string} options.svg
 * @param {string} options.css
 */
const transpile = async ({ className, tagName, svg, css }) => ({
  js: utils.dedent`
    export default class ${className} extends HTMLElement {
      constructor() {
        super();

        this.attachInternals().ariaHidden = true;

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
  const iconDirPaths = /** @type {const} */ ([
    "24/solid",
    "24/outline",
    "20/solid",
    "16/solid",
  ]);

  const spinner = ora().start("Cleaning up previous build");

  await rm("dist", { recursive: true, force: true });

  spinner.succeed().start("Creating artifacts directories");

  await mkdir("dist", { recursive: true });

  spinner.succeed().start("Generating web components");

  const promises = [];

  for (const iconDirPath of iconDirPaths) {
    let size;

    if (iconDirPath.startsWith("24")) {
      size = "1.5rem";
    } else if (iconDirPath.startsWith("20")) {
      size = "1.25rem";
    } else if (iconDirPath.startsWith("16")) {
      size = "1rem";
    } else {
      throw "FIXME: unknown size";
    }

    for (const dirEntry of await readdir(
      path.join("node_modules", "heroicons", iconDirPath),
      { withFileTypes: true },
    )) {
      if (!dirEntry.isFile()) {
        console.warn(`\rSkipping non-file entry: ${dirEntry.name}`);
        continue;
      }

      if (path.extname(dirEntry.name) !== ".svg") {
        console.warn(`\rSkipping non-svg entry: ${dirEntry.name}`);
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

          const tagName = `hi-${changeCase.kebabCase(iconDirPath)}-${changeCase.kebabCase(name)}`;

          const { js, dts } = await transpile({
            className: `Heroicon${iconNamePascalCase}Element`,
            tagName,
            svg,
            css: `
              :host {
                display: block;
                flex: none;
                line-height: 1;
                width: ${size};
                height: ${size};
              }
            `,
          });

          await Promise.all([
            writeFile(path.join("dist", `${tagName}.js`), js),
            writeFile(path.join("dist", `${tagName}.d.ts`), dts),
          ]);
        }),
      );
    }
  }

  await Promise.all(promises);

  spinner.succeed();
})();
