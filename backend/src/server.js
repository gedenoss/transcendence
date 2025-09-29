//imports 
import fastify from "fastify";
import path from "path";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "url";
import userRoutes from "./routes/user.js";
import matchRoutes from "./routes/matches.js";
import formbody from "@fastify/formbody";
import cors from "@fastify/cors";
import authRoutes from "./routes/auth.js";
import jwt from "@fastify/jwt";
import dotenv from "dotenv";
import cookie from "@fastify/cookie";
import websocket from "@fastify/websocket";
import FastifyRedis from "@fastify/redis";
import db from "../utils/db.js"
import { seedDatabase } from '../utils/seed.js';
import { setupConnexionSocket, setupRemoteSocket, setupRemoteGame, clearConnectedUsers} from "./remote.js";
import statsRoutes from "./routes/stats.js";
import tournamentRoutes from "./routes/tournament.js";
import fs from "fs";
import en from "../locales/en.json" with { type: "json" };
import fr from "../locales/fr.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

// https configuration
const key = fs.readFileSync(path.join(__dirname, "../certs/server.key"));
const cert = fs.readFileSync(path.join(__dirname, "../certs/server.cert"));

export const app = fastify({
  https: {
    key,
    cert,
  },
});


//database
seedDatabase(db);

console.log("Database seeded successfully");

// register plugins
await app.register(websocket);

await app.register(cors, {
  origin: true,
  credentials: true,
});


await app.register(jwt, {
  secret: process.env.JWT_SECRET,
  cookie: {
    cookieName: "token",
    signed: false,
  },
});

await app.register(cookie, {
  hook: "onRequest",
});

await app.register(FastifyRedis, {
  host: process.env.REDIS_HOST || "redis",
  port:6379,
});

app.register(fastifyStatic, {
  root: path.join(__dirname, "../frontend"),
  prefix: "/",
});

app.register(formbody);
app.register(userRoutes);
app.register(matchRoutes);
app.register(authRoutes);
app.register(statsRoutes);
app.register(tournamentRoutes);

await clearConnectedUsers(app);

// SPA
const spaRoutes = [
  "/",
  "/game",
  "/auth",
  "/game/tournament",
  "/game/dashboard",
  "/game/profile",
];

spaRoutes.forEach((route) => {
  app.get(route, async (request, reply) => {
    return reply.sendFile("index.html");
  });
});


// websocket setup
setupConnexionSocket(app);
setupRemoteSocket(app);
setupRemoteGame(app);


// app.decorate("authenticate", async (request, reply) => {
//   try {
//     await request.jwtVerify();
//   } catch (err) {
//     reply.send(err);
//   }
// });

// set language for all requests
const translations = { en, fr };

export function t(lang, key) {
  const selected = translations[lang] || translations.en;
  return selected[key] || key;
}

app.addHook("preHandler", async (req, reply) => {
  try {
      req.lang = 'en';
    }
  catch (err) {
    console.error("JWT verification failed:", err);
    req.lang = 'en';
  }
});


// start server
const start = async () => {
  try {
    await app.listen({ port: 8000, host: "0.0.0.0" });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
