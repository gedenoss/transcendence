import {
  createTournament,
  updateTournament,
} from "../controllers/tournament.js";
import { verifyUser } from "../controllers/users.js";

const createTournamentOptions = {
  preHandler: verifyUser,
  schema: {
    body: {
      type: "object",
      required: ["name", "max_players"],
      properties: {
        name: { type: "string" },
        max_players: { type: "integer" },
        players: { type: "array" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          message: { type: "string" },
          id: { type: "integer" },
          status: { type: "string" },
          player_id: { type: "integer" },
          player_1: { type: "string" },
          player_2: { type: "string" },
        },
      },
    },
  },
  handler: createTournament,
};

const updateTournamentOptions = {
  preHandler: verifyUser,
  schema: {
    params: {
      type: "object",
      properties: {
        winner: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          id: { type: "integer" },
          status: { type: "string" },
          player_id: { type: "integer" },
          player_1: { type: "string" },
          player_2: { type: "string" },
        },
      },
    },
  },
  handler: updateTournament,
};


export default async function tournamentRoutes(fastify) {
  fastify.post("/tournament", createTournamentOptions);
  fastify.put("/tournament/:id", updateTournamentOptions);
}


