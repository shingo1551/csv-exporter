import { jsxRenderer } from 'hono/jsx-renderer'

export default jsxRenderer(({ children, title }) => (
  <html lang="ja" translate="no"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="theme-color" content="#f5f6f2" /><meta name="google" content="notranslate" /><title>{title}</title><link rel="stylesheet" href="/styles.css" /></head><body>{children}</body></html>
))
