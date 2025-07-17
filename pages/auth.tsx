import React, { useState } from 'react';
import { Container, Center, Box, Text } from '@mantine/core';
import { LoginForm } from '../components/Auth/LoginForm';
import { RegisterForm } from '../components/Auth/RegisterForm';
import { useAuth } from '../components/Auth/AuthContext';
import { useRouter } from 'next/router';
import { AnimatedLogo } from '@/components/AnimatedLogo/AnimatedLogo';
export default function AuthPage() {
  const [showLogin, setShowLogin] = useState(true);
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push('/'); // Redirect to home page or dashboard
    return null;
  }

  const handleLoginSuccess = () => {
    router.push('/'); // Redirect to home page after successful login
  };

  const handleRegisterSuccess = () => {
    setShowLogin(true); // Show login form after successful registration
  };

  return (
    <Container size={600} my={20}>
      <Box ta="center" mb="xl">
        <AnimatedLogo />
        <Text size="lg" c="white" mt="md">
          智能学习，轻松掌握
        </Text>
      </Box>
      <Center>
        {showLogin ? (
          <LoginForm
            onRegisterClick={() => setShowLogin(false)}
            onLoginSuccess={handleLoginSuccess}
          />
        ) : (
          <RegisterForm
            onLoginClick={() => setShowLogin(true)}
            onRegisterSuccess={handleRegisterSuccess}
          />
        )}
      </Center>
    </Container>
  );
}
