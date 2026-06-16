# Static B2C export for net2ftp

The `build:b2c` script builds a static Next.js export for only the public B2C pages:

- `/b2c/search`
- `/b2c/cart`

In B2C export mode, `next.config.ts` narrows `pageExtensions` to `*.b2c.*`. That keeps regular application pages and API routes such as `/api/auth/[...nextauth]` out of the static export build, because FTP hosting cannot serve Next.js server routes.

The B2C page source files are:

- `app/(static-b2c)/search/page.b2c.tsx`
- `app/(static-b2c)/cart/page.b2c.tsx`
- `app/layout.b2c.tsx`

## Why the Windows build failed

The old script used Unix shell syntax:

```bash
B2C_STATIC_EXPORT=true next build
```

Windows `cmd.exe` and PowerShell do not understand `NAME=value command`, so they report that this text is not a recognized command. The script now runs a small Node.js wrapper (`scripts/build-b2c.mjs`) that sets `B2C_STATIC_EXPORT=true` in a cross-platform way and then runs the local `next build`.

## Build locally

```bash
npm install
npm run build:b2c
```

After a successful build, Next.js writes the static site to `out/`.

## What to upload through net2ftp

Upload the **contents** of `out/` to the target folder on the hosting account, for example to the domain folder that serves `/b2c/`.

Because `next.config.ts` uses `basePath: "/b2c"`, `assetPrefix: "/b2c"`, and `trailingSlash: true` for this export, the pages are emitted as folders with `index.html` files and expect to be opened as:

- `https://your-domain.example/b2c/search/`
- `https://your-domain.example/b2c/cart/`

Do not upload the source folder `app/(static-b2c)`. It contains React/Next.js source code, not browser-ready HTML/CSS/JS. If you previously uploaded a build that produced `cart.html`/`search.html`, rebuild and re-upload after this `trailingSlash` setting so the server has `cart/index.html` and `search/index.html`.

## Database/API note

A static HTML site cannot connect to MySQL directly. The search page calls a backend endpoint from the browser:

```text
/php/API/search.php?search=...
```

So the hosting account must also contain a working PHP API endpoint that connects to MySQL and returns JSON. Keep the database credentials only in PHP/server-side code; do not put them into the static Next.js page.