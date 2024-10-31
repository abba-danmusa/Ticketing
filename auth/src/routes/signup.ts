import express, {Request, Response} from 'express'
import { body } from 'express-validator'
import jwt from 'jsonwebtoken'

import { User } from '../models/User'
import { BadRequestError, validateRequest } from '@danmusa/common'

const router = express.Router()

router.post('/api/users/signup',
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .trim()
      .isLength({min: 4, max: 20})
      .withMessage('Password must be between 4 and 20 characters long')
  ],
  validateRequest,
  async (req: Request, res: Response) => {

    const { email, password } = req.body

    const existingUser = await User.findOne({ email })
    
    if (existingUser) {
      throw new BadRequestError('Email in use')
    }

    const user = User.build({ email, password })
    await user.save()

    const userJwt = jwt.sign({
      id: user.id,
      email: user.email
    }, process.env.JWT_SECRET!)

    req.session = {
      jwt: userJwt
    }

    res.status(201).send(user)
  }
)

export { router as signupRouter }