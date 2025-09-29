import db from "../../utils/db.js";
import { t } from "../server.js";

export function getStats(req, reply) {
  try {
    if (!req.user || !req.user.id) {
      return reply.status(401).send({ error: t(req.lang, "user_not_authenticated") });
    }

    const userId = req.user.id;

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) {
      return reply.status(404).send({ error: t(req.lang, "user_not_found") });
    }
    const userLogin = user.public_login;
    const userStats = {
      games_played: user.games_played || 0,
      games_won: user.games_won || 0,
    };

    const winRate =
      userStats.games_played > 0
        ? Math.round((userStats.games_won / userStats.games_played) * 100)
        : 0;

    const recentMatches = db
      .prepare(
        `
        SELECT winner FROM matches
        WHERE id_player1 = ? OR id_player2 = ?
        ORDER BY created_at DESC LIMIT 10
      `,
      )
      .all(userId, userId);

    let currentStreak = 0;
    for (const match of recentMatches) {
      if (match.winner == userId) {
        currentStreak++;
      } else {
        break;
      }
    }

    const allUsers = db
      .prepare(
        `
        SELECT public_login, games_played, games_won,
        CASE WHEN games_played = 0 THEN 0
             ELSE (games_won * 100.0 / games_played) END as win_rate
        FROM users
        WHERE games_played > 0
        ORDER BY win_rate DESC, games_played DESC
      `,
      )
      .all();

    const ranking = allUsers.findIndex((u) => u.public_login === userLogin) + 1;

    const result = {
      totalGames: userStats.games_played,
      totalWins: userStats.games_won,
      winRate: winRate,
      currentStreak: currentStreak,
      ranking: ranking || null,
    };

    reply.send(result);
  } catch (error) {
    reply.status(500).send({ error: t(req.lang, "failed_to_fetch_stats") });
  }
}

export function getMatchHistory(req, reply) {
  try {
    if (!req.user || !req.user.id) {
      return reply.status(401).send({ error: t(req.lang, "user_not_authenticated") });
    }

    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 5;

    const user = db.prepare("SELECT public_login FROM users WHERE id = ?").get(userId);
    if (!user) {
      return reply.status(404).send({ error: t(req.lang, "user_not_found") });
    }
    const matches = db
      .prepare(
        `
        SELECT
          *,
          CASE
            WHEN id_player1 = ? THEN 
              CASE 
                WHEN id_player2 IS NOT NULL AND id_player2 != 0 THEN 
                  (SELECT public_login FROM users WHERE id = id_player2)
                ELSE player2 
              END
            ELSE 
              CASE 
                WHEN id_player1 IS NOT NULL AND id_player1 != 0 THEN 
                  (SELECT public_login FROM users WHERE id = id_player1)
                ELSE player1 
              END
          END as opponent,
          CASE
            WHEN winner = ? THEN 'WIN'
            ELSE 'LOSS'
          END as result,
          datetime(created_at, 'localtime') as formatted_date
        FROM matches
        WHERE id_player1 = ? OR id_player2 = ?
        ORDER BY created_at DESC
        LIMIT ?
      `,
      )
      .all(userId, userId, userId, userId, limit);
    reply.send(matches);
  } catch (error) {
    reply.status(500).send({ error: t(req.lang, "failed_to_fetch_stats")});
  }
}
