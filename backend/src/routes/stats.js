import {
  getStats,
  getMatchHistory,
} from "../controllers/stats.js";
import { verifyUser } from "../controllers/users.js";

const getStatsOptions = {
  preHandler: verifyUser,
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          totalGames: { type: "integer" },
          totalWins: { type: "integer" },
          winRate: { type: "number" },
          currentStreak: { type: "integer" },
          ranking: { type: ["integer", "null"] },
        },
      },
    },
  },
  handler: getStats,
};

const getMatchHistoryOptions = {
  preHandler: verifyUser,
  schema: {
    response: {
      200: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "integer" },
            player1: { type: "string" },
            opponent: { type: "string" },
            winner: { type: "string" },
            score1: { type: "integer" },
            score2: { type: "integer" },
            result: { type: "string"},
            mode: { type: "string" },
            formatted_date: { type: "string", format: "date-time" },
            duration: { type: "integer" },
          },
        },
      },
    },
  },
  handler: getMatchHistory,
};

export default async function statsRoutes(fastify) {
  fastify.get("/stats", getStatsOptions);
  fastify.get("/match-history", getMatchHistoryOptions);
}


