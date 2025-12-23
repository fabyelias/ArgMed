import React, { createContext, useState, useContext } from 'react';

const ConsultationContext = createContext();

export const useConsultation = () => useContext(ConsultationContext);

export const ConsultationProvider = ({ children }) => {
  const [consultation, setConsultation] = useState(null);

  return (
    <ConsultationContext.Provider value={{ consultation, setConsultation }}>
      {children}
    </ConsultationContext.Provider>
  );
};