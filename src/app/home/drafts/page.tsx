"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Title,
  Stack,
  Card,
  Text,
  Button,
  Group,
  Loader,
  Tooltip,
  Modal,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { getAuth } from "firebase/auth"; 

interface ResumeSummary {
  _id: string;
  name: string;
}

export default function DraftsPage() {
  const router = useRouter();

  const [drafts, setDrafts] = useState<ResumeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─────────────────────────────
  //  Delete-modal state
  // ─────────────────────────────
  const [toDelete, setToDelete] = useState<ResumeSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Add helper function
  const getAuthHeaders = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    const idToken = await user.getIdToken();
    return { Authorization: `Bearer ${idToken}` };
  };

  // ─────────────────────────────
  //  Load drafts on mount
  // ─────────────────────────────
  useEffect(() => {
    async function fetchDrafts() {
      try {
        const authHeaders = await getAuthHeaders(); // Add this
        
        const response = await fetch("http://localhost:5000/resume/resumes?status=incomplete", {
          headers: authHeaders, // Add this
        });
        
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        const data = await response.json();
        setDrafts(data);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }
    
    fetchDrafts();
  }, []);

  // ─────────────────────────────
  //  Handlers
  // ─────────────────────────────
  const handleEdit = (id: string) => {
    router.push(`/home/resume_editor/${id}`);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const authHeaders = await getAuthHeaders(); // Ensure user is authenticated

      const res = await fetch(`http://localhost:5000/resume/${toDelete._id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      setDrafts((prev) => prev.filter((d) => d._id !== toDelete._id));
      setToDelete(null);
    } 
    catch (err) {
      notifications.show({
        title: "Delete failed",
        message: String(err),
        color: "red",
      });
    } 
    finally {
      setDeleting(false);
    }
  };

  // ─────────────────────────────
  //  UI
  // ─────────────────────────────
  if (loading) return <Container><Loader /></Container>;
  if (error)   return <Container><Text c="red">{error}</Text></Container>;

  return (
    <Container size="lg" py="md">
      <Title order={2} mb="md">
        My Drafts
      </Title>

      <Stack>
        {drafts.length ? (
          drafts.map((d) => (
            <Card key={d._id} withBorder shadow="sm" p="lg">
              <Group justify="space-between">
                <Text fw={500}>{d.name || "(untitled draft)"}</Text>

                <Group>
                  <Tooltip label="Open editor">
                    <Button
                      variant="light"
                      color="yellow"
                      onClick={() => handleEdit(d._id)}
                    >
                      Edit
                    </Button>
                  </Tooltip>

                  <Tooltip label="Remove draft">
                    <Button
                      variant="light"
                      color="red"
                      onClick={() => setToDelete(d)}
                    >
                      Remove
                    </Button>
                  </Tooltip>
                </Group>
              </Group>
            </Card>
          ))
        ) : (
          <Text>No drafts found.</Text>
        )}
      </Stack>

      {/* Delete-confirmation modal */}
      <Modal
        opened={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Delete draft?"
        centered
      >
        <Text mb="md">
          Are you sure you want to delete “{toDelete?.name}”? This action
          cannot be undone.
        </Text>
        <Group>
          <Button variant="default" onClick={() => setToDelete(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button color="red" onClick={confirmDelete} loading={deleting}>
            Confirm Delete
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
