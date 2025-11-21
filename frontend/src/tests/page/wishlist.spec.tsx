// import { render, screen } from '@testing-library/react';
// import { describe, expect, it, test, vi } from 'vitest';
// import TravelWishlistApp from '@/app/wishlist/page';
// import { ClerkProvider } from '@clerk/nextjs';

// vi.mock('@clerk/nextjs');

// export const useAuth = vi.fn(() => ({
//   isLoaded: true,
//   isSignedIn: true,
//   userId: 'test-user-id',
//   sessionId: 'test-session-id',
//   getToken: vi.fn(() => Promise.resolve('mock-token')),
// }));

// const TestProviders = ({ isLoggedIn = false, children }: { isLoggedIn?: boolean; children: React.ReactNode }) => {
//   return <ClerkProvider>{children}</ClerkProvider>;
// };

// const renderWithProviders = (ui: React.ReactElement, isLoggedIn = false) => {
//   return render(<TestProviders isLoggedIn={isLoggedIn}>{ui}</TestProviders>);
// };

// describe('行きたいリストのページ', () => {
//   const isLoggedIn = true;
//   renderWithProviders(<TravelWishlistApp />, isLoggedIn);
//   it('レンダリングされること', () => {
//     expect(true).toBe(true);
//   });
//   // describe('ヘッダー情報の表示', () => {
//   //   // ヘッダーの行きたいリストが表示されていること
//   //   // リストビューとマップビューの切り替えボタンが表示されていること
//   //   // expect(screen.getByRole('button', { name: 'list-view', hidden: true })).toBeDefined();
//   //   // expect(screen.getByRole('button', { name: 'map-view', hidden: true })).toBeDefined();
//   // });
// });
