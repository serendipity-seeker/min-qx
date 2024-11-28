import { Paper, TableContainer, IconButton, TableHead, TableCell, Table, Typography, TableBody, TableRow } from '@mui/material';
import { Order } from '../types';
import { Delete as DeleteIcon } from '@mui/icons-material';

interface OrderTableProps {
  orders: Order[];
  type: 'Ask' | 'Bid';
  id: string;
  tabLabels: string[];
  tabIndex: number;
  placeOrder: (label: string, type: 'buy' | 'sell' | 'rmBuy' | 'rmSell', price: number, amount: number) => Promise<void>;
}

const OrderTable: React.FC<OrderTableProps> = ({ orders, type, id, tabLabels, tabIndex, placeOrder }) => {
  return (
    <TableContainer component={Paper} sx={{ mt: 2, mb: 3 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Action</TableCell>
            <TableCell align="right">Price (qu)</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell>Entity ID</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((item, index) => (
            <TableRow key={item.entityId + index}>
              <TableCell>
                {id === item.entityId && (
                  <IconButton size="small" onClick={() => placeOrder(tabLabels[tabIndex], type === 'Ask' ? 'rmSell' : 'rmBuy', item.price, item.numberOfShares)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </TableCell>
              <TableCell align="right">{item.price}</TableCell>
              <TableCell align="right">{item.numberOfShares}</TableCell>
              <TableCell>
                <Typography
                  variant="body2"
                  sx={{
                    color: id === item.entityId ? 'primary.main' : 'text.primary',
                    fontSize: '0.85rem',
                  }}
                >
                  {item.entityId}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default OrderTable;
