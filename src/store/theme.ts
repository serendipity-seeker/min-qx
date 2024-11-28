import { atom } from 'jotai';

type Theme = 'light' | 'dark';

const themeAtom = atom<Theme>('light');

export default themeAtom;
