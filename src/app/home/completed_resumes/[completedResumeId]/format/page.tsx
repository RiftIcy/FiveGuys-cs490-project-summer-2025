"use client";

import React, { useEffect, useState } from "react";
import { Container, Title, Loader, Text, Stack, Card, Button, Group, Alert, ActionIcon, Tooltip, Collapse, SimpleGrid, Badge, Image, Switch, Divider } from "@mantine/core";
import { useParams, useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { IconDownload, IconArrowBack, IconCheck, IconColumns1, IconColumns3 } from "@tabler/icons-react";
import { useTheme } from "@/context/themeContext";

interface CompletedResume {
    _id: string;
    job_title: string;
    company: string;
    created_at: string;
    tailored_resume: any;
    source_resume_ids: string[];
    source_resume_names: string[];
    job_ad_data: any;
}

interface Template {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    isDefault?: boolean;
    columnLayout?: 'single' | 'double';
    features?: string[];
}

export default function FormatResumePage() {
    const { completedResumeId } = useParams();
    const router = useRouter();
    const { theme } = useTheme(); // Get current theme
    const [data, setData] = useState<CompletedResume | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormatting, setIsFormatting] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [filename, setFilename] = useState<string>('Resume.pdf');
    const [formatError, setFormatError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(true); // State to toggle PDF preview
    
    // Template selection state
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [templateError, setTemplateError] = useState<string | null>(null);
    const [hasSelectedTemplate, setHasSelectedTemplate] = useState(false);
    
    // Column layout toggle state
    const [isDoubleColumn, setIsDoubleColumn] = useState(false);
    const [availableTemplates, setAvailableTemplates] = useState<Template[]>([]);

    // Get theme-appropriate colors and styling
    const getThemeStyles = () => {
        if (theme === 'night-sky') {
            return {
                primaryColor: 'nightSky',
                selectedBorder: '#8b5cf6',
                unselectedBorder: '#374151',
                textColor: '#8b5cf6'
            };
        } else {
            return {
                primaryColor: 'blue',
                selectedBorder: '#228be6',
                unselectedBorder: '#e9ecef',
                textColor: '#228be6'
            };
        }
    };

    const themeStyles = getThemeStyles();

    // Helper functions for template management
    const getBaseTemplateName = (templateId: string) => {
        return templateId.replace('_1col', '').replace('_2col', '');
    };

    const getTemplateVariant = (baseTemplate: string, isDoubleColumn: boolean) => {
        return `${baseTemplate}_${isDoubleColumn ? '2col' : '1col'}`;
    };

    const filterTemplatesByColumn = (allTemplates: Template[], isDoubleColumn: boolean) => {
        const suffix = isDoubleColumn ? '_2col' : '_1col';
        return allTemplates.filter(template => template.id.endsWith(suffix));
    };

    const getAuthHeaders = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");
        const idToken = await user.getIdToken();
        return { Authorization: `Bearer ${idToken}` };
    };

    useEffect(() => {
        async function fetchCompletedResume() {
            try {
                const authHeaders = await getAuthHeaders();
                
                const response = await fetch(
                    `http://localhost:5000/completed_resumes/${completedResumeId}`, 
                    { headers: authHeaders }
                );
                
                if (!response.ok) throw new Error(response.statusText);
                const result = await response.json();
                setData(result);
                
                // Don't automatically format - wait for template selection
                // await formatResume(result, authHeaders);
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoading(false);
            }
        }
        
        async function fetchTemplates() {
            try {
                const authHeaders = await getAuthHeaders();
                
                console.log('📋 Fetching templates...'); // Debug log
                
                const response = await fetch(
                    'http://localhost:5000/api/templates',
                    { headers: authHeaders }
                );
                
                if (!response.ok) throw new Error('Failed to fetch templates');
                const result = await response.json();
                
                console.log('✅ Templates received:', result.templates); // Debug log
                
                setAvailableTemplates(result.templates || []);
                
                // Filter templates based on current column setting (default to single column)
                const filteredTemplates = filterTemplatesByColumn(result.templates || [], isDoubleColumn);
                setTemplates(filteredTemplates);
                
                // Set default template if available
                const defaultTemplate = filteredTemplates.find((t: Template) => t.isDefault);
                if (defaultTemplate) {
                    setSelectedTemplateId(defaultTemplate.id);
                    console.log('🎯 Default template selected:', defaultTemplate.id); // Debug log
                } else if (filteredTemplates.length > 0) {
                    // If no default found, select the first available template
                    setSelectedTemplateId(filteredTemplates[0].id);
                    console.log('🎯 First template selected:', filteredTemplates[0].id); // Debug log
                }
            } catch (err) {
                console.error('❌ Template fetch error:', err); // Debug log
                setTemplateError(err instanceof Error ? err.message : 'Failed to load templates');
                // Fallback: create a default template option
                setTemplates([{
                    id: 'default',
                    name: 'Default Template',
                    description: 'Clean and professional resume format',
                    isDefault: true
                }]);
                setSelectedTemplateId('default');
                console.log('🔄 Using fallback template'); // Debug log
            } finally {
                setLoadingTemplates(false);
            }
        }
        
        if (completedResumeId) {
            fetchCompletedResume();
            fetchTemplates();
        }
    }, [completedResumeId]);

    // Function to format resume (extracted for reuse)
    const formatResume = async (resumeData: CompletedResume, authHeaders?: any) => {
        if (!selectedTemplateId) {
            setFormatError('Please select a template before formatting');
            return;
        }

        setIsFormatting(true);
        setFormatError(null);

        try {
            const headers = authHeaders || await getAuthHeaders();
            
            console.log('🎨 Formatting with template:', selectedTemplateId); // Debug log
            
            const response = await fetch('http://localhost:5000/format_resume', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
                body: JSON.stringify({
                    resume_data: resumeData.tailored_resume,
                    completed_resume_id: completedResumeId,
                    job_title: resumeData.job_title,
                    template_id: selectedTemplateId, // Include selected template
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to format resume');
            }

            const result = await response.json();
            
            console.log('✅ Format response:', result); // Debug log
            
            if (result.downloadUrl) {
                setDownloadUrl(result.downloadUrl);
                setHasSelectedTemplate(true);
            }
        } catch (error) {
            console.error('❌ Format error:', error); // Debug log
            setFormatError(error instanceof Error ? error.message : 'Unknown error occurred');
        } finally {
            setIsFormatting(false);
        }
    };

    // Handle template selection
    const handleTemplateSelect = (templateId: string) => {
        console.log('🎨 Template selected:', templateId); // Debug log
        setSelectedTemplateId(templateId);
        setDownloadUrl(null); // Clear any existing download
        setHasSelectedTemplate(false); // Reset formatting state
    };

    // Handle column layout toggle
    const handleColumnToggle = (checked: boolean) => {
        console.log('📐 Column layout changed:', checked ? '2-column' : '1-column'); // Debug log
        setIsDoubleColumn(checked);
        
        // Filter templates based on new column setting
        const filteredTemplates = filterTemplatesByColumn(availableTemplates, checked);
        setTemplates(filteredTemplates);
        
        // Update selected template to match the new column layout
        if (selectedTemplateId) {
            const baseTemplate = getBaseTemplateName(selectedTemplateId);
            const newTemplateId = getTemplateVariant(baseTemplate, checked);
            const newTemplate = filteredTemplates.find(t => t.id === newTemplateId);
            
            if (newTemplate) {
                setSelectedTemplateId(newTemplateId);
                console.log('🔄 Template updated to:', newTemplateId); // Debug log
            } else if (filteredTemplates.length > 0) {
                // Fallback to first available template in new layout
                setSelectedTemplateId(filteredTemplates[0].id);
                console.log('🔄 Fallback template selected:', filteredTemplates[0].id); // Debug log
            }
        }
        
        // Clear any existing download since layout changed
        setDownloadUrl(null);
        setHasSelectedTemplate(false);
    };

    // RF002: Trigger POST /format_resume to the server (for re-formatting)
    const handleFormatResume = async () => {
        if (!data) return;
        await formatResume(data);
    };

    useEffect(() => {
        if (data) {
            const formattedFilename = `${data.job_title.replace(/[,\s]+/g, '_')}.pdf`;
            setFilename(formattedFilename);
        }
    }, [data]);

    if (loading || loadingTemplates) {
        return (
            <Container>
                <Stack align="center" gap="md" py="xl">
                    <Loader size="lg" />
                    <Text>
                        {loading ? "Loading resume..." : "Loading templates..."}
                    </Text>
                </Stack>
            </Container>
        );
    }

    if (isFormatting) {
        return (
            <Container>
                <Stack align="center" gap="md" py="xl">
                    <Loader size="lg" />
                    <Text>
                        Formatting your resume with {templates.find(t => t.id === selectedTemplateId)?.name || 'selected template'}...
                    </Text>
                    <Text size="sm" color="dimmed">
                        This may take a moment
                    </Text>
                </Stack>
            </Container>
        );
    }
    
    if (error || !data) return <Container><Text color="red">Error loading data</Text></Container>;

    return (
        <Container size="xl" py="xl">
            <Group justify="space-between" mb="md">
                <Button 
                    variant="subtle" 
                    onClick={() => router.push(`/home/completed_resumes/${completedResumeId}`)}
                >
                    <IconArrowBack/>&nbsp;&nbsp;Resume
                </Button>
            </Group>

            <Title order={2} mb="md">
                Formatted Resume for {data.tailored_resume.first_name} {data.tailored_resume.last_name}: {data.job_title} at {data.company}
            </Title>
            
            <Text size="sm" color="dimmed" mb="xl">
                Created: {new Date(data.created_at).toLocaleString()}
            </Text>

            {/* Template Selection Section */}
            {!hasSelectedTemplate && (
                <Card shadow="sm" padding="lg" mb="md">
                    <Stack gap="md">
                        <Title order={3}>Choose a Template</Title>
                        <Text size="sm" color="dimmed">
                            Select how you want your resume to look before formatting.
                            {selectedTemplateId && (
                                <Text component="span" fw={500} style={{ color: themeStyles.textColor }} ml="xs">
                                    Current: {templates.find(t => t.id === selectedTemplateId)?.name}
                                </Text>
                            )}
                        </Text>
                        
                        {/* Column Layout Toggle */}
                        <Card withBorder padding="md" style={{ backgroundColor: theme === 'night-sky' ? '#1a1b23' : '#f8f9fa' }}>
                            <Group justify="space-between" align="center">
                                <Group gap="xs">
                                    <ActionIcon
                                        variant="light"
                                        color={themeStyles.primaryColor}
                                        size="lg"
                                    >
                                        {isDoubleColumn ? <IconColumns3 size={20} /> : <IconColumns1 size={20} />}
                                    </ActionIcon>
                                    <Stack gap={2}>
                                        <Text fw={500} size="sm">
                                            Column Layout
                                        </Text>
                                        <Text size="xs" color="dimmed">
                                            {isDoubleColumn ? 'Two-column layout (ModernCV style)' : 'Single-column layout (Traditional)'}
                                        </Text>
                                    </Stack>
                                </Group>
                                
                                <Switch
                                    checked={isDoubleColumn}
                                    onChange={(event) => handleColumnToggle(event.currentTarget.checked)}
                                    color={themeStyles.primaryColor}
                                    size="md"
                                    thumbIcon={
                                        isDoubleColumn ? (
                                            <IconColumns3 size={12} color={themeStyles.selectedBorder} />
                                        ) : (
                                            <IconColumns1 size={12} color={themeStyles.selectedBorder} />
                                        )
                                    }
                                />
                            </Group>
                        </Card>
                        
                        <Divider />
                        
                        {templateError && (
                            <Alert color="yellow" title="Template Loading Warning">
                                {templateError}. Using default template.
                            </Alert>
                        )}
                        
                        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                            {templates.map((template) => {
                                const isSelected = selectedTemplateId === template.id;
                                const isNightSky = theme === 'night-sky';
                                return (
                                    <Card
                                        key={template.id}
                                        padding="md"
                                        shadow="sm"
                                        withBorder
                                        style={{
                                            cursor: 'pointer',
                                            border: isSelected
                                                ? `3px solid ${themeStyles.selectedBorder}`
                                                : `2px solid ${themeStyles.unselectedBorder}`,
                                            position: 'relative',
                                            transition: 'border 0.2s ease, outline 0.2s ease',
                                            borderRadius: '8px',
                                            outline: isSelected && isNightSky ? '3px solid #a78bfa' : undefined,
                                            outlineOffset: isSelected && isNightSky ? '2px' : undefined,
                                        }}
                                        onClick={() => handleTemplateSelect(template.id)}
                                    >
                                        {isSelected && (
                                            <Badge
                                                color={themeStyles.primaryColor}
                                                variant="filled"
                                                style={{
                                                    position: 'absolute',
                                                    bottom: 8,
                                                    right: 8,
                                                    zIndex: 1
                                                }}
                                            >
                                                <IconCheck size={12} />
                                            </Badge>
                                        )}
                                        
                                        {template.imageUrl && (
                                            <Image
                                                src={template.imageUrl}
                                                alt={`${template.name} preview`}
                                                height={120}
                                                fit="cover"
                                                radius="sm"
                                                mb="sm"
                                            />
                                        )}
                                        
                                        <Stack gap="xs">
                                            <Group justify="space-between" align="flex-start">
                                                <Text fw={500} size="sm">
                                                    {template.name}
                                                </Text>
                                                {template.isDefault && (
                                                    <Badge size="xs" color="green" variant="light">
                                                        Default
                                                    </Badge>
                                                )}
                                            </Group>
                                            
                                            {template.description && (
                                                <Text size="xs" color="dimmed">
                                                    {template.description}
                                                </Text>
                                            )}
                                            
                                            {template.features && (
                                                <Group gap={4} mt="xs">
                                                    {template.features.map((feature, idx) => (
                                                        <Badge
                                                            key={idx}
                                                            size="xs"
                                                            variant="light"
                                                            color={themeStyles.primaryColor}
                                                        >
                                                            {feature}
                                                        </Badge>
                                                    ))}
                                                </Group>
                                            )}
                                        </Stack>
                                    </Card>
                                );
                            })}
                        </SimpleGrid>
                        
                        <Group justify="center" mt="md">
                            <Button
                                color={themeStyles.primaryColor}
                                onClick={() => data && formatResume(data)}
                                disabled={!selectedTemplateId || isFormatting}
                                loading={isFormatting}
                                size="md"
                            >
                                {isFormatting ? 'Formatting Resume...' : 'Format Resume with Selected Template'}
                            </Button>
                        </Group>
                    </Stack>
                </Card>
            )}

            {formatError && (
                <Alert color="red" title="Error" mb="md">
                    {formatError}
                    <Button 
                        size="sm" 
                        variant="outline" 
                        mt="sm"
                        onClick={handleFormatResume}
                    >
                        Try Again
                    </Button>
                </Alert>
            )}

            {downloadUrl && hasSelectedTemplate && (
                <Card shadow="sm" padding="lg" mb="md">
                    <Stack gap="md">
                        <Group justify="space-between">
                            <Tooltip label="Preview the PDF inline" position="top" withArrow>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowPreview(!showPreview);
                                        if (!showPreview) {
                                            // Scroll to PDF viewer after a short delay to allow the collapse to expand
                                            setTimeout(() => {
                                                const previewElement = document.getElementById('pdf-preview');
                                                if (previewElement) {
                                                    previewElement.scrollIntoView({ 
                                                        behavior: 'smooth',
                                                        block: 'start'
                                                    });
                                                }
                                            }, 350);
                                        }
                                    }}
                                >
                                    {showPreview ? "Hide PDF" : "Preview PDF"}
                                </Button>
                            </Tooltip>
                            <Group gap="xs">
                                <Button 
                                    variant="outline"
                                    onClick={() => {
                                        setHasSelectedTemplate(false);
                                        setDownloadUrl(null);
                                    }}
                                >
                                    Change Template
                                </Button>
                                <Button 
                                    variant="outline"
                                    onClick={handleFormatResume}
                                    loading={isFormatting}
                                >
                                    Regenerate PDF
                                </Button>
                                <Tooltip label="Download the PDF file" position="top" withArrow>
                                    <ActionIcon
                                        variant="outline"
                                        color="green"
                                        size="lg"
                                        onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = downloadUrl;
                                            link.download = filename;
                                            link.click();
                                        }}
                                    >
                                        <IconDownload size={20} />
                                    </ActionIcon>
                                </Tooltip>
                            </Group>
                        </Group>

                        {/* PDF Viewer */}
                        <Collapse in={showPreview} transitionDuration={300}>
                            <div 
                                id="pdf-preview"
                                style={{ 
                                    width: '100%', 
                                    height: '80vh', 
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    marginTop: '1rem'
                                }}
                            >
                                <iframe
                                    src={downloadUrl}
                                    width="100%"
                                    height="100%"
                                    style={{ border: 'none' }}
                                />
                            </div>
                        </Collapse>
                    </Stack>
                </Card>
            )}
        </Container>
    );
}
