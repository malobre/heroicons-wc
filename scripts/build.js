import { mkdir, readdir, readFile, writeFile, rm } from "node:fs/promises";
import ora from "ora";
import camelCase from "camelcase";

const utils = {
  pascalCase: (str) => camelCase(str, { pascalCase: true }),

  // Dedent, outdent, unindent ?
  // A tag function that removes leading spaces until a line reaches the left margin.
  // It also caches the input strings for better performance.
  dedent: function dedent(strings, ...values) {
    const self = dedent;

    self.cache ??= new Map();

    if (!self.cache.has(strings)) {
      const lines = strings
        .reduce((buf, slice) => {
          let [line, ...lines] = buf;

          for (const end of slice.split("\n")) {
            lines = [[...(line ?? []), end], ...lines];
            line = undefined;
          }

          return lines;
        }, [])
        .reverse();

      const minIndent = Math.min(
        ...lines
          .map(([line]) => [line, line.replace(/^ +/, "")])
          .filter(([_, trimmedLine]) => trimmedLine.length > 0)
          .map(([line, trimmedLine]) => line.length - trimmedLine.length),
      );

      self.cache.set(
        strings,
        lines
          .map(([start, ...rest]) => [start.slice(minIndent), ...rest])
          .reduce(([end, ...buf], [start, ...rest]) => [
            ...rest.reverse(),
            `${end}\n${start}`,
            ...buf,
          ])
          .reverse(),
      );
    }

    return String.raw({ raw: self.cache.get(strings) }, ...values);
  },
};

// Will be injected in each icon component as-is.
// Be careful with quotes and backslashes.
const style = `
  <style>
    :host {
      display: inline-block;
      vertical-align: middle;
    }
  </style>
`.replaceAll(/[\n\r ]+/g, "");

async function build(iconDir, distDir) {
  const entries = await readdir(iconDir, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => {
        if (!entry.isFile()) {
          console.warn(`\nSkipping non-file entry: ${entry.name}`);
          return false;
        }

        return true;
      })
      .map(async ({ name: inputFilename }) => {
        const iconNameKebabCase = inputFilename.replace(/\.svg$/, "");
        const iconNamePascalCase = utils.pascalCase(iconNameKebabCase);

        const className = `${iconNamePascalCase}IconElement`;
        const tagName = `heroicon-${iconNameKebabCase}`;

        const svg = (await readFile(`${iconDir}/${inputFilename}`))
          .toString()
          .replaceAll(/(['\\])/g, "\\$1")
          .replaceAll(/[\n\r]+/g, "")
          .replaceAll(/>\s+</g, "><");

        const content = utils.dedent`
          export default class ${className} extends HTMLElement {
            constructor() {
              super();

              this.ariaHidden ??= "true";

              this.attachShadow({ mode: "open" }).innerHTML =
                '${style}${svg}';
            }
          }

          window.customElements.define("${tagName}", ${className});
        `.trimStart();

        await writeFile(`${distDir}/${iconNamePascalCase}.js`, content);
      }),
  );
}

await (async () => {
  const spinner = ora().start("Cleaning up previous build");

  await Promise.all(
    ["./20", "./24"].map((path) => rm(path, { recursive: true })),
  );

  spinner.succeed().start("Creating artifacts directories");

  await Promise.all(
    ["./20/solid", "./24/solid", "./24/outline"].map((path) =>
      mkdir(path, { recursive: true }),
    ),
  );

  spinner.succeed().start("Generating web components");

  await Promise.all(
    ["20/solid", "24/solid", "24/outline"].map((path) =>
      build(`./node_modules/heroicons/${path}`, `./${path}`),
    ),
  );

  spinner.succeed();
})();
