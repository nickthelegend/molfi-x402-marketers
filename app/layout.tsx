'use client';

import '@rainbow-me/rainbowkit/styles.css';
import './globals.css';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http } from 'wagmi';
import { avalancheFuji } from 'wagmi/chains';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import { TxModalProvider } from '../components/tx/TxModalProvider';
import { config } from '../lib/wagmi';

const queryClient = new QueryClient();

const display = Space_Grotesk({ subsets: ['latin'], weight: ['400','500','700'], variable: '--font-display' });
const bodyFont = Inter({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400','500','700'], variable: '--font-mono' });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${bodyFont.variable} ${mono.variable}`}>
      <body className="antialiased font-sans">
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider
              theme={darkTheme({
                accentColor: '#ad46ff',
                accentColorForeground: 'white',
                borderRadius: 'medium',
                overlayBlur: 'small',
              })}
            >
              <TxModalProvider>
                {children}
              </TxModalProvider>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
