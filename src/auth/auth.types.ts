export interface IUserResponse {
  status: string;
  fio: string;
  activated: boolean;
  loginIsPossible: boolean;
  timeStamp: string;
  isAdmin: boolean;
  refreshToken: string;
}
