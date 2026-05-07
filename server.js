import { createServer } from "http";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { server as wispServer } from "@mercuryworkshop/wisp-js/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const controllerDir = join(__dirname, "node_modules/@mercuryworkshop/scramjet-controller");
const proxyTransportsDir = join(__dirname, "node_modules/@mercuryworkshop/proxy-transports");

const app = Fastify();

// serve scramjet core files
await app.register(fastifyStatic, {
  root: scramjetPath,
  prefix: "/scramjet/",
  decorateReply: false,
});

// serve controller dist files
await app.register(fastifyStatic, {
  root: join(controllerDir, "dist"),
  prefix: "/controller/",
  decorateReply: false,
});

// serve proxy-transports dist files
await app.register(fastifyStatic, {
  root: join(proxyTransportsDir, "dist"),
  prefix: "/proxy-transports/",
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