import { Button } from '@mui/material';
import { Visibility } from '@mui/icons-material';
import { VisibilityOff } from '@mui/icons-material';
import { IconButton, InputAdornment, TextField, Typography, Paper } from '@mui/material';
import { Box } from '@mui/material';
import { useCallback, useState } from 'react';
import { QubicHelper } from '@qubic-lib/qubic-ts-library/dist/qubicHelper';
import { useAtom } from 'jotai';
import { walletAtom } from '../store/wallet';
import { useNavigate } from 'react-router-dom';
import { AccountCircle } from '@mui/icons-material';

const Login: React.FC = () => {
  const [showSeed, setShowSeed] = useState<boolean>(false);
  const [seed, setSeed] = useState<string>('');
  const [wallet, setWallet] = useAtom(walletAtom);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const login = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const qubic = await new QubicHelper();
      const qubicPackage = await qubic.createIdPackage(seed);
      const newId = qubicPackage.publicId;

      setWallet({ id: newId, seed });
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  }, [seed]);

  return (
    <Box 
      sx={{ 
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: (theme) => theme.palette.grey[100]
      }}
    >
      <Paper 
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: 3
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <AccountCircle sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Please enter your seed to login
          </Typography>
        </Box>

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
                <IconButton 
                  onClick={() => setShowSeed(!showSeed)} 
                  edge="end"
                  aria-label={showSeed ? 'hide seed' : 'show seed'}
                >
                  {showSeed ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        
        <Button 
          variant="contained" 
          onClick={login}
          disabled={loading || !seed}
          fullWidth
          size="large"
          sx={{ 
            py: 1.5,
            textTransform: 'none',
            fontSize: '1.1rem'
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </Button>
      </Paper>
    </Box>
  );
};

export default Login;
