import db from "../../utils/db.js";
import validator from "validator";
import { auth, OAuth2Client } from "google-auth-library";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { app, t } from "../server.js";
dotenv.config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function getConnectedUsers(app)
{
  const userIds = await app.redis.hkeys('connectedUsers');
  return userIds;
}

export async function loginExist(login) {
  const stmt = db.prepare(`
    SELECT 1 FROM users
    WHERE login = ?
    LIMIT 1
  `);
  const user = stmt.get(login);
  return !!user;
}

export function isStrongPassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return regex.test(password);
}

export async function emailExist(email) {
  const stmt = db.prepare(`
    SELECT 1 FROM users
    WHERE email = ?
    LIMIT 1
  `);
  const user = stmt.get(email);
  return !!user;
}

export async function signUp(req, reply) {
  let { login, password, email } = req.body;

  if (!login || !password || !email) {
    return reply
      .status(400)
      .send({ error: t(req.lang, "signup_required_fields") });
  }

  login = login.trim();
  email = email.trim();

  if ((await loginExist(login)) || (await emailExist(email))) {
    return reply
      .status(400)
      .send({ error: t(req.lang, "user_exists") });
  }

  if (login.length > 20 || login.length < 2) {
    return reply
      .status(400)
      .send({ error: t(req.lang, "login_error") });
  }

  if (!validator.isEmail(email)) {
    return reply.status(400).send({ error: t(req.lang, "invalid_email") });
  }

  if (!isStrongPassword(password)) {
    return reply.status(400).send({
      error: t(req.lang, "weak_password"),
    });
  }

  const avatarUrl = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(login)}`;
  try {
    const stmt = db.prepare(
      "INSERT INTO users (login, password, email, avatarUrl, alias, public_login) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const hashedPassword = await bcrypt.hash(password, 10);
    stmt.run(login, hashedPassword, email, avatarUrl, login, login);
    reply.status(201).send({ message: t(req.lang, "user_created") });
  } catch (err) {
    reply.status(500).send({ error: t(req.lang, "error_user") });
  }
}

export async function signUpGoogle(req, reply) {
  const token = req.body.token || req.body.idtoken;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    if (!email || !name) {
      return reply.status(400).send({ error: "Invalid Google token" });
    }

    const login = name.replace(/\s+/g, "").toLowerCase();
    if (await emailExist(email)) {
      const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
      if (user && user.login !== login) {
        return reply.status(400).send({ error: t(req.lang, "user_exists") });
      }
      return signIn(req, reply);
      }

    if (await loginExist(login)) {
      return reply
        .status(400)
        .send({ error: t(req.lang, "user_exists") });
    }
    const avatarUrl = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(login)}`;

    const stmt = db.prepare(
      "INSERT INTO users (login, email, avatarUrl, auth_provider, alias, public_login) VALUES (?, ?, ?, ?, ?, ?)",
    );
    stmt.run(login, email, avatarUrl, "google", login, login);
    const user = db.prepare("SELECT * FROM users WHERE login = ?").get(login);
    const tokenJWT = await reply.jwtSign({ id : user.id });
    reply
      .setCookie("token", tokenJWT, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60, // 1 hour
      })
      .code(201)
      .send({ login });
  } catch (err) {
    console.error("Google sign-up error:", err);
    reply.status(401).send({error: t(req.lang, "invalid_google_token")});
  }
}

