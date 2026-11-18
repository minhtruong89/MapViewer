import { openLoginBrowser, closeBrowser } from './scraper.js';

console.log('Đang mở cửa sổ trình duyệt để đăng nhập Google Maps...');
await openLoginBrowser();
console.log('Hãy đăng nhập tài khoản Google của bạn trên cửa sổ vừa mở, sau đó đóng cửa sổ trình duyệt đó.');

// Keep process alive until user closes the browser window
const timer = setInterval(async () => {
  const { getAuthStatus } = await import('./scraper.js');
  if (!getAuthStatus().loginOpen) {
    clearInterval(timer);
    await closeBrowser();
    console.log('Đã lưu phiên đăng nhập vào .browser-profile!');
    process.exit(0);
  }
}, 1000);
