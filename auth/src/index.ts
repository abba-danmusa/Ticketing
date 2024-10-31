import mongoose from 'mongoose'
import { app } from './app'

const start = async () => {
  process.env.JWT_SECRET = 'asdf'
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be defined')
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI must be defined')
  }

  try {
    await mongoose.connect(process.env.MONGO_URI)
    // await mongoose.connect('mongodb://127.0.0.1/auth')
    console.log('Connected to mongoose')
  } catch (error) {
    console.error(error)
  }

  app.listen('3000', () => {
    console.log('Auth Service listening on port 3000')
  })
}

start()