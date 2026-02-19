import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    // JWTトークンにユーザー情報を追加
    async jwt({ token, account, profile }) {
      // Googleログイン時、profile.subが固有のユーザーID
      if (account && profile) {
        token.id = account.providerAccountId;
      }
      if (account) {
        token.accessToken = account.access_token;
      }

      return token;
    },
    // セッションにユーザーIDを追加
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  // 本番環境用の設定
  trustHost: true,
});
