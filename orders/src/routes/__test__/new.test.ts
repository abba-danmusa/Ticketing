
import request from 'supertest';
import { app } from '../../app';
import { Order, OrderStatus } from '../../models/Order';
import { Ticket } from '../../models/Ticket';
import mongoose from 'mongoose';
import { natsClient } from '../../nats-client';

describe('New Order Route', () => {
  it('returns an error if the ticket does not exist', async () => {
    const ticketId = new mongoose.Types.ObjectId();

    await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({ ticketId })
      .expect(404);
  });

  it('returns an error if the ticket is already reserved', async () => {
    const ticket = Ticket.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'concert',
      price: 20,
    });
    await ticket.save();
    const order = Order.build({
      ticket,
      userId: 'randomuserid',
      status: OrderStatus.Created,
      expiresAt: new Date(),
    });
    await order.save();

    await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({ ticketId: ticket.id })
      .expect(400);
  });

  it('reserves a ticket', async () => {
    const ticket = Ticket.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'concert',
      price: 20,
    });
    await ticket.save();

    await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({ ticketId: ticket.id })
      .expect(201);
  });

  it('emits an order created event', async () => {
    const ticket = Ticket.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'concert',
      price: 20,
    });
    await ticket.save();

    await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({ ticketId: ticket.id })
      .expect(201);

    expect(natsClient.client.publish).toHaveBeenCalled();
  });
});

describe('Get Orders Route', () => {
  it('fetches orders for a particular user', async () => {
    // Create three tickets
    const ticketOne = await Ticket.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'concert 1',
      price: 20,
    }).save();

    const ticketTwo = await Ticket.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'concert 2',
      price: 30,
    }).save();

    const ticketThree = await Ticket.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'concert 3',
      price: 40,
    }).save();

    const userOne = global.signin();
    const userTwo = global.signin();

    // Create one order as User #1
    await request(app)
      .post('/api/orders')
      .set('Cookie', userOne)
      .send({ ticketId: ticketOne.id })
      .expect(201);

    // Create two orders as User #2
    const { body: orderOne } = await request(app)
      .post('/api/orders')
      .set('Cookie', userTwo)
      .send({ ticketId: ticketTwo.id })
      .expect(201);
    const { body: orderTwo } = await request(app)
      .post('/api/orders')
      .set('Cookie', userTwo)
      .send({ ticketId: ticketThree.id })
      .expect(201);

    // Make request to get orders for User #2
    const response = await request(app)
      .get('/api/orders')
      .set('Cookie', userTwo)
      .expect(200);

    // Make sure we only got the orders for User #2
    expect(response.body.length).toEqual(2);
    expect(response.body[0].id).toEqual(orderOne.id);
    expect(response.body[1].id).toEqual(orderTwo.id);
    expect(response.body[0].ticket.id).toEqual(ticketTwo.id);
    expect(response.body[1].ticket.id).toEqual(ticketThree.id);
  });
});

describe('Get Order Route', () => {
  it('fetches the order', async () => {
    // Create a ticket
    const ticket = await Ticket.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'concert',
      price: 20,
    }).save();

    const user = global.signin();
    // make a request to build an order with this ticket
    const { body: order } = await request(app)
      .post('/api/orders')
      .set('Cookie', user)
      .send({ ticketId: ticket.id })
      .expect(201);

    // make request to fetch the order
    const { body: fetchedOrder } = await request(app)
      .get(`/api/orders/${order.id}`)
      .set('Cookie', user)
      .send()
      .expect(200);

    expect(fetchedOrder.id).toEqual(order.id);
  });

  it('returns an error if one user tries to fetch another users order', async () => {
    // Create a ticket
    const ticket = await Ticket.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'concert',
      price: 20,
    }).save();

    const user = global.signin();
    // make a request to build an order with this ticket
    const { body: order } = await request(app)
      .post('/api/orders')
      .set('Cookie', user)
      .send({ ticketId: ticket.id })
      .expect(201);

    // make request to fetch the order
    await request(app)
      .get(`/api/orders/${order.id}`)
      .set('Cookie', global.signin())
      .send()
      .expect(401);
  });
});

describe('Delete Order Route', () => {
  it('marks an order as cancelled', async () => {
    // create a ticket with Ticket Model
    const ticket = await Ticket.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'concert',
      price: 20,
    }).save();

    const user = global.signin();
    // make a request to create an order
    const { body: order } = await request(app)
      .post('/api/orders')
      .set('Cookie', user)
      .send({ ticketId: ticket.id })
      .expect(201);

    // make a request to cancel the order
    await request(app)
      .delete(`/api/orders/${order.id}`)
      .set('Cookie', user)
      .send()
      .expect(204);

    // expectation to make sure the thing is cancelled
    const updatedOrder = await Order.findById(order.id);

    expect(updatedOrder!.status).toEqual('cancelled');
  });

  it('emits a order cancelled event', async () => {
    const ticket = await Ticket.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'concert',
      price: 20,
    }).save();

    const user = global.signin();
    // make a request to create an order
    const { body: order } = await request(app)
      .post('/api/orders')
      .set('Cookie', user)
      .send({ ticketId: ticket.id })
      .expect(201);

    // make a request to cancel the order
    await request(app)
      .delete(`/api/orders/${order.id}`)
      .set('Cookie', user)
      .send()
      .expect(204);

    expect(natsClient.client.publish).toHaveBeenCalled();
  });
});