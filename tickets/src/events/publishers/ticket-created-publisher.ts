import { Publisher, Subjects, TicketCreatedEvent } from '@danmusa/common'

export class TicketCreatedPublisher extends Publisher<TicketCreatedEvent> {
  subject: Subjects.TicketCreated = Subjects.TicketCreated
}