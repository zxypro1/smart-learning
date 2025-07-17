import '@mantine/core/styles.css';
import '../styles/global-bg.css';
import '../styles/animations.css';
import 'katex/dist/katex.min.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { MantineProvider } from '@mantine/core';
import { theme } from '../theme';
import { AuthProvider, useAuth } from '../components/Auth/AuthContext';
import { NotificationDisplay } from '../components/NotificationDisplay';
import { Layout } from '../components/Layout/Layout';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If the token is gone, but the component hasn't unmounted yet,
    // this will redirect to the auth page.
    if (!isAuthenticated && !token && router.pathname !== '/auth') {
      router.push('/auth');
    }
  }, [isAuthenticated, token, router]);

  // This prevents a flash of unauthenticated content
  if (!isAuthenticated && router.pathname !== '/auth') {
    return null; // Or a loading spinner
  }

  return <>{children}</>;
};

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const noLayoutRoutes = ['/auth'];

  return (
    <>
      <Head>
        <title>智学堂 | AI 自学、网课制作与分享平台</title>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
        <link rel="shortcut icon" href="/favi3.png" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
        
      </Head>
      <MantineProvider theme={theme}>
        <Analytics /> 
        <SpeedInsights />
        <AuthProvider>
          <AuthGuard>
            {noLayoutRoutes.includes(router.pathname) ? (
              <Component {...pageProps} />
            ) : (
              <Layout>
                <Component {...pageProps} />
              </Layout>
            )}
          </AuthGuard>
          <NotificationDisplay />
        </AuthProvider>
      </MantineProvider>
    </>
  );
} 
