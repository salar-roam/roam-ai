export type Event = {
  id: string;
  title: string;
  description?: string;
  date?: string;
  location?: {
    name: string;
    address: string;
  };
  [key: string]: any;
}; 