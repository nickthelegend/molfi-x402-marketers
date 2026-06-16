import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { avalancheFuji } from 'wagmi/chains';
import { http } from 'wagmi';

export const config = getDefaultConfig({
  appName: 'Molfi Marketers',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || '9545ec19e71df974b9f298c4749f298c',
  chains: [avalancheFuji],
  ssr: true,
  transports: {
    [avalancheFuji.id]: http('https://api.avax-test.network/ext/bc/C/rpc'),
  },
});
