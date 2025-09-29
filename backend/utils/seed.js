import bcrypt from 'bcrypt';


export async function seedDatabase(db) {
  // Vérifier si la base de données contient déjà des utilisateurs
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log(`Nombre d'utilisateurs dans la base de données : ${userCount.count}`);
  if (userCount.count > 0) {
    console.log(`📊 Base de données déjà initialisée avec ${userCount.count} utilisateurs.`);
    return;
  }

  
  console.log('🌱 Initialisation de la base de données...');

  // Utilisateurs fictifs avec statistiques mises à jour
  const users = [
    { login: 'adem', email: 'adem@example.com', games_won: 8, games_played: 12, public_login: 'Adem' }, // 8 victoires sur 12 matchs
    { login: 'geoffrey', email: 'geoffrey@example.com', games_won: 3, games_played: 10, public_login: 'Geoffrey' }, // 3 victoires sur 10 matchs
    { login: 'oceane', email: 'oceane@example.com', games_won: 2, games_played: 8, public_login: 'Océane' }, // 2 victoires sur 8 matchs
    { login: 'lucie', email: 'lucie@example.com', games_won: 7, games_played: 11, public_login: 'Lucie' }, // 7 victoires sur 11 matchs
    { login: 'coco', email: 'coco@example.com', games_won: 7, games_played: 11, public_login: 'Coco' }, // 7 victoires sur 11 matchs
    { login: 'rydom', email: 'rydom@example.com', games_won: 1, games_played: 8, public_login: 'Rydom' }, // 1 victoire sur 8 matchs
  ];


  const insertUser = db.prepare(`
    INSERT INTO users (login, email, password, alias, games_played, games_won, public_login)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const password = 'Coco1234!';
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  for (const u of users) {
    insertUser.run(u.login, u.email, hash, u.login, u.games_played, u.games_won, u.public_login);
  }

  // Récupérer les IDs
  const getUserId = db.prepare(`SELECT id FROM users WHERE login = ?`);
  const userIds = {};
  for (const u of users) {
    const row = getUserId.get(u.login);
    userIds[u.login] = row.id;
  }

  // Tournoi
//   const insertTournament = db.prepare(`
//     INSERT INTO tournaments (name, organizer, maxPlayers, start_at)
//     VALUES (?, ?, ?, datetime('now', '+1 day'))
//   `);
//   const tournamentName = 'Summer Cup';
//   insertTournament.run(tournamentName, 'oceane', 6);
//   const tournamentId = db.prepare(`SELECT id FROM tournaments WHERE name = ?`).get(tournamentName).id;

  // Matchs
  const insertMatch = db.prepare(`
    INSERT INTO matches (player1, player2, winner, score1, score2, duration, mode, id_player1, id_player2)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  
  // Matchs contre des invités (guest)
  insertMatch.run('Adem', 'guest', userIds['adem'], 5, 2, 180, 'local', userIds['adem'], null);
  insertMatch.run('Geoffrey', 'guest', null, 3, 5, 200, 'local', userIds['geoffrey'], null);
  insertMatch.run('Océane', 'guest', userIds['oceane'], 5, 4, 220, 'local', userIds['oceane'], null);
  insertMatch.run('Lucie', 'guest', userIds['lucie'], 5, 1, 190, 'local', userIds['lucie'], null);
  insertMatch.run('Coco', 'guest', userIds['coco'], 5, 0, 160, 'local', userIds['coco'], null);
  insertMatch.run('Rydom', 'guest', null, 2, 5, 240, 'local', userIds['rydom'], null);
  
  // Matchs contre l'IA
  insertMatch.run('Adem', 'ia', userIds['adem'], 5, 1, 150, 'ia', userIds['adem'], null);
  insertMatch.run('Geoffrey', 'ia', userIds['geoffrey'], 5, 3, 170, 'ia', userIds['geoffrey'], null);
  insertMatch.run('Océane', 'ia', null, 3, 5, 180, 'ia', userIds['oceane'], null);
  insertMatch.run('Lucie', 'ia', userIds['lucie'], 5, 2, 140, 'ia', userIds['lucie'], null);
  insertMatch.run('Coco', 'ia', userIds['coco'], 5, 0, 120, 'ia', userIds['coco'], null);
  insertMatch.run('Rydom', 'ia', null, 1, 5, 200, 'ia', userIds['rydom'], null);
  
  // Matchs en remote
  insertMatch.run('Adem', 'Océane', userIds['adem'], 5, 4, 280, 'remote', userIds['adem'], userIds['oceane']);
  insertMatch.run('Geoffrey', 'Coco', userIds['coco'], 2, 5, 320, 'remote', userIds['geoffrey'], userIds['coco']);
  insertMatch.run('Lucie', 'Rydom', userIds['lucie'], 5, 3, 260, 'remote', userIds['lucie'], userIds['rydom']);
  insertMatch.run('Océane', 'Geoffrey', userIds['oceane'], 5, 2, 290, 'remote', userIds['oceane'], userIds['geoffrey']);
  insertMatch.run('Coco', 'Lucie', userIds['coco'], 5, 1, 270, 'remote', userIds['coco'], userIds['lucie']);
  insertMatch.run('Rydom', 'Adem', null, 3, 5, 310, 'remote', userIds['rydom'], userIds['adem']);
  insertMatch.run('Geoffrey', 'Lucie', null, 4, 5, 250, 'remote', userIds['geoffrey'], userIds['lucie']);
  insertMatch.run('Adem', 'Coco', userIds['adem'], 5, 3, 300, 'remote', userIds['adem'], userIds['coco']);
  
  // Matchs de tournoi
  insertMatch.run('Adem', 'Lucie', userIds['adem'], 5, 2, 240, 'tournament', userIds['adem'], userIds['lucie']);
  insertMatch.run('Geoffrey', 'Océane', userIds['geoffrey'], 5, 3, 270, 'tournament', userIds['geoffrey'], userIds['oceane']);
  insertMatch.run('Coco', 'Adem', userIds['coco'], 5, 4, 300, 'tournament', userIds['coco'], userIds['adem']);
  insertMatch.run('Lucie', 'Geoffrey', userIds['lucie'], 5, 1, 230, 'tournament', userIds['lucie'], userIds['geoffrey']);
  insertMatch.run('Océane', 'Rydom', null, 2, 5, 280, 'tournament', userIds['oceane'], userIds['rydom']);
  insertMatch.run('Coco', 'Océane', userIds['coco'], 5, 0, 220, 'tournament', userIds['coco'], userIds['oceane']);
  insertMatch.run('Adem', 'Rydom', userIds['adem'], 5, 3, 260, 'tournament', userIds['adem'], userIds['rydom']);
  insertMatch.run('Geoffrey', 'Coco', null, 1, 5, 290, 'tournament', userIds['geoffrey'], userIds['coco']);

  // Amitiés - tout le monde a au moins un ami
  const insertFriend = db.prepare(`
    INSERT INTO friends (user_id, friend_id)
    VALUES (?, ?)
  `);

  function addFriend(a, b) {
    insertFriend.run(userIds[a], userIds[b]);
    insertFriend.run(userIds[b], userIds[a]);
  }
  
  // Réseau d'amitié pour que chacun ait au moins un ami
  addFriend('adem', 'oceane');
  addFriend('adem', 'geoffrey');
  addFriend('adem', 'lucie');
  
  addFriend('geoffrey', 'lucie');
  addFriend('geoffrey', 'coco');
  
  addFriend('oceane', 'rydom');
  addFriend('oceane', 'coco');
  
  addFriend('lucie', 'coco');
  addFriend('lucie', 'rydom');
  
  addFriend('coco', 'rydom');
  
  // Rydom est ami avec Adem aussi pour plus de connexions
  addFriend('rydom', 'adem');

  console.log('✅ Base de données initialisée avec succès : 6 utilisateurs, 30 matchs (guest, IA, remote, tournoi) et un réseau d\'amitiés complet.');
}
