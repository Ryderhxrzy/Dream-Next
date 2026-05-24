import React, { createContext, useContext, ReactNode } from 'react';

export interface NavigationContextType {
  openPurchaseOrder: (checkoutId: string, status?: string) => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    console.warn('[NavigationContext] useNavigation called outside NavigationProvider');
    return {
      openPurchaseOrder: () => console.warn('[NavigationContext] openPurchaseOrder called outside provider'),
    };
  }
  return context;
};

export const NavigationProvider = ({ children, value }: { children: ReactNode; value: NavigationContextType }) => {
  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};
