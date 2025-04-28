export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  bio?: string;
  skills?: string[];
  role?: string;
  profileImage?: string;
  isActive?: boolean;
  friendshipStatus?: string;
  matchScore?: number;
  friendshipId?: number;
}
