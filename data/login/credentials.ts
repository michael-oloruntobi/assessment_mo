const { USERNAME: username, PASSWORD: password } = process.env;

if (!username || !password) {
  throw new Error(
    'Missing USERNAME or PASSWORD environment variables. Check your .env file.'
  );
}

export const ADMIN_CREDENTIALS = {
  username,
  password,
};
