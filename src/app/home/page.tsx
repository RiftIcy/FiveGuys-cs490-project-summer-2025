"use client";

import { useAuth } from "@/context/authContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {Container, Grid, SimpleGrid, Skeleton, Card, Image, Text, Button, Group, Badge,} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { listCachedResumes } from "@/lib/resumeCache";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [lastId, setLastId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/"); // Redirect to landing page if not authenticated
    }
  }, [user, loading, router]);

  useEffect(() => {
    const cached = listCachedResumes();
    if (cached.length > 0) {
      setLastId(cached[0].id);
    }
  }, []);

  if (loading) {
    return <p>Loading...</p>; // Show a loading state while checking auth
  }

  return (
    <Container size="xl" my="md">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {/* Upload File */}
        <Card shadow="sm" padding="lg" radius="md" withBorder onClick={() => router.push('/home/resume_builder')} style={{cursor:"pointer", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between"}}>
          <Card.Section component="span">
            <Image
              src="https://tse1.mm.bing.net/th?id=OIP.tYoZDaFuXWkTOUzy5sxUWAHaHa&w=474&h=474&c=7" // Find image for Resume Builder
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
            <Card shadow="sm" padding="lg" radius="md" withBorder onClick={() => lastId ? router.push(`/home/resume_editor/${lastId}`) : notifications.show({ title: "No recent resume", message: "You haven't uploaded any resumes yet.", color: "gray",})} style={{cursor:"pointer", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between"}}>
              <Card.Section>
                <Image
                  src="https://img.freepik.com/premium-vector/resume-concept-man-makes-resume-vector-illustration-flat_186332-1030.jpg?w=996" // Find image for Resume Builder
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
            <Card shadow="sm" padding="lg" radius="md" withBorder onClick={() => router.push("/home/resumes")} style={{cursor:"pointer", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between"}}>
              <Card.Section>
                <Image
                  src="https://static.vecteezy.com/system/resources/thumbnails/021/453/345/original/4k-stand-out-resume-or-cv-animation-young-smart-businessman-holding-his-resume-or-cv-printed-paper-present-his-working-profile-for-hiring-free-video.jpg" // Find image for Resume Builder
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
                  src="https://tse4.mm.bing.net/th?id=OIP.HO5958-f9zHlPvSSI5uDcAHaHa&w=474&h=474&c=7" // Find image for Resume Builder
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
