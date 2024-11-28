import { atom } from 'jotai';

interface IWalletState {
  id: string;
  seed: string;
}

export const walletAtom = atom<IWalletState>({ id: '', seed: '' });
