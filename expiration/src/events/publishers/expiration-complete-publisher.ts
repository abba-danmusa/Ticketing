import { Subjects, Publisher, ExpirationCompleteEvent } from "@danmusa/common";

export class ExpirationCompletePublisher extends Publisher<ExpirationCompleteEvent> {
  subject: Subjects.ExpirationComplete = Subjects.ExpirationComplete
}