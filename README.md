# [Heroicons] as [Web Components]

This package provides a build script that generates web components for each heroicon.

Once generated, icon components are stored in individual files, with the following naming scheme:
`hi-<SET>-<NAME>.js`, e.g: `hi-solid-academic-cap.js`, and are self-registered.

## Installation

1. Clone repo
1. `npm pack`
1. Move artifact to your project (e.g: in a `vendor` directory)
1. Install (e.g: `npm i file:vendor/heroicons-wc-x.x.x.tgz`)

## Usage

1. Import the icon:
    ```js
    import "heroicons-wc/hi-outline-shopping-cart.js";
    ```
1. Use it like any html element:
    ```html
    <hi-outline-shopping-cart></hi-outline-shopping-cart>
    ```

## Typescript

Declaration files are generated for each icon component.

## Files sizes

Generated files are not minified, but they are still lightweight:
| compression | min   | max    | average | median |
|-------------|-------|--------|---------|--------|
| raw         | ~619B | ~3103B | ~1022B  | ~964B  |
| gzip        | ~425B | ~1315B | ~601B   | ~582B  |
| brotli      | ~305B | ~1083B | ~464B   | ~449B  |

## Package Structure

```
heroicons-wc
├── hi-solid-academic-cap.js
├── hi-solid-academic-cap.d.ts
└── ...
```

## License

This package (**not the icons**) is MIT licensed.

[heroicons]: https://github.com/tailwindlabs/heroicons
[web components]: https://developer.mozilla.org/en-US/docs/Web/Web_Components
