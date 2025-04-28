export interface User {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
}

export interface Course {
  modules: any;
  id: number;
  title: string;
  description: string;
  category: string;
  level: string;
  price: number ;
  thumbnailUrl: string;
  user: User;

}
export interface Module {
  id: number;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: number;
  title: string;
  description?: string;
  contentUrl?: string;
  contentType?: 'pdf' | 'video';
  thumbnailUrl?: string;
}
