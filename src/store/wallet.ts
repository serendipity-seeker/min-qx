import { atom } from 'jotai';
import type { Balance } from '../types';

interface IWalletState {
  id: string;
  seed: string;
  balance: Balance;
}

export const walletAtom = atom<IWalletState>({ id: '', seed: '', balance: {} as Balance });
