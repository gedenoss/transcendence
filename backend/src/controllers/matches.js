import db from '../../utils/db.js'
import { t } from '../server.js';

 export function postMatch(req, reply) {
  const { mode, score1, score2, duration, player1, player2 } = req.body;
  const userId = req.user.id;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  let winner = null;

  try {
    if (mode == "ia") {
      if (score1 > score2) {
        winner = user.id;
        db.prepare('UPDATE users SET games_won = games_won + 1 WHERE id = ?').run(userId);
      }
      const stmt = db.prepare('INSERT INTO matches (player1, id_player1, player2, id_player2, mode, score1, score2, winner, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      stmt.run(user.public_login, userId, "ia", 0, mode, score1, score2, winner, duration);
      db.prepare('UPDATE users SET games_played = games_played + 1 WHERE id = ?').run(userId);
      reply.code(201).send({ message: t(req.lang, "match_saved") });
    }
    else if (!player1 || !player2) {
      if (score1 > score2) {
        winner = user.id;
        db.prepare('UPDATE users SET games_won = games_won + 1 WHERE id = ?').run(userId);
      }
      const stmt = db.prepare('INSERT INTO matches (player1, id_player1, player2, id_player2, mode, score1, score2, winner, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      stmt.run(user.public_login, userId, "guest", 0, mode, score1, score2, winner, duration);
      db.prepare('UPDATE users SET games_played = games_played + 1 WHERE id = ?').run(userId);
      reply.code(201).send({ message: t(req.lang, "match_saved"), winner: winner ? user.id : null });
    }
    else if (mode === "remote") {
        const user1 = db.prepare('SELECT id, public_login FROM users WHERE public_login = ?').get(player1);
        const user2 = db.prepare('SELECT id, public_login FROM users WHERE public_login = ?').get(player2);
        
        if (!user1 || !user2) {
          console.error("❌ Joueurs non trouvés:", { player1, player2, user1, user2 });
          return reply.status(404).send({ error: "Un ou plusieurs joueurs introuvables" });
        }
        
        if (score1 > score2) {
          winner = user1.id;
          db.prepare('UPDATE users SET games_won = games_won + 1 WHERE id = ?').run(user1.id);
        }
        else if (score2 > score1) {
          winner = user2.id;
          db.prepare('UPDATE users SET games_won = games_won + 1 WHERE id = ?').run(user2.id);
        }
        
        db.prepare('UPDATE users SET games_played = games_played + 1 WHERE id = ?').run(user1.id);
        db.prepare('UPDATE users SET games_played = games_played + 1 WHERE id = ?').run(user2.id);
        
        
        const stmt = db.prepare('INSERT INTO matches (player1, id_player1, player2, id_player2, mode, score1, score2, winner, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        stmt.run(user1.public_login, user1.id, user2.public_login, user2.id, mode, score1, score2, winner, duration);
        reply.code(201).send({ message: t(req.lang, "match_saved"), winner });
      }
    else if (mode === "tournament") {
      console.log("Score1 is greater than Score2 in tournament mode");
      if (score1 > score2) {
        winner = user.id;
        db.prepare('UPDATE users SET games_won = games_won + 1 WHERE login = ?').run(player1);
      }
      const stmt = db.prepare('INSERT INTO matches (player1, id_player1, player2, id_player2, mode, score1, score2, winner, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      stmt.run(user.public_login, userId, player2, 0, "tournament", score1, score2, winner, duration);
      db.prepare('UPDATE users SET games_played = games_played + 1 WHERE login IN (?, ?)').run(player1, player2);
      reply.code(201).send({ winner: winner ? user.id : null  });
    }
  } catch (err) {
    console.error("❌ Erreur dans postMatch:", err);
    reply.status(500).send({ error: t(req.lang, "failed_to_create_match") });
  }
}
