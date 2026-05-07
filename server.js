import { createServer } from "http";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { WispServer } from "@mercuryworkshop/wisp-js/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// resolve node_modules package roots
const bareMuxDir = dirname(require.resolve("@mercuryworkshop/bare-mux/package.json"));
const libcurlDir = dirname(require.resolve("@mercuryworkshop/libcurl-transport/package.json"));

const app = Fastify();
const wispServer = new WispServer();

// serve scramjet built files
await app.register(fastifyStatic, {
  root: scramjetPath,
  prefix: "/scram/",
  decorateReply: false,
});

// serve bare-mux dist
await app.register(fastifyStatic, {
  root: join(bareMuxDir, "dist"),
  prefix: "/baremux/",
  decorateReply: false,
});

// serve libcurl-transport dist
await app.register(fastifyStatic, {
  root: join(libcurlDir, "dist"),
  prefix: "/libcurl/",
  decorateReply: false,
});

// serve public folder
await app.register(fastifyStatic, {
  root: join(__dirname, "public"),
  prefix: "/",
});

const server = createServer(app.routing);

server.on("upgrade", (req, socket, head) => {
  if (req.url.startsWith("/wisp/")) {
    wispServer.routeRequest(req, socket, head);
  }
});

await app.ready();

server.listen(3000, () => {
  console.log("proxy running on http://localhost:3000");
});