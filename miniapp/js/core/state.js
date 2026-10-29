// حالة مركزية للتطبيق (بدون window.*)
export const state = {
  user: null,
  balance: 0,
  activePage: 'home',
  
  setUser(userData) {
    this.user = userData;
    this.balance = userData?.balance || 0;
  },
  
  setPage(pageId) {
    this.activePage = pageId;
  }
};
