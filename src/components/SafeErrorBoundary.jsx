import React from 'react';

// COMPLETELY DISABLED - PASS THROUGH ONLY
// This eliminates any potential interference from the Error Boundary itself
// while preserving the component so imports in other files don't break.
const SafeErrorBoundary = ({ children }) => {
  return <>{children}</>;
};

export default SafeErrorBoundary;