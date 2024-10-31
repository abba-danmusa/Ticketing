import request from 'supertest';
import { app } from '../../app';
import { Ticket } from '../../models/Ticket';
import { Order } from '../../models/Order';
import mongoose from 'mongoose';
import { OrderStatus } from '@danmusa/common';

it('marks an order as cancelled', async () => {
  // Create a ticket
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: 'concert',
    price: 20,
  });
  await ticket.save();

  const user = global.signin();
  // Create an order
  const { body: order } = await request(app)
    .post('/api/orders')
    .set('Cookie', user)
    .send({ ticketId: ticket.id })
    .expect(201);

  // Make request to cancel the order
  await request(app)
    .delete(`/api/orders/${order.id}`)
    .set('Cookie', user)
    .send()
    .expect(204);

  // Expectation to make sure the order is cancelled
  const updatedOrder = await Order.findById(order.id);

  expect(updatedOrder!.status).toEqual(OrderStatus.Cancelled);
});

it('returns an error if one user tries to delete another users order', async () => {
  // Create a ticket
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: 'concert',
    price: 20,
  });
  await ticket.save();

  const user = global.signin();
  // Create an order
  const { body: order } = await request(app)
    .post('/api/orders')
    .set('Cookie', user)
    .send({ ticketId: ticket.id })
    .expect(201);

  // Make request to cancel the order with a different user
  await request(app)
    .delete(`/api/orders/${order.id}`)
    .set('Cookie', global.signin())
    .send()
    .expect(401);

  // Expectation to make sure the order is not cancelled
  const updatedOrder = await Order.findById(order.id);

  expect(updatedOrder!.status).not.toEqual(OrderStatus.Cancelled);
});

it('returns a 404 when trying to delete a non-existent order', async () => {
  const fakeOrderId = new mongoose.Types.ObjectId().toHexString();

  await request(app)
    .delete(`/api/orders/${fakeOrderId}`)
    .set('Cookie', global.signin())
    .send()
    .expect(404);
});
