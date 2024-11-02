import {
  BadRequestError,
  NotAuthorizedError,
  NotFoundError,
  requireAuth,
  validateRequest
} from '@danmusa/common'
import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import { Ticket } from '../models/Ticket'
import { TicketUpdatedPublisher } from '../events/publishers/ticket-updated-publisher'
import { natsClient } from '../nats-client'

const router = express.Router()

const validateParams = [
  body('title')
    .not()
    .isEmpty()
    .withMessage('Please provide a title'),
  body('price')
    .isFloat({ gt: 0 })
    .withMessage('price must be greater than 0')
]

router.put('/api/tickets/:id',
  requireAuth,
  validateParams,
  validateRequest,
  async (req: Request, res: Response) => {
    
    const ticket = await Ticket.findById(req.params.id)

    if (!ticket) {
      throw new NotFoundError()
    }

    if (ticket.orderId) {
      throw new BadRequestError('Cannot edit a reserved ticket')
    }

    if (ticket.userId !== req.currentUser!.id) {
      throw new NotAuthorizedError()
    }

    ticket.set({
      title: req.body.title,
      price: req.body.price
    })

    await ticket.save()

    new TicketUpdatedPublisher(natsClient.client).publish({
      id: ticket.id,
      version: ticket.version,
      title: ticket.title,
      price: ticket.price,
      userId: ticket.userId
    })

    res.send(ticket)

  }
)

export {router as updateTicketRouter}