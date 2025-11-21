import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import * as path from "node:path";
import * as changeCase from "change-case";
import * as csso from "csso";
import { minify as minifyHtml } from "html-minifier-terser";
import ora from "ora";

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
  const iconsGroups = /** @type {const} */ ([
    { path: "24/solid", name: "solid", size: "1.5rem" },
    { path: "24/outline", name: "outline", size: "1.5rem" },
    { path: "20/solid", name: "mini", size: "1.25rem" },
    { path: "16/solid", name: "micro", size: "1rem" },
  ]);

  const spinner = ora().start("Cleaning up previous build");

  await rm("dist", { recursive: true, force: true });

  spinner.succeed().start("Creating artifacts directories");

  await mkdir("dist", { recursive: true });

  spinner.succeed().start("Generating web components");

  const transpilePromises = [];

  for (const group of iconsGroups) {
    for (const dirEntry of await readdir(
      path.join("node_modules", "heroicons", group.path),
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

      transpilePromises.push(
        readFile(path.join(dirEntry.parentPath, dirEntry.name), {
          encoding: "utf-8",
        }).then(async (svg) => {
          const iconNameRaw = dirEntry.name.replace(/\.svg$/, "");

          const iconNamePascalCase = changeCase.pascalCase(iconNameRaw, {
            mergeAmbiguousCharacters: true,
          });

          const tagName = `hi-${changeCase.kebabCase(group.name)}-${changeCase.kebabCase(iconNameRaw)}`;

          const { js, dts } = await transpile({
            className: `Heroicon${iconNamePascalCase}Element`,
            tagName,
            svg,
            css: `
              :host {
                display: block;
                flex: none;
                line-height: 1;
                width: ${group.size};
                height: ${group.size};
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

  await Promise.all(transpilePromises);

  spinner.succeed();
})();
