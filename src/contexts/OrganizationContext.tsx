import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useOrganizations } from '@/hooks/useOrganizations';

interface OrganizationContextType {
  currentOrganizationId: string | null;
  setCurrentOrganizationId: (id: string | null) => void;
  organizations: any[];
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganizationContext = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganizationContext must be used within OrganizationProvider');
  }
  return context;
};

interface OrganizationProviderProps {
  children: ReactNode;
}

export const OrganizationProvider = ({ children }: OrganizationProviderProps) => {
  const [currentOrganizationId, setCurrentOrganizationId] = useState<string | null>(() => {
    return localStorage.getItem('currentOrganizationId');
  });
  
  const { data: organizations = [], isLoading } = useOrganizations();

  // Auto-selecionar primeira organização se não há uma selecionada
  useEffect(() => {
    if (!currentOrganizationId && organizations.length > 0) {
      const firstOrgId = organizations[0].id;
      setCurrentOrganizationId(firstOrgId);
      localStorage.setItem('currentOrganizationId', firstOrgId);
    }
  }, [currentOrganizationId, organizations]);

  // Salvar no localStorage quando mudar
  useEffect(() => {
    if (currentOrganizationId) {
      localStorage.setItem('currentOrganizationId', currentOrganizationId);
    } else {
      localStorage.removeItem('currentOrganizationId');
    }
  }, [currentOrganizationId]);

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganizationId,
        setCurrentOrganizationId,
        organizations,
        isLoading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};