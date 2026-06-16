import { create } from 'zustand';

interface MarketerState {
  token: string | null;
  walletAddress: string | null;
  balanceUsdc: string;
  setSession: (token: string | null, address: string | null) => void;
  setBalance: (balance: string) => void;
  logout: () => void;
}

export const useMarketerStore = create<MarketerState>((set) => {
  // Safe SSR check
  const isClient = typeof window !== 'undefined';
  const initialToken = isClient ? localStorage.getItem('molfi_marketer_token') : null;
  const initialAddress = isClient ? localStorage.getItem('molfi_marketer_address') : null;

  return {
    token: initialToken,
    walletAddress: initialAddress,
    balanceUsdc: '0.000000',
    setSession: (token, address) => {
      if (isClient) {
        if (token) localStorage.setItem('molfi_marketer_token', token);
        else localStorage.removeItem('molfi_marketer_token');

        if (address) localStorage.setItem('molfi_marketer_address', address);
        else localStorage.removeItem('molfi_marketer_address');
      }
      set({ token, walletAddress: address });
    },
    setBalance: (balance) => set({ balanceUsdc: balance }),
    logout: () => {
      if (isClient) {
        localStorage.removeItem('molfi_marketer_token');
        localStorage.removeItem('molfi_marketer_address');
      }
      set({ token: null, walletAddress: null, balanceUsdc: '0.000000' });
    },
  };
});
