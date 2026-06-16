# Static B2C export for FTP hosting

This project keeps the original preview pages untouched and adds isolated static B2C pages in `app/(static-b2c)/`.

## Source pages

- `app/(static-b2c)/search/page.tsx` becomes `/search` in Next.js.
- `app/(static-b2c)/cart/page.tsx` becomes `/cart` in Next.js.

The route-group folder name `(static-b2c)` is only for code organization. It is not included in the public URL.

## Build command

Run:

```bash
npm run build:b2c
```

The command sets `B2C_STATIC_EXPORT=true`, so `next.config.ts` switches to static export mode with:

- `output: "export"`
- `basePath: "/b2c"`
- `assetPrefix: "/b2c"`
- `images.unoptimized: true`

## What is `out/`?

`out/` is the generated static site folder created by `next build` when `output: "export"` is enabled. It contains only files that a regular static/PHP hosting can serve, for example:

- `index.html` files for pages
- `_next/static/...` JavaScript and CSS bundles
- copied public assets needed by the build

Do not upload the source folder `app/(static-b2c)/` to hosting. Upload the contents of generated `out/` instead.

## FTP upload target

Upload everything inside `out/` into the hosting folder:

```text
public_html/b2c/
```

After upload, the intended URLs are:

```text
https://easymed.pro/b2c/search
https://easymed.pro/b2c/cart
```

## API calls

The static search page calls the existing PHP API with a root-relative URL:

```text
/php/API/search.php?search=...
```

When the page is opened from `https://easymed.pro/b2c/search`, this request goes to:

```text
https://easymed.pro/php/API/search.php?search=...
```

This keeps MySQL credentials out of the browser and lets the existing PHP API talk to the database.