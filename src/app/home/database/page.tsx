"use client";

import React, { useEffect, useState } from "react";
import {
  Container,
  Loader,
  Text,
  Table,
  ScrollArea,
  Group,
  Button,
  Stack,
  Collapse,
  Modal,
  Tooltip,
  Checkbox,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
interface UploadItem {
  id: string;
  displayName: string;
  snippet?: string | null;
  hasText: boolean;
  uploadedAt: string;
}

export default function ResumeDatabasePage() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // NEW: selection + naming
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [resumeName, setResumeName] = useState("");

  const router = useRouter();

  // ────────────────────────────────────────────────────────────
  // Fetch uploads
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
      const fetchUploads = async () => {
        try {
          const auth = getAuth();
          const user = auth.currentUser;
          if (!user) throw new Error("User not authenticated");
          const idToken = await user.getIdToken();

          const res = await fetch("http://localhost:5000/uploads", {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          });
          if (!res.ok) throw new Error(res.statusText);
          const raw = await res.json();
          setUploads(
            raw.map((d: any) => ({
              id: d.id,
              displayName: d.filename || d.snippet || "(untitled)",
              snippet: d.snippet,
              hasText: Boolean(d.hasText),
              uploadedAt: d.uploadedAt,
            }))
          );
        } 
        catch (err) {
          console.error("Failed to load uploads:", err);
        } 
        finally {
          setLoading(false);
        }
      };
      fetchUploads();
    }, []);

  // ────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────
  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      copy.has(id) ? copy.delete(id) : copy.add(id);
      return copy;
    });
  };

  const handleDelete = async (id: string) => {
    const notifId = "delete-upload";
    setIsDeleting(true);
    notifications.show({
      id: notifId,
      loading: true,
      title: "Deleting entry…",
      message: "Please wait…",
      autoClose: false,
      withCloseButton: false,
    });

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      const idToken = await user.getIdToken();

      const res = await fetch(`http://localhost:5000/uploads/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (!res.ok) throw new Error(await res.text());

      setUploads((prev) => prev.filter((u) => u.id !== id));
      setSelectedIds((prev) => {
        const copy = new Set(prev);
        copy.delete(id);
        return copy;
      });
      if (expandedId === id) setExpandedId(null);

      notifications.update({
        id: notifId,
        loading: false,
        title: "Deleted",
        message: "Entry removed.",
        color: "teal",
        autoClose: 2000,
      });
    } catch (err: any) {
      notifications.update({
        id: notifId,
        loading: false,
        title: "Failed",
        message: err.message || String(err),
        color: "red",
        autoClose: 3000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const continueDisabled = selectedIds.size === 0 || !resumeName.trim();

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Container size="sm" py="xl">
        <Loader />
      </Container>
    );
  }

  if (uploads.length === 0) {
    return (
      <Container size="sm" py="xl">
        <Text>No uploads found.</Text>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      {/* Delete confirmation */}
      <Modal
        opened={!!pendingDeleteId}
        onClose={() => setPendingDeleteId(null)}
        title="Confirm deletion"
        centered
      >
        <Text>Are you sure you want to delete this entry?</Text>
        <Group mt="md">
          <Button variant="default" onClick={() => setPendingDeleteId(null)}>
            Cancel
          </Button>
          <Button
            color="red"
            loading={isDeleting}
            onClick={async () => {
              if (!pendingDeleteId) return;
              await handleDelete(pendingDeleteId);
              setPendingDeleteId(null);
            }}
          >
            Delete
          </Button>
        </Group>
      </Modal>

      {/* Uploads table */}
      <ScrollArea>
        <Table verticalSpacing="sm" withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Select</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Uploaded</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {uploads.map((u) => {
              const isFile = !u.hasText;
              return (
                <React.Fragment key={u.id}>
                  <Table.Tr>
                    {/* Mantine checkbox */}
                    <Table.Td>
                      <Checkbox
                        aria-label={`Select ${u.displayName}`}
                        checked={selectedIds.has(u.id)}
                        onChange={() => toggleSelection(u.id)}
                      />
                    </Table.Td>

                    <Table.Td>{u.displayName}</Table.Td>
                    <Table.Td>
                      {new Date(u.uploadedAt).toLocaleString()}
                    </Table.Td>
                    <Table.Td>{isFile ? "Document" : "Text"}</Table.Td>
                    <Table.Td>
                      <Group>
                        {/* Expand / collapse */}
                        <Tooltip
                          label={
                            expandedId === u.id ? "Hide preview" : "Preview"
                          }
                        >
                          <Button
                            variant="light"
                            size="xs"
                            onClick={() => toggleExpand(u.id)}
                          >
                            {expandedId === u.id ? "Hide" : "Preview"}
                          </Button>
                        </Tooltip>

                        {/* Delete */}
                        <Tooltip label="Delete this entry">
                          <Button
                            variant="light"
                            color="red"
                            size="xs"
                            onClick={() => setPendingDeleteId(u.id)}
                          >
                            Delete
                          </Button>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>

                  {/* Collapsible preview */}
                  <Table.Tr>
                    <Table.Td colSpan={5} style={{ padding: 0, border: 0 }}>
                      <Collapse in={expandedId === u.id}>
                        <Stack px="md" py="sm">
                          {u.snippet ? (
                            <Text>{u.snippet}</Text>
                          ) : (
                            <Text c="dimmed">No preview available.</Text>
                          )}
                        </Stack>
                      </Collapse>
                    </Table.Td>
                  </Table.Tr>
                </React.Fragment>
              );
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      {/* Footer controls */}
      <Stack mt="md" maw={400} align="flex-start">
        <TextInput
          label="Resume Name"
          placeholder="e.g. Backend Engineer CV"
          value={resumeName}
          onChange={(e) => setResumeName(e.currentTarget.value)}
          withAsterisk
        />
        <Button
          disabled={continueDisabled}
          onClick={async () => {
            const body = {
              ids: [...selectedIds],
              name: resumeName.trim(),
            };

            const notifId = notifications.show({
              loading: true,
              title: "Generating resume…",
              message: "Running LLM parsing on selected uploads",
              autoClose: false,
              withCloseButton: false,
            });

            try {
              const auth = getAuth();
              const user = auth.currentUser;
              if (!user) throw new Error("User not authenticated");
              const idToken = await user.getIdToken();

              const res = await fetch("http://localhost:5000/generate_resume", {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${idToken}`,
                 },
                body: JSON.stringify(body),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Failed");

              notifications.update({
                id: notifId,
                loading: false,
                title: "Success",
                message: "Resume created!",
                color: "teal",
                autoClose: 1500,
              });
              router.push(`/home/resume_editor/${data.resume_id}`);
            } catch (err: any) {
              notifications.update({
                id: notifId,
                loading: false,
                title: "Error",
                message: err.message || "Something went wrong",
                color: "red",
                autoClose: 4000,
              });
            }
          }}
        >
          Continue
        </Button>
      </Stack>
    </Container>
  );
}
