# [Heroicons] as [Web Components]

This package consist of a build script that generate web components for every heroicon.

Once generated, icon components are stored in individual files, with the following naming scheme:
`hi-<SIZE>-<NAME>.js`, e.g: `hi-20-solid-academic-cap.js`, and are self-registered.

## Installation

1. Clone repo
1. `npm pack`
1. Move artifact to your project (e.g: in a `vendor` directory)
1. Install (e.g: `npm i vendor/heroicons-wc-x.x.x.tgz`)

## Usage

1. Import the icon:
    ```js
    import "heroicons-wc/hi-24-outline-shopping-cart.js";
    ```
1. Use it like any html element:
    ```html
    <hi-24-outline-shopping-cart></hi-24-outline-shopping-cart>
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
├── hi-16-solid-academic-cap.js
├── hi-16-solid-academic-cap.d.ts
└── ...
```

## License

This package (**not the icons**) is MIT licensed.

[heroicons]: https://github.com/tailwindlabs/heroicons
[web components]: https://developer.mozilla.org/en-US/docs/Web/Web_Components
