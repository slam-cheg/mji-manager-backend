export interface IUserEntity {
  login: string;
  password: string;
  fio?: string;
  activated: boolean;
  isAdmin: boolean;
  key: string;
  refreshToken?: string | null;
}
