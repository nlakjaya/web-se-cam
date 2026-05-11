export type GoogleClass = {
  getToken: () => Promise<GoogleToken>;
};

export type GoogleToken = {
  bearer: string;
  expiry: number;
};
