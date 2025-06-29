"use client";

import { useAuth } from "@/context/authContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoginForm } from "@/components/forms/loginForm";
import { RegistrationForm } from "@/components/forms/registrationForm";
import { ResetPasswordForm } from "@/components/forms/resetPasswordForm";
import Image from "next/image";
import { Container, Paper, Title, Text, Group, Stack, Center, Divider, Anchor, Box, Overlay, Button } from "@mantine/core";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<"hero" | "login" | "register" | "resetPassword">("hero"); // Added hero state
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push("/home"); // Redirect to home page if authenticated
    }
  }, [user, loading, router]);

  if (loading) {
    return <p>Loading...</p>; // Show a loading state while checking auth
  }

  return (
    <div 
      style={{
        backgroundImage: 'url(/LandingPage1.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh',
        position: 'relative'
      }}
    >
      <Overlay opacity={0.7} color="#000" zIndex={1} />
      <Container 
        size="md" 
        h="100vh" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          position: 'relative',
          zIndex: 2
        }}
      >
        {/* Hero Section */}
        {!showForm ? (
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Image src="/logoonly.png" alt="Resume Fox Logo" width={160} height={160} style={{ display: 'block', margin: '0 auto 0.25rem auto' }} />
            <Title order={1} style={{ fontSize: '5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'white' }}>
              Resume Fox
            </Title>
            <Title order={2} size="1.8rem" c="white" mb="sm">
              Create Professional Resumes in Minutes
            </Title>
            <Text size="xl" c="rgba(255, 255, 255, 0.9)" mb="xl" maw={600} mx="auto">
              Build, customize, and download your perfect resume with our AI-powered platform. 
              Stand out from the competition with professionally designed templates.
            </Text>
            <Group justify="center" gap="md">
              <Button 
                size="lg" 
                radius="md"
                onClick={() => {
                  setShowForm(true);
                  setView("login");
                }}
                style={{
                  background: '#3782FF',
                  color: 'white',
                  padding: '12px 32px',
                  fontSize: '16px',
                  border: 'none'
                }}
              >
                Get Started
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                radius="md"
                onClick={() => {
                  setShowForm(true);
                  setView("register");
                }}
                style={{
                  borderColor: 'white',
                  color: 'white',
                  padding: '12px 32px',
                  fontSize: '16px'
                }}
              >
                Sign Up Free
              </Button>
            </Group>
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <Group justify="center" mb="sm">
              <Image src="/logoonly.png" alt="Resume Fox Logo" width={40} height={40}/>
              <Title order={1} size="2rem" fw={700} c="white">Resume Fox</Title>
            </Group>
            <Button 
              variant="subtle" 
              size="sm"
              onClick={() => setShowForm(false)}
              style={{ color: 'rgba(255, 255, 255, 0.8)' }}
            >
              ← Back to Home
            </Button>
          </div>
        )}

        {/* Form Section */}
        {showForm && (
          <Paper shadow="lg" p="xl" radius="md" withBorder style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', maxWidth: '400px', margin: '0 auto', width: '100%' }}>
            <Stack gap="md">
              {view === "login" && (
                <>
                  {/* Form Label */}
                  <Title order={2} size="1.5rem">Sign in</Title>

                  {/* Helper Text */}
                  <Text size="sm" c="dimmed">
                    New to this app?{" "}
                    <Anchor component="button" onClick={() => setView("register")}>
                      Sign up for an account
                    </Anchor>
                  </Text>

                  {/* Login Form */}
                  <LoginForm
                    onLogin={() => router.push("/home")}
                    onForgotPassword={() => setView("resetPassword")} // Switch to reset password view
                  />
                </>
              )}

              {view === "register" && (
                <>
                  {/* Form Label */}
                  <Title order={2} size="1.5rem">Sign up</Title>

                  {/* Helper Text */}
                  <Text size="sm" c="dimmed">
                    Already have an account?{" "}
                    <Anchor component="button" onClick={() => setView("login")}>
                      Sign in
                    </Anchor>
                  </Text>

                  {/* Registration Form */}
                  <RegistrationForm onRegister={() => setView("login")} />
                </>
              )}

              {view === "resetPassword" && (
                <>
                  {/* Form Label */}
                  <Title order={2} size="1.5rem">Reset your password</Title>

                  {/* Reset Password Form */}
                  <ResetPasswordForm
                    onSuccess={() => setView("login")}
                    buttonText="Send reset link"
                  />

                  {/* Helper Text */}
                  <Text size="sm" c="dimmed" mt="md">
                    Remembered?{" "}
                    <Anchor component="button" onClick={() => setView("login")}>
                      Go back to sign in
                    </Anchor>
                  </Text>
                </>
              )}
            </Stack>
          </Paper>
        )}
      </Container>
    </div>
  );
}