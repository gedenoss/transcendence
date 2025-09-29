import db from '../../utils/db.js'
import { t } from '../server.js'

export function createTournament(req, reply) {
    const id = req.user.id;
    const { name, players } = req.body;

    const user = db.prepare('SELECT alias FROM users WHERE id = ?').get(id);

    const uniquePlayers = [...new Set(players)];
    if (uniquePlayers.length !== players.length) {
        return reply.status(400).send({ error: t(req.lang, "unique_players") });
    }

    const placeholders = players.map(() => '?').join(',');
    const existingUsers = db.prepare(`SELECT alias FROM users WHERE alias IN (${placeholders})`).all(...players);
    console.log("existingUsers : ", existingUsers);
    if (existingUsers.length > 1) {
        return reply.status(400).send({ error: t(req.lang, "alias_conflict") });
    }

    const tournament = db.prepare(`
        INSERT INTO tournaments (name, maxPlayers, created_at)
        VALUES (?, ?, ?)
    `).run(name, players.length, Date.now());

    const insertParticipants = db.prepare(`INSERT INTO participants (tournament_id, name) VALUES (?, ?)`);
    insertParticipants.run(tournament.lastInsertRowid, user.alias);
    for (const player of players) {
        insertParticipants.run(tournament.lastInsertRowid, player);
    }

    const participants = db.prepare(`SELECT * FROM participants WHERE tournament_id = ?`).all(tournament.lastInsertRowid);

    const player_1 = participants[1].name;
    const player_2 = participants[2].name;

    db.prepare(`DELETE FROM participants WHERE tournament_id = ? AND name = ?`).run(tournament.lastInsertRowid, player_1);
    db.prepare(`DELETE FROM participants WHERE tournament_id = ? AND name = ?`).run(tournament.lastInsertRowid, player_2);

    if (user.alias === player_1 || user.alias === player_2) {
        reply.status(201).send({ message: t(req.lang, "tournament_created"), id: tournament.lastInsertRowid, status: "in progress", player_id : id, player_1, player_2 });
    } else {
        reply.status(201).send({ message: t(req.lang, "tournament_created"), id: tournament.lastInsertRowid, status: "in progress", player_id : -1, player_1, player_2 });
    }
}

export function updateTournament(req, reply) {
    const { id } = req.params;
    const { winner } = req.body;

    const tournament = db.prepare(`SELECT * FROM tournaments WHERE id = ?`).get(id);
    if (!tournament) {
        return reply.status(404).send({ error: t(req.lang, "tournament_not_found") });
    }

    db.prepare(`INSERT INTO participants (tournament_id, name) VALUES (?, ?)`).run(id, winner);

    const participants = db.prepare(`SELECT * FROM participants WHERE tournament_id = ?`).all(id);

    const user = db.prepare('SELECT alias FROM users WHERE id = ?').get(req.user.id);
    if (participants.length >= 2) {
        const player_1 = participants[0].name;
        const player_2 = participants[1].name;

        db.prepare(`DELETE FROM participants WHERE tournament_id = ? AND name = ?`).run(id, player_1);
        db.prepare(`DELETE FROM participants WHERE tournament_id = ? AND name = ?`).run(id, player_2);
        if (user.alias === player_1 || user.alias === player_2) {
            reply.status(200).send({ id, status: "in progress", player_id: id, player_1, player_2 });
        }
        else {
            reply.status(200).send({ id, status: "in progress", player_id: -1, player_1, player_2 });
        }
    }
    else
    {
        const player_1 = participants[0].name;
        reply.status(200).send({ id, status: "finished", player_id: id, player_1, player_2: null });
    }
}

