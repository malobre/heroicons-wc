# [Heroicons] as [Web Components]

This package consist of a build script that generate web components for every heroicon.

Once generated, icon components are stored in individual files in PascalCase (e.g: `20/solid/AcademicCap.js`)
and are self-registered in kebab-case with a `hi` prefix, e.g: `hi-20-solid-academic-cap`.

## Installation

1. Clone repo
1. `npm pack`
1. Move artifact to your project (e.g: in a `vendor` directory)
1. Install (e.g: `npm i vendor/heroicons-wc-x.x.x.tgz`)

## Usage

```js
import { html, LitElement } from "lit";
import "heroicons-wc/24/outline/ShoppingCart";

export default class MyElement extends LitElement {
  render() {
    return html`
      Cart icon: <hi-24-outline-shopping-cart></hi-24-outline-shopping-cart>
    `;
  }
}

customElements.define("my-element", MyElement);
```

## Typescript

The build script also generate declaration files for every component.

## Files sizes

The generated files are not minified, but they are still lightweight:
| compression | min   | max    | average | median |
|-------------|-------|--------|---------|--------|
| raw         | ~500B | ~2800B | ~830B   | ~770B  |
| gzip        | ~360B | ~1200B | ~510B   | ~490B  |
| brotli      | ~270B | ~1040B | ~410B   | ~390B  |

## Package Structure

```
heroicons-wc
├── 16
│   └── solid
│       ├── AcademicCap.js
│       ├── AcademicCap.d.ts
│       └── ...
├── 20
│   └── solid
│       ├── AcademicCap.js
│       ├── AcademicCap.d.ts
│       └── ...
└── 24
    ├── outline
    │   ├── AcademicCap.js
    │   ├── AcademicCap.d.ts
    │   └── ...
    └── solid
        ├── AcademicCap.js
        ├── AcademicCap.d.ts
        └── ...

```

## License

This package (**not the icons**) is MIT licensed.

[heroicons]: https://github.com/tailwindlabs/heroicons
[web components]: https://developer.mozilla.org/en-US/docs/Web/Web_Components
[lit]: https://lit.dev
