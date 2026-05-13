// src/contexts/CheckoutContext.jsx
// Provee openCheckout() a cualquier componente dentro de la app autenticada.
import { createContext, useContext, useState } from 'react';
import CheckoutModal from '../components/CheckoutModal.jsx';

const CheckoutContext = createContext(null);

export function CheckoutProvider({ children }) {
  const [open, setOpen]           = useState(false);
  const [defaultPlan, setDefault] = useState('annual');

  const openCheckout = (plan = 'annual') => {
    setDefault(plan);
    setOpen(true);
  };

  return (
    <CheckoutContext.Provider value={{ openCheckout }}>
      {children}
      <CheckoutModal open={open} onClose={() => setOpen(false)} defaultPlan={defaultPlan} />
    </CheckoutContext.Provider>
  );
}

export const useCheckout = () => useContext(CheckoutContext);
