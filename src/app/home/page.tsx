"use client";

import { useAuth } from "@/context/authContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {Container, Grid, SimpleGrid, Skeleton, Card, Image, Text, Button, Group, Badge,} from "@mantine/core";
import { notifications } from "@mantine/notifications";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/"); // Redirect to landing page if not authenticated
    }
  }, [user, loading, router]);

  if (loading) {
    return <p>Loading...</p>; // Show a loading state while checking auth
  }

  return (
    <Container size="lg" my="md">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {/* Upload File */}
        <Card shadow="sm" padding="lg" radius="md" withBorder onClick={() => router.push('/home/resume_builder')} style={{cursor:"pointer", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between"}}>
          <Card.Section component="span">
            <Image
              src="/upload.png"
              height={160}
              alt="Upload Data"
            />
          </Card.Section>

          <Group justify="space-between" mt="md" mb="xs">
            <Text fw={500}>Start New</Text>
            <Text size="sm">Upload a file or paste text to begin a resume</Text>
            {/* Input Text for description*/}
          </Group>
        </Card>

        <Grid gutter="md">
          <Grid.Col>
            {/* Continue Editing */}
            <Card shadow="sm" padding="lg" radius="md" withBorder onClick={() => router.push("/home/drafts")} style={{cursor:"pointer", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between"}}>
              <Card.Section>
                <Image
                  src="/continue_editing.png"
                  height={160}
                  alt="Continue Editing"
                />
              </Card.Section>

              <Group justify="space-between" mt="md" mb="xs">
                <Text fw={500}>Continue</Text>
                <Text size="sm">Pick up your last draft</Text>
                {/* Input Text for description*/}
              </Group>
            </Card>
          </Grid.Col>

          <Grid.Col span={6}>
            {/* Completed Resumes */}
            <Card shadow="sm" padding="lg" radius="md" withBorder onClick={() => router.push("/home/completed_resumes")} style={{cursor:"pointer", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between"}}>
              <Card.Section>
                <Image
                  src="completed_cv.jpg"
                  height={160}
                  alt="Completed Resumes"
                />
              </Card.Section>

              <Group justify="space-between" mt="md" mb="xs">
                <Text fw={500}>My Resumes</Text>
                <Text size="sm">View and manage all your saved CVs</Text>
                {/* Input Text for description*/}
              </Group>
            </Card>
          </Grid.Col>

          <Grid.Col span={6}>
            {/* About Us */}
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{cursor:"pointer", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between"}}>
              <Card.Section>
                <Image
                  src="about_us.png"
                  height={160}
                  alt="About Us"
                />
              </Card.Section>

              <Group justify="space-between" mt="md" mb="xs">
                <Text fw={500}>About Us</Text>
                <Text size="sm">Meet the team</Text>
                {/* Input Text for description*/}
              </Group>
            </Card>
          </Grid.Col>
        </Grid>
      </SimpleGrid>
    </Container>
  );
}
