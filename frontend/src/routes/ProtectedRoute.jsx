import React from 'react';

const ProtectedRoute = ({ children }) => {
  // Since login is disabled, we always render the children.
  // The loading state is kept for potential async init, but we simply show children when ready.
  return <>{children}</>;
};

export default ProtectedRoute;
