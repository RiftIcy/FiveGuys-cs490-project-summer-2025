"use client";

import { useAuth } from "@/context/authContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {Container, Grid, SimpleGrid, Skeleton, Card, Image, Text, Button, Group, Badge,} from "@mantine/core";

const PRIMARY_COL_HEIGHT = "80vh";

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
    <Container size="xl" my="md">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Card shadow="sm" padding="lg" radius="md" withBorder onClick={() => router.push('/home/resume_builder')} style={{cursor:"pointer", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between"}}>
          <Card.Section component="span">
            <Image
              src="https://tse1.mm.bing.net/th?id=OIP.tYoZDaFuXWkTOUzy5sxUWAHaHa&w=474&h=474&c=7" // Find image for Resume Builder
              height={160}
              alt="Resume_Png"
            />
          </Card.Section>

          <Group justify="space-between" mt="md" mb="xs">
            <Text fw={500}>Upload Data</Text>{"Filler Text"}
            {/* Input Text for description*/}
          </Group>
        </Card>

        <Grid gutter="md">
          <Grid.Col>
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{cursor:"pointer", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between"}}>
              <Card.Section component="a" href="https://mantine.dev/">
                <Image
                  src="https://img.freepik.com/premium-vector/resume-concept-man-makes-resume-vector-illustration-flat_186332-1030.jpg?w=996" // Find image for Resume Builder
                  height={160}
                  alt="Norway"
                />
              </Card.Section>

              <Group justify="space-between" mt="md" mb="xs">
                <Text fw={500}>Continue Editing</Text>{" "}
                {/* Input Text for description*/}
              </Group>
            </Card>
          </Grid.Col>

          <Grid.Col span={6}>
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{cursor:"pointer", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between"}}>
              <Card.Section component="a" href="https://mantine.dev/">
                <Image
                  src="https://static.vecteezy.com/system/resources/thumbnails/021/453/345/original/4k-stand-out-resume-or-cv-animation-young-smart-businessman-holding-his-resume-or-cv-printed-paper-present-his-working-profile-for-hiring-free-video.jpg" // Find image for Resume Builder
                  height={160}
                  alt="Norway"
                />
              </Card.Section>

              <Group justify="space-between" mt="md" mb="xs">
                <Text fw={500}>View Completed Resumes</Text>{" "}
                {/* Input Text for description*/}
              </Group>
            </Card>
          </Grid.Col>

          <Grid.Col span={6}>
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{cursor:"pointer", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between"}}>
              <Card.Section component="a" href="https://mantine.dev/">
                <Image
                  src="https://tse4.mm.bing.net/th?id=OIP.HO5958-f9zHlPvSSI5uDcAHaHa&w=474&h=474&c=7" // Find image for Resume Builder
                  height={160}
                  alt="Norway"
                />
              </Card.Section>

              <Group justify="space-between" mt="md" mb="xs">
                <Text fw={500}>About Us</Text>{" "}
                {/* Input Text for description*/}
              </Group>
            </Card>
          </Grid.Col>
        </Grid>
      </SimpleGrid>
    </Container>
  );
}
