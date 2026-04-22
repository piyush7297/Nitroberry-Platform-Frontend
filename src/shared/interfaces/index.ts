export interface ILoginRequest {
  email: string;
  password: string;
}

export type User = {
  id: number;
  name: string;
  email: string;
};
export type Category = {
  id: number;
  title: string;
  description: string;
  url: string | null;
  logo: string;
  status: number;
};
