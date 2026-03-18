<p align="center"><br>
<img src="https://play-lh.googleusercontent.com/rfQsLTQvlTitGF915EPBDlCH8UsuAk649xftN-GPi_s_ORnfVLSCX9MEs1AGflbNOGo=w480-h960-rw" width="128" height="128" />
</p>

### g-family-link

Unofficial TypeScript client for the Google Family Link API — usable as a **library** or **CLI**, focused on **time control**

> ⚠️ **Disclaimer:** This project is **not affiliated with, endorsed by, or associated with Google LLC** in any way. Google Family Link is a trademark of Google LLC. Use of the Google Family Link name and logo is solely for identification purposes. This is an independent, community-driven project developed through reverse engineering of the public API.
>
> This project is intended for **personal and research use only**. It must not be used for commercial purposes, sold, or otherwise financially exploited.
>
> Users authenticate using cookies from **their own Google account sessions**. No credentials are stored or transmitted by this library beyond what is necessary to call the API on behalf of the authenticated user. The API endpoints and key used are publicly accessible from the [Family Link web interface](https://familylink.google.com) and are reused solely to enable authenticated access — no impersonation of Google or its services is intended.
>
> **Note to Google employees:** If this repository raises any concerns regarding intellectual property, terms of service, or any other matter, please reach out via [GitHub Issues](https://github.com/ludufre/g-family-link/issues) or directly to [@ludufre](https://github.com/ludufre). I will promptly take down or modify the repository upon request — no legal action necessary.

[![Maintenance](https://img.shields.io/maintenance/yes/2025?style=flat-square)](https://github.com/ludufre/g-family-link)
[![NPM License](https://img.shields.io/npm/l/g-family-link?style=flat-square)](https://www.npmjs.com/package/g-family-link)
[![NPM Downloads](https://img.shields.io/npm/dw/g-family-link?style=flat-square)](https://www.npmjs.com/package/g-family-link)
[![NPM Version](https://img.shields.io/npm/v/g-family-link?style=flat-square)](https://www.npmjs.com/package/g-family-link)

## Maintainers

| Maintainer | GitHub | Social | LinkedIn |
| ---------------------- | ------------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| Luan Freitas (ludufre) | [ludufre](https://github.com/ludufre) | [@ludufre](https://x.com/ludufre) | [Luan Freitas](https://www.linkedin.com/in/luan-freitas-14341687/) |

## Installation

> Requires Node.js ≥ 18.

```bash
# as a library
npm install g-family-link

# as a global CLI
npm install -g g-family-link

# or using pnpm
pnpm add g-family-link
pnpm add -g g-family-link
```

## Documentation

- [CLI Reference](./docs/cli.md) — authentication, all commands and options
- [Library API](./docs/library.md) — `FamilyLink` class, methods, and low-level API
- [Types Reference](./docs/types.md) — types, interfaces, and errors

## Building from source

```bash
pnpm install
pnpm build       # outputs to dist/
```
