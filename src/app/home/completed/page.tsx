"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Title, Stack, Card, Text, Button, Loader, Group } from '@mantine/core';

interface ResumeSummary {
  _id: string;
  name: string;
}

export default function CompletedResumesPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCompleted() {
      try {
        const res = await fetch('http://localhost:5000/resume/resumes?status=complete');
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const data = await res.json();
        setResumes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    fetchCompleted();
  }, []);

  if (loading) return <Container><Loader /></Container>;
  if (error) return <Container><Text c="red">Error: {error}</Text></Container>;

  return (
    <Container size="lg" py="md">
      <Title order={2} mb="md">Completed Resumes</Title>
      <Stack>
        {resumes.map((r) => (
          <Card key={r._id} shadow="sm" withBorder>
            <Group>
              <Text>{r.name}</Text>
              <Button variant="light" onClick={() => router.push(`/resume/${r._id}`)}>
                View
              </Button>
            </Group>
          </Card>
        ))}
        {resumes.length === 0 && <Text>No completed resumes found.</Text>}
      </Stack>
    </Container>
  );
}
