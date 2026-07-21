"use client";
import { createContext, useContext } from "react";

const NonceContext = createContext("");

export function NonceProvider({ value, children }) {
  return (
    <NonceContext.Provider value={value}>{children}</NonceContext.Provider>
  );
}

export function useNonce() {
  return useContext(NonceContext);
}