export async function signIn(req, reply) {
  try {
    if (req.body.token || req.body.idtoken) {
      const token = req.body.token || req.body.idtoken;
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const { email, name } = payload;

      if (!email || !name) {
        return reply.status(400).send({error: t(req.lang, "invalid_google_token")});
      }

      const login = name.replace(/\s+/g, "").toLowerCase();

      const stmt = db.prepare(`
        SELECT * FROM users
        WHERE login = ? AND email = ?
        LIMIT 1
      `);
      const user = stmt.get(login, email);
      if (!user) {
        return reply.status(401).send({ error: t(req.lang, "user_not_found") });
      }
      if (user.auth_provider !== "google") {
        return reply.status(401).send({ error: t(req.lang, "login_required") });
      }
      const connectedUsersIds = await getConnectedUsers(app);
      if (connectedUsersIds.includes(user.id.toString())) {
        return reply.status(400).send({ error: t(req.lang, "already_connected") });
      }
      const tokenJWT = await reply.jwtSign({
        id: user.id,
      });
      reply
        .setCookie("token", tokenJWT,{
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
          path: "/",
          maxAge: 60 * 60, // 1 hour
        })
        .code(201)
        .send({ login: user.login });
    } else {
      let { givenLogin, password } = req.body;
      if (!givenLogin) {
        return reply.status(400).send({ error: t(req.lang, "login_required") });
      }

      givenLogin = givenLogin.trim();
      const stmt = db.prepare(`
        SELECT * FROM users
        WHERE login = ?
        LIMIT 1
      `);
      const user = stmt.get(givenLogin);
      if (!user) {
        return reply.status(401).send({ error: t(req.lang, "user_not_found") });
      }
      if (user.password) {
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return reply.status(401).send({ error: t(req.lang, "invalid_password") });
        } // compare les version hash
      }
      else if (user.auth_provider == "google") {
        return reply.status(401).send({error: t(req.lang, "google_account_identified")});
      }
      else
        return reply.status(500).send({error: t(req.lang, "server_error")});

        const connectedUsersIds = await getConnectedUsers(app);
        if (connectedUsersIds.includes(user.id.toString())) {
          return reply.status(403).send({error : t(req.lang, "already_connected")});
        }
        
      if (user.secure_auth == true) {
        const result = await sendOtpVerificationEmail(user, reply);
        if (result) {
          const token = await reply.jwtSign({
            id: user.id,
          });
          return reply.code(400).send({ message: t(req.lang, "otp_sent"), token });
        } else {
          return reply
            .code(500)
            .send({ error: t(req.lang, "failed_OTP") });
        }
      }
      const token = await reply.jwtSign({
        id: user.id,
      });
      reply
      .setCookie("token", token,{
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
        path: "/",
        maxAge: 60 * 60, // 1 hour
      })
        .code(200)
        .send({ login: user.login });
    }
  } catch (err) {
    console.error("Sign-in error:", err);
    return reply.status(500).send({ error: "Internal server error" });
  }
}

export async function signOut(req, reply) {
  try {
    reply
      .clearCookie("token", {
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      })
      .code(200)
      .send({ message: "Successfully signed out" });
  } catch (err) {
    return reply.status(500).send({ error: t(req.lang, "server_error") });
  }
}

export async function sendOtpVerificationEmail(user, reply) {
  try {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const mailOptions = {
      from: `"2FA transcendance" <test@openjavascript.info>`,
      to: user.email,
      subject: "Your 2FA Code",
      text: `Your 2FA code is: ${code}. It is valid for 5 minutes.`,
      html: `<p>Your 2FA code is: <strong>${code}</strong>. It is valid for 5 minutes.</p>`,
    };

    const saltRounds = 10;
    const hashedCode = await bcrypt.hash(code, saltRounds);
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes from now (in ms)
    const stmt = db.prepare(`
      UPDATE users
      SET otp_code = ?, otp_expires_at = ?
      WHERE id = ?
    `);
    stmt.run(hashedCode, expiresAt, user.id);

    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    return false;
  }
}

export async function verify2FA(req, reply) {
  const { otp } = req.body;
  let id;
  try {
    const decoded = await req.jwtVerify();
    id = decoded.id;
    const stmt = db.prepare(`
			SELECT otp_code, otp_expires_at, login, nb_trys
			FROM users
			WHERE id = ?
			LIMIT 1
		`);
    const user = stmt.get(id);
    if (!user || !user.otp_code || !user.otp_expires_at || user.nb_trys > 2 || Date.now() > user.otp_expires_at) {
      db.prepare(
        `UPDATE users SET otp_code = NULL, otp_expires_at = NULL, nb_trys = 0 WHERE id = ?`,
      ).run(id);
      if (user && user.nb_trys > 2) {
        return reply
          .status(429)
          .send({ error: t(req.lang, "too_many_attempts") });
      }
      return reply.status(400).send({ error: t(req.lang, "otp_expired") });
    }

    const isValid = await bcrypt.compare(otp, user.otp_code);
    if (!isValid) {
      db.prepare(`UPDATE users SET nb_trys = nb_trys + 1 WHERE id = ?`).run(id);
      return reply.status(400).send({ error: t(req.lang, "invalid_otp") });
    }

    db.prepare(
      `UPDATE users SET otp_code = NULL, otp_expires_at = NULL, nb_trys = 0 WHERE id = ?`,
    ).run(id);
    const jwtToken = await reply.jwtSign({
      id : id,
    });
    reply
      .setCookie("token", jwtToken,{
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60, // 1 hour
      })
      .code(200)
      .send({ jwtToken, message: t(req.lang, "2fa_success") });
  } catch (err) {
    return reply.status(500).send({ error: t(req.lang, "server_error") });
  }
}
