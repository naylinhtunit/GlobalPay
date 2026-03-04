"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Country = "Japan" | "Myanmar";
export type Currency = "JPY" | "MMK";

interface CountryContextType {
  country: Country;
  currency: Currency;
  setCountry: (country: Country) => void;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

export function CountryProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountryState] = useState<Country>("Japan");
  const [currency, setCurrency] = useState<Currency>("JPY");

  const setCountry = (newCountry: Country) => {
    setCountryState(newCountry);
    setCurrency(newCountry === "Japan" ? "JPY" : "MMK");
    if (typeof window !== "undefined") {
      localStorage.setItem("globalpay_country", newCountry);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("globalpay_country") as Country;
    if (saved && (saved === "Japan" || saved === "Myanmar")) {
      setCountry(saved);
    }
  }, []);

  return (
    <CountryContext.Provider value={{ country, currency, setCountry }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const context = useContext(CountryContext);
  if (!context) throw new Error("useCountry must be used within a CountryProvider");
  return context;
}
