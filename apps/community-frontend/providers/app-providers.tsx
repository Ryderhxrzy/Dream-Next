"use client";

import { QueryClientProvider } from "@tanstack/react-query";    
import { useState, type ReactNode } from "react";
import { createQueryClient } from "../lib/query-client";        

const AppProviders = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export default AppProviders;