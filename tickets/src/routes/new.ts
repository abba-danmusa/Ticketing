import express, { Request, Response } from 'express'
import { requireAuth, validateRequest } from '@danmusa/common'
import { body } from 'express-validator'
import { Ticket } from '../models/Ticket'
import { natsClient } from '../nats-client'
import { TicketCreatedPublisher } from '../events/publishers/ticket-created-publisher'

const router = express.Router()

const validateParams = [
  body('title')
    .not()
    .isEmpty()
    .withMessage('Please provide a title'),
  body('price')
    .isFloat({ gt: 0 })
    .withMessage('Price must be greater than 0')
]

router.post('/api/tickets',
  requireAuth, 
  validateParams,
  validateRequest,
  async (req: Request, res: Response) => {
    
    const { title, price } = req.body

    const ticket = Ticket.build({
      title,
      price,
      userId: req.currentUser!.id
    })

    await ticket.save()

    new TicketCreatedPublisher(natsClient.client).publish({
      id: ticket.id,
      version: ticket.version,
      title: ticket.title,
      price: ticket.price,
      userId: ticket.userId
    })

    res.status(201).send(ticket)

  }
)

export {router as createTicketRouter}