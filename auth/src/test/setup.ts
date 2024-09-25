import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import request from 'supertest'

import { app } from '../app'

// declare global {
//   namespace NodeJS {
//     interface Global {
//       signin(): Promise<string[]>
//     }
//   }
// }

let mongo: MongoMemoryServer

beforeAll(async () => {
  // Setup code to run before all tests

  process.env.JWT_SECRET = 'asdf'

  mongo = await MongoMemoryServer.create()
  const mongoUri = mongo.getUri()

  await mongoose.connect(mongoUri)
}, 900000000)

beforeEach(async () => {
  // Setup code to run before each test
  const collections = await mongoose.connection.db?.collections()

  if (collections) {
    for (let collection of collections) {
      await collection.deleteMany({})
    }
  }
}, 900000000)

afterAll(async () => {
  // Cleanup code to run after all tests
  if (mongo) {
    await mongo.stop()
  }
  await mongoose.connection.close()
}, 900000000)

declare global {
  var signin: () => Promise<string[]>
}

global.signin = async () => {
  const email = 'test@test.com'
  const password = 'password'

  const response = await request(app)
    .post('/api/users/signup')
    .send({ email, password })
    .expect(201)
  
  const cookie = response.get('Set-Cookie')
  return cookie || []
}