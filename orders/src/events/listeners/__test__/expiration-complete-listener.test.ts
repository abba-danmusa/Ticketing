import { Message } from 'node-nats-streaming';
import mongoose from 'mongoose';
import { ExpirationCompleteEvent } from '@danmusa/common';
import { ExpirationCompleteListener } from '../expiration-complete-listener';
import { natsClient } from '../../../nats-client';
import { Order } from '../../../models/Order';
import { Ticket } from '../../../models/Ticket';
import { OrderStatus } from '@danmusa/common';

const setup = async () => {
  const listener = new ExpirationCompleteListener(natsClient.client);

  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: 'concert',
    price: 20
  });
  await ticket.save();

  const order = Order.build({
    status: OrderStatus.Created,
    userId: 'asdf',
    expiresAt: new Date(),
    ticket,
  });
  await order.save();

  const data: ExpirationCompleteEvent['data'] = {
    orderId: order.id
  };

  // @ts-ignore
  const msg: Message = {
    ack: jest.fn()
  };

  return { listener, order, ticket, data, msg };
};

it('updates the order status to cancelled', async () => {
  const { listener, order, data, msg } = await setup();

  await listener.onMessage(data, msg);

  const updatedOrder = await Order.findById(order.id);
  expect(updatedOrder!.status).toEqual(OrderStatus.Cancelled);
});

it('emits an OrderCancelled event', async () => {
  const { listener, order, data, msg } = await setup();

  await listener.onMessage(data, msg);

  expect(natsClient.client.publish).toHaveBeenCalled();

  const eventData = JSON.parse(
    (natsClient.client.publish as jest.Mock).mock.calls[0][1]
  );
  expect(eventData.id).toEqual(order.id);
});

it('acks the message', async () => {
  const { listener, data, msg } = await setup();

  await listener.onMessage(data, msg);

  expect(msg.ack).toHaveBeenCalled();
});
