"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Title, Stack, Card, Text, Button, Group, Loader } from "@mantine/core";

interface ResumeSummary {
  _id: string;
  name: string;
}

export default function DraftsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<ResumeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://localhost:5000/resume/resumes?status=incomplete")
      .then((res) => {
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        return res.json();
      })
      .then(setDrafts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Container><Loader /></Container>;
  if (error)   return <Container><Text color="red">{error}</Text></Container>;

  return (
    <Container>
      <Title order={2} mb="md">My Drafts</Title>
      <Stack>
        {drafts.length > 0 ? drafts.map((d) => (
          <Card key={d._id} shadow="sm" padding="lg">
            <Group>
              <Text>{d.name}</Text>
              <Button onClick={() => router.push(`/home/resume_editor/${d._id}`)}>
                Continue Editing
              </Button>
            </Group>
          </Card>
        )) : (
          <Text>No drafts found.</Text>
        )}
      </Stack>
    </Container>
  );
}
