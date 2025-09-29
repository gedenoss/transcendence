import {  getUser,
          verifyUser, 
          updateUser,
          getFriendsUser, 
          removeFriends,
          anonymizeUser,
          deleteUser,
} from '../controllers/users.js';


const getUserOptions = {
  preHandler: verifyUser,
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          login: { type: "string" },
          public_login: { type: 'string' },
          email: { type: 'string' },
          avatarUrl: { type: 'string' },
          alias : { type: 'string' },
          auth_provider: { type: 'string' },
          secure_auth: { type: 'boolean' },
          games_played: { type: 'number' },
          games_won: { type: 'number' },
        },
      },
    },
  },
  handler: getUser,
};

const getFriendsOptions = {
  preHandler: verifyUser,
  schema: {
    response: {
      200: {
        type: "array",
        items: {
          type: "object",
          properties: {
            public_login: { type: "string" },
            avatarUrl: { type: "string" },
            games_played: { type: "number" },
            games_won: { type: "number" },
            online: { type: "boolean" },
          },
        },
      },
    },
  },
  handler: getFriendsUser,
};


const updateUserOptions = {
  preHandler: verifyUser,
  schema: {
    body: {
      type: "object",
      properties: {
        public_login: { type: "string"},
        login: { type: "string" },
        email: { type: "string" },
        avatarUrl: { type: "string" },
        password: { type: "string", minLength: 8 },
        secure_auth: { type: "boolean" },
        friend: { type: "string" },
        alias: { type: "string" },
      },
      additionalProperties: false, // refuse les clés inconnues
      minProperties: 1, // exige au moins une propriété à modifier
    },
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
      400: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
    },
  },
  handler: updateUser,
};

const removeFriendsOptions = {
  preHandler: verifyUser,
  schema: {
    body: {
      type: "object",
      properties: {
        friend: { type: "string" },
      },
      required: ["friend"],
    },
  },
  handler: removeFriends,
};

const anonymizeUserOptions = {
  preHandler: verifyUser,
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
    },
  },
  handler: anonymizeUser,
}

const deleteUserOptions = {
  preHandler: verifyUser,
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
      404: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
    },
  },
  handler: deleteUser,
}


export default async function userRoutes(fastify, options) {
  fastify.get("/user", getUserOptions);
  fastify.get("/friends", getFriendsOptions);
  fastify.put("/user", updateUserOptions);
  fastify.post("/friends/remove", removeFriendsOptions);
  fastify.post("/anonymize", anonymizeUserOptions);
  fastify.post("/delete", deleteUserOptions);
}
