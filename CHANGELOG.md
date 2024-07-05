# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `line-height: 1`

### Changed

- Components class names are now formatted as `Heroicon<Name>Element` instead of `<Name>IconElement`.
- Components are now `flex: none` instead of `flex-shrink: 0`, preventing both growing and shrinking.

## [0.4.0] - 2024-01-05

### Changed

- Components css now includes width, height & `flex-shrink: 0`.

## [0.3.1] - 2024-01-05

### Added

- Micro heroicons (`hi-16-solid-*`)

## [0.3.0] - 2023-12-22

### Changed

- Components tag prefix is replaced with `hi-SIZE-STYLE-`, e.g: `hi-20-solid-`.
- Components are only defined if they are not already registered with the same tag name and class.
- heroicons updated to version 2.1.1

## [0.2.0] - 2023-04-03

### Added

- Typescript declaration file generation.

### Changed

- Components are `aria-hidden="true"` by default.
- Display components as `block` elements.

## [0.1.0] - 2023-03-01

- Initial release

[unreleased]: https://github.com/malobre/heroicons-wc/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/malobre/heroicons-wc/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/malobre/heroicons-wc/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/malobre/heroicons-wc/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/malobre/heroicons-wc/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/malobre/heroicons-wc/releases/tag/v0.1.0
