declare module 'argon2-browser' {
  export enum ArgonType {
    Argon2d = 0,
    Argon2i = 1,
    Argon2id = 2,
  }

  export interface ArgonHashOptions {
    pass: string | Uint8Array;
    salt: string | Uint8Array;
    time?: number;
    mem?: number;
    hashLen?: number;
    parallelism?: number;
    type?: ArgonType;
  }

  export interface ArgonHashResult {
    hash: Uint8Array;
    hashHex: string;
    encoded: string;
  }

  export function hash(options: ArgonHashOptions): Promise<ArgonHashResult>;
  export function verify(options: { pass: string; encoded: string }): Promise<boolean>;

  const argon2: {
    ArgonType: typeof ArgonType;
    hash: typeof hash;
    verify: typeof verify;
  };

  export default argon2;
}
