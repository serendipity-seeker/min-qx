import { Button } from '@mui/material';
import { Visibility } from '@mui/icons-material';
import { VisibilityOff } from '@mui/icons-material';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import { Box } from '@mui/material';
import { useCallback, useState } from 'react';
import { QubicHelper } from '@qubic-lib/qubic-ts-library/dist/qubicHelper';
import { useAtom } from 'jotai';
import { walletAtom } from '../store/wallet';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [showSeed, setShowSeed] = useState<boolean>(false);
  const [seed, setSeed] = useState<string>('');
  const [wallet, setWallet] = useAtom(walletAtom);
  const navigate = useNavigate();

  const login = useCallback(async (): Promise<void> => {
    const qubic = await new QubicHelper();
    const qubicPackage = await qubic.createIdPackage(seed);
    const newId = qubicPackage.publicId;

    setWallet({ id: newId, seed });

    navigate('/');
  }, [seed]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
      <TextField
        label="Seed"
        type={showSeed ? 'text' : 'password'}
        value={seed}
        onChange={(e) => setSeed(e.target.value)}
        variant="outlined"
        fullWidth
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShowSeed(!showSeed)} edge="end">
                {showSeed ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <Button variant="contained" onClick={login} sx={{ width: 'fit-content' }}>
        Login
      </Button>
    </Box>
  );
};

export default Login;
