import { Publisher, OrderCreatedEvent, Subjects } from '@danmusa/common';

export class OrderCreatedPublisher extends Publisher<OrderCreatedEvent> {
  subject:  Subjects.OrderCreated = Subjects.OrderCreated
}
