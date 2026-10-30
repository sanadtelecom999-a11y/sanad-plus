export const token = {
  get: () => sessionStorage.getItem('sanad_admin_token'),
  set: (jwt) => sessionStorage.setItem('sanad_admin_token', jwt),
  clear: () => sessionStorage.removeItem('sanad_admin_token'),
  isExpired: () => false
};
