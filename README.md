# motion render

Headless render runner. Project bundles in `bundles/` are AES-256 encrypted; the key lives only in the
`RENDER_KEY` repository secret. Rendered outputs are encrypted before being uploaded as artifacts.
