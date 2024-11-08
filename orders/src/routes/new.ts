import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import mongoose from 'mongoose'
import {
  NotFoundError,
  BadRequestError,
  OrderStatus,
  requireAuth,
  validateRequest
} from '@danmusa/common'

import { Ticket } from '../models/Ticket'
import { Order } from '../models/Order'
import { natsClient } from '../nats-client'
import { OrderCreatedPublisher } from '../events/publishers/order-created-publisher'

const router = express.Router()

const EXPIRATION_WINDOW_SECONDS = 15 * 60

const validateBody = [
  body('ticketId')
    .not()
    .isEmpty()
    .custom((input: string) => mongoose.Types.ObjectId.isValid(input))
    .withMessage('TicketId must be provided')
]

router.post('/api/orders',
  requireAuth,
  validateBody,
  validateRequest,
  async (req: Request, res: Response) => {
    const { ticketId } = req.body

    const ticket = await Ticket.findById(ticketId)

    if (!ticket) {
      throw new NotFoundError()
    }

    const isReserved = await ticket.isReserved()

    if (isReserved) {
      throw new BadRequestError('Ticket is already reserved')
    }

    const expiration = new Date()
    expiration.setSeconds(expiration.getSeconds() + EXPIRATION_WINDOW_SECONDS)

    const order = Order.build({
      userId: req.currentUser!.id,
      status: OrderStatus.Created,
      expiresAt: expiration,
      ticket
    })
    await order.save()

    new OrderCreatedPublisher(natsClient.client).publish({
      id: order.id,
      status: order.status,
      userId: order.userId,
      version: ticket.version,
      expiresAt: order.expiresAt.toISOString(),
      ticket: {
        id: ticket.id,
        price: ticket.price,
      }
    })

    res.status(201).send(order)
  }
)

export { router as newOrderRouter }