import { ThemeProvider, CssBaseline } from '@mui/material';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import { getTheme } from './utils/getTheme';
import themeAtom from './store/theme';
import { useAtom } from 'jotai';

const App: React.FC = () => {
  const [theme] = useAtom(themeAtom);

  return (
    <ThemeProvider theme={getTheme(theme)}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};

export default App;
