import React from 'react';
import { Navigate } from 'react-router-dom';

function SignUp() {
  return <Navigate to="/auth/sign-in" replace />;
}

export default SignUp;
