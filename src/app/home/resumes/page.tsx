// pages/home/resumes/index.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listCachedResumes } from "@/lib/resumeCache";
import { Container, SimpleGrid, Card, Title, Text, Button, Group } from "@mantine/core";

interface Resume {
  id: string;
  name: string;
  timestamp: number;
}

export default function MyResumesPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);

  useEffect(() => {
    setResumes(listCachedResumes());
  }, []);

  return (
    <Container my="md">
      <Title order={2} mb="lg">My Resumes</Title>
      <SimpleGrid cols={2} spacing="md">
        {resumes.map((r) => (
          <Card key={r.id} shadow="sm" withBorder>
            <Group mb="xs">
              <Text>{r.name}</Text>
              <Text size="xs">{new Date(r.timestamp).toLocaleDateString()}</Text>
            </Group>
            <Button
              fullWidth
              onClick={() => router.push(`/home/resume_editor/${r.id}`)}
            >
              Open
            </Button>
          </Card>
        ))}
        {resumes.length === 0 && <Text>No saved resumes yet.</Text>}
      </SimpleGrid>
    </Container>
  );
}
