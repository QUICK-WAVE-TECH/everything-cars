import { useQuery } from "@tanstack/react-query";

const API_BASE = "https://countriesnow.space/api/v0.1/countries";

type StatesResponse = {
  error: boolean;
  data: { states: { name: string }[] };
};

type CitiesResponse = {
  error: boolean;
  data: string[];
};

export function useStates(country: string) {
  return useQuery({
    queryKey: ["geo-states", country],
    queryFn: async (): Promise<string[]> => {
      if (!country) return [];
      const res = await fetch(`${API_BASE}/states`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country }),
      });
      if (!res.ok) throw new Error("Failed to fetch states");
      const data: StatesResponse = await res.json();
      if (data.error) throw new Error("API error");
      return data.data.states.map((s) => s.name).sort();
    },
    enabled: !!country,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours — countries don't change often
    retry: 1,
  });
}

export function useCities(country: string, state: string) {
  return useQuery({
    queryKey: ["geo-cities", country, state],
    queryFn: async (): Promise<string[]> => {
      if (!country || !state) return [];
      const res = await fetch(`${API_BASE}/state/cities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, state }),
      });
      if (!res.ok) throw new Error("Failed to fetch cities");
      const data: CitiesResponse = await res.json();
      if (data.error) throw new Error("API error");
      return (data.data ?? []).sort();
    },
    enabled: !!country && !!state,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
