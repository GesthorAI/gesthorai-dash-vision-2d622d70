import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SearchOptionsState {
  niches: string[];
  cities: string[];
  addNiche: (niche: string) => void;
  addCity: (city: string) => void;
  removeNiche: (niche: string) => void;
  removeCity: (city: string) => void;
}

// Default options
const defaultNiches = [
  "Restaurantes", "Lojas de Roupas", "Salões de Beleza", "Academias", 
  "Clínicas Médicas", "Escritórios de Advocacia", "Imobiliárias",
  "Pet Shops", "Farmácias", "Oficinas Mecânicas", "Escolas Particulares",
  "Corretoras de Seguros", "Agências de Viagem", "Consultórios Odontológicos"
];

const defaultCities = [
  "Rio de Janeiro", "São Paulo", "Belo Horizonte", "Salvador", 
  "Brasília", "Fortaleza", "Recife", "Porto Alegre", "Curitiba",
  "Manaus", "Belém", "Goiânia", "Guarulhos", "Campinas", "São Luís", 
  "Maceió", "Natal"
];

export const useSearchOptions = create<SearchOptionsState>()(
  persist(
    (set, get) => ({
      niches: [...defaultNiches],
      cities: [...defaultCities],
      
      addNiche: (niche: string) => {
        const trimmedNiche = niche.trim();
        if (!trimmedNiche) return;
        
        set(state => {
          if (!state.niches.includes(trimmedNiche)) {
            return { ...state, niches: [...state.niches, trimmedNiche] };
          }
          return state;
        });
      },
      
      addCity: (city: string) => {
        const trimmedCity = city.trim();
        if (!trimmedCity) return;
        
        set(state => {
          if (!state.cities.includes(trimmedCity)) {
            return { ...state, cities: [...state.cities, trimmedCity] };
          }
          return state;
        });
      },
      
      removeNiche: (niche: string) => {
        set(state => ({
          ...state,
          niches: state.niches.filter(n => n !== niche)
        }));
      },
      
      removeCity: (city: string) => {
        set(state => ({
          ...state,
          cities: state.cities.filter(c => c !== city)
        }));
      },
    }),
    {
      name: 'search-options-storage',
    }
  )
);