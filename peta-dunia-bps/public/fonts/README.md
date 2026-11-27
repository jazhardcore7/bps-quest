# Fonts (to be supplied)

Place these woff2 files here. `src/styles/fonts.css` already references them, and the fallback stacks apply until they exist.

| File | Family | Weight | Use |
| --- | --- | --- | --- |
| `pixelify-sans-600.woff2` | Pixelify Sans | 600 (SemiBold) | Titles, badges, numbers |
| `nunito-400.woff2` | Nunito | 400 (Regular) | Body |
| `nunito-700.woff2` | Nunito | 700 (Bold) | Labels, emphasis |
| `nunito-800.woff2` | Nunito | 800 (ExtraBold) | Buttons |

Both families use the SIL Open Font License 1.1. Add each family's `OFL.txt` next to the files.

After the files are added, add preload links for `pixelify-sans-600.woff2` and `nunito-400.woff2` in `index.html`:

```html
<link rel="preload" href="/fonts/nunito-400.woff2" as="font" type="font/woff2" crossorigin>
```
