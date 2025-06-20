"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Title, Stack, Card, Text, Button, Loader, Group, Tooltip, Modal } from '@mantine/core';
import { notifications } from '@mantine/notifications';

interface ResumeSummary {
  _id: string;
  name: string;
}

export default function CompletedFormPage() {
  const router = useRouter();
  // Used to open the Delete popup
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track which resume is pending deletion
  const [toDelete, setToDelete] = useState<ResumeSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
 
  useEffect(() => {
    async function fetchCompleted() {
      try {
        const response = await fetch('http://localhost:5000/resume/resumes?status=complete');
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        const data = await response.json();
        setResumes(data);
      } 
      catch (error) {
        setError(error instanceof Error ? error.message : String(error));
      } 
      finally {
        setLoading(false);
      }
    }
    fetchCompleted();
  }, []);

  // Open the Delete Modal
  const openDeleteModal = (resume: ResumeSummary) => {
    setToDelete(resume);
  };

  // Close the Delete Modal
  const closeDeleteModal = () => {
    setToDelete(null);
  };

  const confirmDelete = async () => {
    if(!toDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`http://localhost:5000/resume/${toDelete._id}`, {
        method: 'DELETE',
      });

      if(!response.ok) throw new Error(`Delete Failed: ${response.status}`);
      // Remove local list
      setResumes((prev) => prev.filter((r) => r._id !== toDelete._id));
      closeDeleteModal();
    }
    catch(error) {
      notifications.show({title: "Delete Failed", message: String(error), color: 'red '});
    }
    finally {
      setDeleting(false);
    }
  };

  // When the user presses edit make the from incomplete again
  const handleEdit = async (res: ResumeSummary) => {
    try {
      const response = await fetch(
        `http://localhost:5000/resume/${res._id}/set_complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isComplete: false }),
        }
      );
      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || response.statusText);
      }
      router.push(`/home/resume_editor/${res._id}`);
    } catch (err) {
      notifications.show({
        title: 'Unable to Edit',
        message: String(err),
        color: 'red',
      });
    }
  };

  if (loading) return <Container><Loader /></Container>;
  if (error) return <Container><Text c="red">Error: {error}</Text></Container>;

  return (
    <Container size="lg" py="md">
      <Title order={2} mb="md">Completed Forms</Title>
      <Stack>
        {resumes.map((r) => (
          <Card key={r._id} shadow="sm" withBorder>
            <Group>
              <Text>{r.name}</Text>
              <Tooltip label="View your submitted form">
                <Button variant="light" onClick={() => router.push(`/resume/${r._id}`)}>
                  View
                </Button>
              </Tooltip>
              <Tooltip label="Edit Changes">
                <Button variant='light' color='yellow' onClick={() => handleEdit(r)}>
                  Edit
                </Button>
              </Tooltip>
              <Tooltip label="Delete form">
                <Button variant='light' color='red' onClick={() => openDeleteModal(r)}>
                  Remove
                </Button>
              </Tooltip>
              <Tooltip label="Continue to the Resume Creation">
                <Button variant='white' color='gray'>
                  Select
                </Button>
              </Tooltip>
            </Group>
          </Card>
        ))}
        {resumes.length === 0 && <Text>No completed resumes found.</Text>}
      </Stack>

      {/* Delete Confirmation Modal */}
      <Modal opened={toDelete !== null} onClose={closeDeleteModal} title="Delete Resume?" centered>
        <Text mb="md">
          {`Are you sure you want to delete “${toDelete?.name}”? This action is permanent and cannot be undone.`}
        </Text>
        <Group>
          <Button variant='default' onClick={closeDeleteModal} disabled={deleting}>
            Cancel
          </Button>
          <Button color='red' onClick={confirmDelete} loading={deleting}>
            Confirm Delete
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
