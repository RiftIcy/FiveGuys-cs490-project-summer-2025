"use client";

import React, { useEffect, useState } from "react";
import { Container, Loader, Text, Table, ScrollArea, Group, Button, Stack, Collapse, Modal, Tooltip, Checkbox, TextInput, Paper} from "@mantine/core";
import { IconFileText, IconFile, IconCheck, IconLock, IconDatabase } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import mammoth from "mammoth";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
interface UploadItem {
  id: string;
  displayName: string;
  snippet?: string | null;
  hasText: boolean;
  uploadedAt: string;
  fileContent?: string; // Base64 encoded file content
  fileType?: string; // File extension
}

export default function ResumeDatabasePage() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // File Preview
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [fileData, setFileData] = useState<{[key: string]: { content: string; type: string; htmlContent?: string; isFormatted?: boolean; } }>({});


  // selection + naming
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [resumeName, setResumeName] = useState("");

  // Full-screen modal state
  const [fullScreenPreview, setFullScreenPreview] = useState<{ upload: UploadItem; file: { content: string; type: string; htmlContent?: string; isFormatted?: boolean; }; } | null>(null);

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
  // Fetch file content for preview
  // ────────────────────────────────────────────────────────────
  const fetchFileContent = async (id: string) => {
    if(fileData[id]) return;

    setPreviewLoading(id);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      const idToken = await user.getIdToken();

      const res = await fetch(`http://localhost:5000/uploads/${id}/content`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch file content");
      const data = await res.json();

      // Special handling for DOCX files
      if (data.file_type === 'docx' && data.file_content) {
        try {
          const arrayBuffer = Uint8Array.from(atob(data.file_content), c => c.charCodeAt(0)).buffer;

          const result = await mammoth.convertToHtml(
            { arrayBuffer },
            {
              styleMap: [
                "p[style-name='Heading 1'] => h1:fresh",
                "p[style-name='Heading 2'] => h2:fresh", 
                "p[style-name='Heading 3'] => h3:fresh",
                "p[style-name='Title'] => h1:fresh",
                "p[style-name='Subtitle'] => h2:fresh",
                "b => strong",
                "i => em",
              ],
              includeDefaultStyleMap: true,
              convertImage: mammoth.images.imgElement(function(image: any) {
                return image.read("base64").then(function(imageBuffer: string) {
                  return {
                    src: "data:" + image.contentType + ";base64," + imageBuffer
                  };
                });
              })
            }
          );

          setFileData(prev => ({
            ...prev,
            [id]: {
              content: data.file_content, // Keep original for fallback
              htmlContent: result.value,  // Formatted HTML
              type: data.file_type,
              isFormatted: true,
            }
          }));
        } 
        catch (error) {
          console.error("DOCX conversion failed:", error);
          // Fall back to regular handling
          setFileData(prev => ({
            ...prev,
            [id]: {
              content: data.file_content,
              type: data.file_type,
              isFormatted: false,
            }
          }));
        }
      } 
      else {
        // Regular handling for other file types
        setFileData(prev => ({
          ...prev,
          [id]: {
            content: data.file_content,
            type: data.file_type || (data.filename ? data.filename.split('.').pop()?.toLowerCase() : 'unknown'),
            isFormatted: false,
          }
        }));
      }
    } 
    catch (err) {
      console.error("Failed to fetch file content:", err);
      notifications.show({title: "Preview Error", message: "Failed to load file content", color: "red"});
    } 
    finally {
      setPreviewLoading(null);
    }
  };

  // ────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────
  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    else {
      setExpandedId(id);
      const upload = uploads.find((u) => u.id === id);
      if (upload && !upload.hasText) {
        // If it's a file, fetch its content
        await fetchFileContent(id);
      }
    }
  };

  // ────────────────────────────────────────────────────────────
  // Render File Preview Component
  // ────────────────────────────────────────────────────────────
  const renderFilePreview = (upload: UploadItem) => {
    if (upload.hasText) {
      // Text upload - show snippet
      return (
        <Paper p="md" withBorder>
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
            {upload.snippet || "No preview available."}
          </Text>
        </Paper>
      );
    }

    // File Upload - show file content
    if (previewLoading === upload.id) {
      return (
        <Paper p="md" withBorder>
          <Group>
            <Loader size="sm"/>
            <Text>Loading file preview...</Text>
          </Group>
        </Paper>
      );
    }

    const file = fileData[upload.id];
    if (!file) {
      return (
        <Paper p="md" withBorder>
          <Text c="dimmed">Click Preview to load file content</Text>
        </Paper>
      );
    }

    // Render based on file type and clickable to open in full screen

    // PDF files
    if (file.type === "pdf") {
      const pdfBlob = new Blob([
        Uint8Array.from(atob(file.content), c => c.charCodeAt(0))
      ], { type: "application/pdf" });
      const pdfUrl = URL.createObjectURL(pdfBlob);

      return (
        <Paper p="md" withBorder style={{ cursor: "pointer" }} onClick={() => setFullScreenPreview({ upload, file })}>
          <Stack>
            <Group justify="space-between">
              <Text fw={500}>PDF Preview</Text>
              <Text size="xs" c="dimmed">Click to view full screen</Text>
            </Group>
            <div style={{ position: "relative", height: "300px", overflow: "hidden"}}>
              <iframe src={pdfUrl} width="100%" height="100%" style={{ border: '1px solid #ccc', pointerEvents: 'none'}}/>
              
              {/* Overlay for full screen */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "transparent" }}/>
            </div>
          </Stack>
        </Paper>
      );
    }

    // Text files (txt, md)
    if (['txt', 'md'].includes(file.type)) {
      const textContent = atob(file.content);
      return (
        <Paper p="md" withBorder style={{ cursor: 'pointer' }} onClick={() => setFullScreenPreview({ upload, file })}>
          <Stack>
            <Group justify="space-between">
              <Text fw={500}>Text File Preview</Text>
              <Text size="xs" c="dimmed">Click to view full screen</Text>
            </Group>
            <Text size="sm" style={{ whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto', fontFamily: 'monospace'}}>
              {textContent.slice(0, 500)}{textContent.length > 500 ? '...' : ''}
            </Text>
          </Stack>
        </Paper>
      );
    }

    // DOCX
    if (file.type === 'docx') {
      // Show formatted HTML content if available
      if (file.isFormatted && file.htmlContent) {
        return (
          <Paper p="md" withBorder style={{ cursor: 'pointer' }} onClick={() => setFullScreenPreview({ upload, file })}>
            <Stack>
              <Group justify="space-between">
                <Text fw={500}>DOCX Document (Formatted Preview)</Text>
                <Text size="xs" c="dimmed">Click to view full screen</Text>
              </Group>
              <div 
                style={{ 
                  maxHeight: '300px', 
                  overflowY: 'auto',
                  border: '1px solid #dee2e6',
                  padding: '1rem',
                  background: 'white',
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'Times, "Times New Roman", serif',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: '#333',
                  maxWidth: '100%',
                  overflowWrap: 'break-word',
                  wordWrap: 'break-word',
                  tabSize: 4,
                }}
                dangerouslySetInnerHTML={{ 
                  __html: `<div style="white-space: pre-wrap; tab-size: 4;">${file.htmlContent.slice(0, 2000) + (file.htmlContent.length > 2000 ? '<p><em>... (click to view full document)</em></p>' : '')}</div>`
                }}
              />
            </Stack>
          </Paper>
        );
      }
      
      // Fall back to document icon if conversion failed
      return (
        <Paper p="md" withBorder style={{ cursor: 'pointer' }} onClick={() => setFullScreenPreview({ upload, file })}>
          <Stack>
            <Group justify="space-between">
              <Text fw={500}>DOCX Document</Text>
              <Text size="xs" c="dimmed">Click to view full screen</Text>
            </Group>
            <div style={{ 
              height: '200px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              background: '#f8f9fa', 
              border: '1px solid #dee2e6' 
            }}>
              <Stack align="center">
                <IconFileText size={48} color="#868e96"/>
                <Text size="sm" fw={500}>DOCX Document</Text>
                <Text size="xs" c="dimmed">Conversion failed - click to view status</Text>
              </Stack>
            </div>
          </Stack>
        </Paper>
      );
    }

    // ODT
    if (file.type === 'odt') {
      return (
        <Paper p="md" withBorder style={{ cursor: 'pointer' }} onClick={() => setFullScreenPreview({ upload, file })}>
          <Stack>
            <Group justify="space-between">
              <Text fw={500}>ODT Document</Text>
              <Text size="xs" c="dimmed">Click to view full screen</Text>
            </Group>
            <div style={{ 
              height: '200px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              background: '#f8f9fa', 
              border: '1px solid #dee2e6' 
            }}>
              <Stack align="center">
                <IconFileText size={48} color="#868e96"/>
                <Text size="sm" fw={500}>ODT Document</Text>
                <Text size="xs" c="dimmed">Click to view full screen</Text>
              </Stack>
            </div>
          </Stack>
        </Paper>
      );
    }

    return (
      <Paper p="md" withBorder>
        <Text c="dimmed">Preview not available for this file type.</Text>
      </Paper>
    );
  };

  // ────────────────────────────────────────────────────────────
  // Full-Screen Preview Renderer
  // ────────────────────────────────────────────────────────────
  const renderFullScreenPreview = () => {
    if (!fullScreenPreview) return null;

    const { upload, file } = fullScreenPreview;

    if (file.type === "pdf") {
      const pdfBlob = new Blob([
        Uint8Array.from(atob(file.content), c => c.charCodeAt(0))
      ], { type: "application/pdf" });
      const pdfUrl = URL.createObjectURL(pdfBlob);

      return (
        <div style={{ width: '100%', height: '80vh' }}>
          <iframe 
            src={pdfUrl} 
            width="100%" 
            height="100%" 
            style={{ border: 'none' }}
          />
        </div>
      );
    }

    if (file.type === 'docx') {
      // Show formatted HTML content if available
      if (file.isFormatted && file.htmlContent) {
        return (
          <ScrollArea style={{ height: '80vh' }}>
            <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
              <Text size="lg" fw={500} mb="md">DOCX Document - Formatted View</Text>
              <div 
                style={{ 
                  background: 'white',
                  padding: '3rem',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  fontFamily: 'Times, "Times New Roman", serif',
                  fontSize: '16px',
                  lineHeight: '1.8',
                  color: '#333',
                  minHeight: '600px',
                  maxWidth: '100%',
                  width: '100%',
                  overflowWrap: 'break-word',
                  wordWrap: 'break-word',
                  hyphens: 'auto',
                  overflow: 'hidden',
                }}
                dangerouslySetInnerHTML={{ 
                  __html: `
                    <style>
                      * {
                        max-width: 100% !important;
                        overflow-wrap: break-word !important;
                        word-wrap: break-word !important;
                        box-sizing: border-box !important;
                      }
                      p, h1, h2, h3, h4, h5, h6, li, div, span {
                        max-width: 100% !important;
                        overflow-wrap: break-word !important;
                      }
                      /* Preserve indentation and spacing */
                      .docx-content {
                        white-space: pre-wrap !important;
                        tab-size: 4 !important;
                      }
                      /* Handle lists with proper indentation */
                      ul, ol {
                        padding-left: 2.5em !important;
                        margin: 1em 0 !important;
                      }
                      li {
                        margin-bottom: 0.5em !important;
                        line-height: 1.6 !important;
                      }
                      /* Preserve paragraph indentation */
                      p {
                        margin-bottom: 1.2em !important;
                        line-height: 1.8 !important;
                        text-indent: inherit !important;
                      }
                    </style>
                    <div class="docx-content">
                      ${file.htmlContent
                        // Add better paragraph spacing
                        .replace(/<p>/g, '<p style="margin-bottom: 1.2em; line-height: 1.8; max-width: 100%; overflow-wrap: break-word;">')
                        // Style headers better
                        .replace(/<h1>/g, '<h1 style="font-size: 24px; font-weight: bold; margin: 2em 0 1em 0; color: #2c3e50; max-width: 100%; overflow-wrap: break-word;">')
                        .replace(/<h2>/g, '<h2 style="font-size: 20px; font-weight: bold; margin: 1.8em 0 0.8em 0; color: #34495e; max-width: 100%; overflow-wrap: break-word;">')
                        .replace(/<h3>/g, '<h3 style="font-size: 18px; font-weight: bold; margin: 1.5em 0 0.6em 0; color: #34495e; max-width: 100%; overflow-wrap: break-word;">')
                        // Better list styling
                        .replace(/<ul>/g, '<ul style="margin: 1em 0; padding-left: 2.5em; max-width: 100%;">')
                        .replace(/<li>/g, '<li style="margin-bottom: 0.5em; line-height: 1.6; max-width: 100%; overflow-wrap: break-word;">')
                        // Emphasize strong/bold text
                        .replace(/<strong>/g, '<strong style="font-weight: 700; max-width: 100%; overflow-wrap: break-word;">')
                      }
                    </div>
                  `
                }}
              />
            </div>
          </ScrollArea>
        );
      }
      
      // Fall back to status display if conversion failed
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '80vh', 
          flexDirection: 'column', 
          gap: '1rem'
        }}>
          <IconFile size={64} color="#868e96"/>
          <Text size="lg" fw={500}>DOCX Document</Text>
          <Text size="sm" c="dimmed" ta="center">
            Document conversion not available - showing status.
          </Text>
          <div style={{ 
            padding: '2rem', 
            background: '#f8f9fa', 
            borderRadius: '8px', 
            border: '1px solid #dee2e6', 
            textAlign: 'center' 
          }}>
            <Stack align="center" gap="sm">
              <Group gap="lg">
                <Group gap="xs">
                  <IconDatabase size={20} color="#51cf66"/>
                  <Text size="sm" c="dimmed">Document successfully stored</Text>
                </Group>
              </Group>
              <Group gap="lg">
                <Group gap="xs">
                  <IconCheck size={20} color="#51cf66" />
                  <Text size="sm" c="dimmed">Ready for resume generation</Text>
                </Group>
              </Group>
              <Group gap="lg">
                <Group gap="xs">
                  <IconLock size={20} color="#51cf66" />
                  <Text size="sm" c="dimmed">Securely saved in your account</Text>
                </Group>
              </Group>
            </Stack>
          </div>
        </div>
      );
    }

    // Handle ODT files (mammoth doesn't support ODT)
    if (file.type === 'odt') {
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '80vh', 
          flexDirection: 'column', 
          gap: '1rem'
        }}>
          <IconFile size={64} color="#868e96"/>
          <Text size="lg" fw={500}>ODT Document</Text>
          <Text size="sm" c="dimmed" ta="center">
            This ODT document is stored in your database.
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            Document preview is available - the file is ready for processing.
          </Text>
          <div style={{ 
            padding: '2rem', 
            background: '#f8f9fa', 
            borderRadius: '8px', 
            border: '1px solid #dee2e6', 
            textAlign: 'center' 
          }}>
            <Stack align="center" gap="sm">
              <Group gap="lg">
                <Group gap="xs">
                  <IconDatabase size={20} color="#51cf66"/>
                  <Text size="sm" c="dimmed">Document successfully stored</Text>
                </Group>
              </Group>
              <Group gap="lg">
                <Group gap="xs">
                  <IconCheck size={20} color="#51cf66" />
                  <Text size="sm" c="dimmed">Ready for resume generation</Text>
                </Group>
              </Group>
              <Group gap="lg">
                <Group gap="xs">
                  <IconLock size={20} color="#51cf66" />
                  <Text size="sm" c="dimmed">Securely saved in your account</Text>
                </Group>
              </Group>
            </Stack>
          </div>
        </div>
      );
    }

    if (['txt', 'md'].includes(file.type)) {
      const textContent = atob(file.content);
      return (
        <ScrollArea style={{ height: '80vh' }}>
          <Text 
            size="sm" 
            style={{ 
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              padding: '1rem'
            }}
          >
            {textContent}
          </Text>
        </ScrollArea>
      );
    }

    return (
      <Text c="dimmed">Full screen preview not available for this file type.</Text>
    );
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

      {/* Full-Screen Preview */}
      <Modal
        opened={!!fullScreenPreview}
        onClose={() => setFullScreenPreview(null)}
        size="xl"
        fullScreen
        title={fullScreenPreview ? `Full Preview: ${fullScreenPreview.upload.displayName}` : ''}
        styles={{ body: { padding: 0 }, content: { height: "100vh" } }}
      >
        {renderFullScreenPreview()}
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
                          {renderFilePreview(u)}
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
