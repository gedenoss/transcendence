import db from "../../utils/db.js";
import { loginExist, isStrongPassword, emailExist } from "./auth.js";
import bcrypt from "bcrypt";
import { logConnectedUsers} from "../remote.js";
import { app } from "../server.js";
import { t } from "../server.js";

export async function verifyUser(req, reply) {
  try {
    await req.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: "Unauthorized" });
    return;
  }
}

export async function getUser(req, reply) {
  try {
    const id = req.user.id;
    const user = db.prepare('SELECT login, public_login, email, avatarUrl, alias, auth_provider, secure_auth, games_played, games_won FROM users WHERE id = ?').get(id);
    if (!user) {
      return reply.status(404).send({ error: t(req.lang, "user_not_found") });
    }
    reply.send(user);
  }
  catch (err) {
    reply.status(500).send({ error: t(req.lang, "server_error") });
  }
}

export async function getFriendsUser(req, reply) {
  try {
    await logConnectedUsers(app);
    const id = req.user.id;
    const friends = db.prepare(`
      SELECT u.public_login, u.avatarUrl, u.games_played, u.games_won, u.online
      FROM friends f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = ?
    `).all(id);
    return reply.status(200).send(friends);
  } catch (err) {
    reply.status(500).send({ error: t(req.lang, "server_error") });
  }
}

async function verifData(req, reply) {
  const { login, email, avatarUrl, password, secure_auth, friend, alias } = req.body;

  if (!email && !avatarUrl && !password && secure_auth === undefined && !login && !friend && !alias) {
    return reply.status(400).send({
      error: t(req.lang, "no_fields_to_update"),
    });
  }
  if (login && (await loginExist(login))) {
    return reply.status(400).send({
      error: t(req.lang, "login_exists"),
    });
  }

  if (email && (await emailExist(email))) {
    return reply.status(400).send({
      error: t(req.lang, "email_exists"),
    });
  }

  if (password && !isStrongPassword(password)) {
    return reply.status(400).send({
      error: t(req.lang, "weak_password"),
    });
  }

  if (friend) {
    const stmt = db.prepare(`SELECT public_login FROM users WHERE public_login = ?`);
    const friendExist = stmt.get(friend);
    if (!friendExist) {
      return reply.status(400).send({
        error: t(req.lang, "friend_not_found"),
      });
    }
  }

  return null;
}

async function addFriends(userId, friendLogin) {
  const getId = db.prepare(`SELECT id FROM users WHERE public_login = ?`);
  const friend = getId.get(friendLogin);
  if (!friend.id) return null;
  const stmtCheck = db.prepare(
    `SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?`,
  );
  const already = stmtCheck.get(userId, friend.id);
  if (already === undefined) {
    const stmtAdd = db.prepare(
      `INSERT INTO friends (user_id, friend_id) VALUES (?, ?)`,
    );
    stmtAdd.run(userId, friend.id);
  } else {
    return -1;
  }
  return friend.id;
}

export async function updateUser(req, reply) {
  const error = await verifData(req, reply);
  const id = req.user.id;
  if (error) return error;

  const { login, email, avatarUrl, password, secure_auth, friend, alias, public_login } =
    req.body;

  const updates = [];
  const values = [];

  if (login) {
    updates.push("login = ?");
    values.push(login);
    const user = db.prepare("SELECT login, public_login FROM users WHERE id = ?").get(id);
    if (user.login === user.public_login) {
      updates.push("public_login = ?");
      values.push(login);
    }
  }
  if (email) {
    updates.push("email = ?");
    values.push(email);
  }
  if (avatarUrl) {
    updates.push("avatarUrl = ?");
    values.push(avatarUrl);
  }
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    updates.push("password = ?");
    values.push(hashedPassword);
  }
  if (alias) {
    updates.push("alias = ?");
    values.push(alias);
  }
  if (typeof secure_auth === "boolean") {
    updates.push("secure_auth = ?");
    values.push(secure_auth ? 1 : 0);
  }
  if (friend) {
    const user = db.prepare("SELECT public_login FROM users WHERE id = ?").get(id);
    if (user.public_login == friend)
        return reply.status(400).send({error : t(req.lang, "friend_yourself")});
    const friendAdd = await addFriends(id, friend);
    if (!friendAdd) {
      return reply.status(400).send({ error: t(req.lang, "friend_not_found") });
    }
    if (friendAdd === -1) {
      return reply.status(400).send({ error: t(req.lang, "friend_already_added") });
    }
    return reply.status(200).send({ message: t(req.lang, "user_updated") });
  }

  values.push(id);

  const stmt = db.prepare(`
    UPDATE users
    SET ${updates.join(", ")}
    WHERE id = ?
  `);
  stmt.run(...values);
  return reply.status(200).send({ message: t(req.lang, "user_updated") });
}

export async function removeFriends(req, reply) { 
  const { friend } = req.body;
  if (!friend) {
    return reply.status(400).send({ error: t(req.lang, "no_fields_to_update") });
  }
  const userId = req.user.id;
  const getId = db.prepare(`SELECT id FROM users WHERE public_login = ?`);
  const friendId = getId.get(friend);
  if (!friendId) {
    return reply.status(404).send({ error: t(req.lang, "friend_not_found") });
  }
  const stmtCheck = db.prepare(
    `SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?`,
  );
  const already = stmtCheck.get(userId, friendId.id);
  if (already === undefined) {
    return reply.status(404).send({ error: t(req.lang, "friend_not_added") });
  }
  const stmtRemove = db.prepare(
    `DELETE FROM friends WHERE user_id = ? AND friend_id = ?`,
  );
  stmtRemove.run(userId, friendId.id);
  return reply.status(200).send({ message: t(req.lang, "friend_deleted") });
}

export function anonymizeUser(req, reply) {
  try {
    const userId = req.user.id;
    if (!userId) {
      return reply.status(404).send({ error: t(req.lang, "user_not_found") });
    }
    // Génère un nombre aléatoire pour le public_login
    const randomNum = Math.floor(Math.random() * 1000000);
    const public_login = `user_${userId}_${randomNum}`;
    db.prepare("UPDATE users SET public_login = ?, alias = ? WHERE id = ?").run(public_login, public_login, userId);

    reply.send({ message: t(req.lang, "user_anonymized") });
  } catch (err) {
    reply.status(500).send({ error: t(req.lang, "server_error") });
  }
}

export function deleteUser(req, reply) {
  try {
    const userId = req.user.id;
    if (!userId) {
      return reply.status(404).send({ error: t(req.lang, "user_not_found") });
    }
    db.prepare("DELETE FROM friends WHERE user_id = ? OR friend_id = ?").run(userId, userId);
    db.prepare(
      "UPDATE users SET login = ?, public_login = ?, email = ?, avatarUrl = ?, alias = ?, password = ?, games_played = ?, games_won = ? WHERE id = ?"
    ).run(
      `deleted_user_`,
      `deleted_user_`,
      `deleted_account_@lol.fr`,
      null,
      `deleted_user_`,
      null,
      0,
      0,
      userId
    );

    reply.send({ message: t(req.lang, "user_deleted") });
  } catch (err) {
    reply.status(500).send({ error: t(req.lang, "server_error") });
  }
}