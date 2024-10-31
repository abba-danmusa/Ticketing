import { Publisher, Subjects, TicketUpdatedEvent } from '@danmusa/common'

export class TicketUpdatedPublisher extends Publisher<TicketUpdatedEvent> {
  subject: Subjects.TicketUpdated = Subjects.TicketUpdated
}