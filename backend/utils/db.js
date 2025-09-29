import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'


//path for the database file
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


const dbPath = path.join(__dirname, 'db_volume', 'db.sqlite')

//database creation
export const db = new Database(dbPath)

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        login TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        alias TEXT,
        avatarUrl TEXT DEFAULT 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=coco',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        auth_provider TEXT DEFAULT 'local',
        secure_auth BOOLEAN DEFAULT FALSE,
        otp_code INTEGER DEFAULT NULL,
        otp_expires_at TIMESTAMP DEFAULT NULL,
        nb_trys INTEGER DEFAULT 0,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        online BOOLEAN DEFAULT FALSE,
        public_login TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_player1 INTEGER,
        id_player2 INTEGER,
        player1 TEXT NOT NULL,
        player2 TEXT NOT NULL,
        winner INTEGER DEFAULT NULL,
        score1 INTEGER DEFAULT 0,
        score2 INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tournamentId INTEGER DEFAULT NULL,
        duration INTEGER DEFAULT 0,
        mode TEXT DEFAULT 'normal'
    );

    CREATE TABLE IF NOT EXISTS tournaments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        maxPlayers INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS friends (
        user_id INTEGER NOT NULL,
        friend_id INTEGER NOT NULL,
        PRIMARY KEY (user_id, friend_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (friend_id) REFERENCES users(id)
    );
`);


export default db;