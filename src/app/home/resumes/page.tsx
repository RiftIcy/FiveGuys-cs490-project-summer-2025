// pages/home/resumes/index.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listCachedResumes, removeFromCache  } from "@/lib/resumeCache";
import { Container, SimpleGrid, Card, Title, Text, Button, Group, ActionIcon, Modal, Stack } from "@mantine/core";
import { IconTrash, IconTrashOff } from "@tabler/icons-react";

interface Resume {
  id: string;
  name: string;
  timestamp: number;
}

export default function MyResumesPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOpened, setConfirmOpened] = useState(false);

  // load cache
  useEffect(() => {
    setResumes(listCachedResumes());
  }, []);

  // Opens the confirm delete button
  const openConfirm = (id: string) => {
    setDeletingId(id);
    setConfirmOpened(true);
  };

  // Confirms the deletion
  const confirmDelete = () => {
    if (deletingId) {
      removeFromCache(deletingId);
      setResumes(listCachedResumes());
    }
    setConfirmOpened(false);
    setDeletingId(null);
  };

return (
    <Container my="md">
      <Title order={2} mb="lg">
        My Resumes
      </Title>

      <SimpleGrid cols={2} spacing="md">
        {resumes.length === 0 && (
          <Card shadow="sm" withBorder>
            <Text>No saved resumes yet.</Text>
          </Card>
        )}

        {resumes.map((r) => (
          <Card key={r.id} shadow="sm" withBorder>
            <Group mb="xs">
              <Stack>
                <Text>{r.name}</Text>
                <Text size="xs">
                  {new Date(r.timestamp).toLocaleDateString()}
                </Text>
              </Stack>

              <ActionIcon
                color="red"
                variant="light"
                onClick={() => openConfirm(r.id)}
                title="Delete resume"
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Group>

            <Button
              fullWidth
              onClick={() => router.push(`/home/resume_editor/${r.id}`)}
            >
              Open
            </Button>
          </Card>
        ))}
      </SimpleGrid>

      <Modal
        opened={confirmOpened}
        onClose={() => setConfirmOpened(false)}
        title="Delete resume?"
        centered
      >
        <Text>
          Are you sure you want to permanently delete this resume from your
          cache? This action cannot be undone.
        </Text>
        <Group mt="md">
          <Button variant="default" onClick={() => setConfirmOpened(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={confirmDelete}>
            <IconTrashOff style={{ marginRight: 4 }} />
            Delete
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
