import { signUp, signUpGoogle, signIn, signOut, verify2FA} from '../controllers/auth.js'
import { verifyUser } from '../controllers/users.js'

const signUpOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['login', 'password', 'email'],
      properties: {
        login: { type: 'string' },
        password: { type: 'string' },
        email: { type: 'string'},
      },
    },
    response: {
      201: {
        type: 'object',
        properties: {
          token: { type: 'string' },
        },
      },
    },
  },
  handler: signUp,
}

const signUpGoogleOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string' },
      },
    },
    response: {
      201: {
        type: 'object',
        properties: {
          login: { type: 'string' },
        },
      },
      400: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },
  handler: signUpGoogle,
}

const signInOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['givenLogin', 'auth_provider'],
      properties: {
        givenLogin: { type: 'string' },
        password: { type: 'string' },
        email: { type: 'string' },
        auth_provider: { type: 'string'},
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          login: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
  handler: signIn,
}

const signOutOptions = {
  preHandler: verifyUser,
    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
      },
    },
    handler: signOut,
}

const verify2FAOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['otp'],
      properties: {
        otp: { type: 'string' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          token: { type: 'string' },
        },
      },
      400: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },
  handler: verify2FA,
  }


export default async function authRoutes(fastify, options) {
  fastify.post('/auth/signup', signUpOptions)
  fastify.post('/auth/signup/google', signUpGoogleOptions)
  fastify.post('/auth/signin', signInOptions)
  fastify.get('/auth/signout', signOutOptions)
  fastify.post('/auth/verify2FA', verify2FAOptions)
}

