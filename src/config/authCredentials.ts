export interface AuthorizedAccount {
  email: string
  password: string
  role: 'admin' | 'branch'
  branch: string | null
  fullName: string
}

export const AUTHORIZED_LOGIN_ACCOUNTS: Record<string, AuthorizedAccount> = {
  'admincatalyst@gmail.com': {
    email: 'admincatalyst@gmail.com',
    password: 'admin123',
    role: 'admin',
    branch: null,
    fullName: 'Admin User',
  },
  'aniyapuramcatalyst@gmail.com': {
    email: 'aniyapuramcatalyst@gmail.com',
    password: 'anicatalyst',
    role: 'branch',
    branch: 'Aniyapuram',
    fullName: 'Aniyapuram Branch',
  },
  'vallipuramcatalyst@gmail.com': {
    email: 'vallipuramcatalyst@gmail.com',
    password: 'vallicatalyst',
    role: 'branch',
    branch: 'Vallipuram',
    fullName: 'Vallipuram Branch',
  },
}
