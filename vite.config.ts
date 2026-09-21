import { writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

function opisSavePlugin(): Plugin {
  const tokens = resolve("examples/core.tokens.json");
  const yamlName = /^[A-Za-z][A-Za-z0-9_-]*$/;

  return {
    name: "opis-save",
    configureServer(server) {
      server.middlewares.use("/__opis/save", (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }
        const url = new URL(req.url ?? "", "http://localhost");
        const kind = url.searchParams.get("file");
        if (kind !== "yaml" && kind !== "tokens") {
          res.statusCode = 400;
          res.end("unknown file");
          return;
        }
        const name = url.searchParams.get("name") ?? "Button";
        if (kind === "yaml" && !yamlName.test(name)) {
          res.statusCode = 400;
          res.end("invalid name");
          return;
        }
        const file = kind === "tokens" ? tokens : resolve("examples", `${name}.opis.yaml`);
        const chunks: Buffer[] = [];
        req.on("data", (chunk) => {
          chunks.push(chunk as Buffer);
        });
        req.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          void writeFile(file, body.endsWith("\n") ? body : `${body}\n`).then(
            () => {
              res.statusCode = 204;
              res.end();
            },
            (error: unknown) => {
              res.statusCode = 500;
              res.end(error instanceof Error ? error.message : "save failed");
            },
          );
        });
      });
    },
    handleHotUpdate(ctx) {
      const file = ctx.file.replaceAll("\\", "/");
      const yaml = file.match(/\/examples\/([^/]+)\.opis\.yaml$/);
      const isTokens = file.endsWith("/examples/core.tokens.json");
      if (!yaml && !isTokens) return;
      const name = isTokens ? "tokens" : yaml?.[1] ?? "file";
      void Promise.resolve(ctx.read()).then((body: string) => {
        ctx.server.ws.send({
          type: "custom",
          event: "opis-update",
          data: {
            kind: isTokens ? "tokens" : "yaml",
            name: isTokens ? "tokens" : basename(name),
            body,
          },
        });
      });
      return [];
    },
  };
}

export default defineConfig({
  root: ".",
  plugins: [opisSavePlugin()],
  server: {
    port: 5173,
  },
});
