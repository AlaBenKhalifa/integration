import { Event } from './event.model';
import {User} from "./user.model";

export interface Ticket {
  user?: User;
  ticketId?: number;
  discount: number;
  dateAchat?: string;
  userId: number;
  event: Event;
}
