export interface Event {
  eventId: number;
  titre: string;
  date: string;
  description: string;
  lieu: string;
  userId: number;
  user?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}
