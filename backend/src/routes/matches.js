import {
  postMatch,
} from "../controllers/matches.js";

import { verifyUser } from "../controllers/users.js";

const Match = {
  type: "object",
  properties: {
    id: { type: "integer" },
    player1: { type: "string" },
    player2: { type: "string" },
    score1: { type: "integer", nullable: true },
    score2: { type: "integer", nullable: true },
    winner: { type: "string", nullable: true },
    id_player1: { type: "integer", nullable: true },
    id_player2: { type: "integer", nullable: true },
    duration: { type: "integer"},
  },
};

const postMatchOptions = {
  preHandler: verifyUser,
  schema: {
    body: {
      type: "object",
      required: ["mode", "score1", "score2", "duration"],
      properties: {
        Match,
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
    },
  },
  handler: postMatch,
};

export default async function matchRoutes(fastify, options) {
  fastify.post("/match", postMatchOptions);
}


