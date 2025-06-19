"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Card,
  Title,
  Text,
  Group,
  Stack,
  Badge,
  Button,
  TextInput,
  ActionIcon,
  Autocomplete,
  Textarea,
  CloseButton,
  Tooltip,
  Paper,
  Collapse,
  UnstyledButton,
  Loader,
  Indicator,
  Modal,
  Tabs,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconTrash,
  IconX,
  IconPlus,
  IconGripVertical,
  IconMail,
  IconClipboardText,
  IconBolt,
  IconBriefcase,
  IconSchool,
} from "@tabler/icons-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import SortableJobCard from "@/components/ui/SortableJobCard";
import SortableEducationCard from "@/components/ui/SortableEducationCard";
import { removeFromCache } from "@/lib/resumeCache";
import { CSS } from "@dnd-kit/utilities";

interface ResumeInfoProps {
  data: {
    _id?: string;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    contact?: {
      phones?: string[];
      emails?: string[];
    };
    career_objective: string | null;
    skills?: {
      [category: string]: string[];
    };
    jobs: {
      title: string | null;
      company: string | null;
      location: string | null;
      start_date: string | null;
      end_date: string | null;
      role_summary: string | null;
      responsibilities: string[];
      accomplishments: string[];
    }[];
    education: {
      institution: string | null;
      degree: string | null;
      start_date: string | null;
      end_date: string | null;
      GPA: number | null;
    }[];
  };
}

const canonicalizeJob = (job: any) => ({
  title: job.title ?? null,
  company: job.company ?? null,
  location: job.location ?? null,
  start_date: job.start_date ?? null,
  end_date: job.end_date ?? null,
  role_summary: job.role_summary ?? null,
  responsibilities: Array.isArray(job.responsibilities)
    ? job.responsibilities
    : [],
  accomplishments: Array.isArray(job.accomplishments)
    ? job.accomplishments
    : [],
});

type EduEntry = ResumeInfoProps["data"]["education"][number];

const canonicalizeEdu = (edu: any): EduEntry => ({
  institution: edu.institution ?? null,
  degree: edu.degree ?? null,
  start_date: edu.start_date ?? null,
  end_date: edu.end_date ?? null,
  GPA: typeof edu.GPA === "number" ? edu.GPA : null,
});

const mantineColors = [
  "blue",
  "green",
  "orange",
  "grape",
  "cyan",
  "red",
  "lime",
  "teal",
  "yellow",
  "pink",
  "violet",
  "indigo",
];

function getColorFromCategory(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) % 2333;
  }
  return mantineColors[hash % mantineColors.length];
}

function getAllSkills(skillsState: Record<string, string[]>): string[] {
  return Object.values(skillsState).flat();
}

function ClosableEditableBadge({
  label,
  onClose,
  onCancel,
  color = "gray",
  onChange,
  isEditing,
  error,
}: {
  label: string;
  onClose: () => void;
  onCancel?: () => void;
  color?: string;
  onChange?: (val: string) => void;
  isEditing?: boolean;
  error?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <Group gap={4} align="flex-start">
      <Badge
        color={color}
        variant="filled"
        rightSection={
          isEditing ? (
            <ActionIcon
              size="xs"
              color="green"
              radius="xl"
              variant="subtle"
              onClick={onClose}
              disabled={!!error}
              style={{ marginLeft: 6 }}
              aria-label="Save new skill"
            >
              <IconPlus size="0.8rem" />
            </ActionIcon>
          ) : (
            <CloseButton
              variant="subtle"
              color="gray"
              radius="xl"
              size="xs"
              onClick={onClose}
              style={{ marginLeft: 6 }}
              aria-label={`Remove ${label}`}
            />
          )
        }
      >
        {isEditing ? (
          <TextInput
            ref={inputRef}
            value={label}
            onChange={(e) => onChange?.(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!error) onClose();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onCancel?.();
              }
            }}
            size="xs"
            variant="unstyled"
            styles={{
              input: {
                color: "white",
                fontWeight: 700,
                fontSize: "0.75rem",
                padding: 0,
                margin: 0,
                width: 80,
                backgroundColor: "transparent",
              },
            }}
          />
        ) : (
          label
        )}
      </Badge>

      {isEditing && error && (
        <Text size="xs" c="red" style={{ whiteSpace: "nowrap", paddingTop: 2 }}>
          {error}
        </Text>
      )}
    </Group>
  );
}

function DraggableSkill({
  id,
  category,
  label,
  onRemove,
  color,
}: {
  id: string;
  category: string;
  label: string;
  onRemove: () => void;
  color: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    display: "inline-flex", // for layout consistency
    cursor: "default",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Group gap={4} align="flex-start">
        {/* Drag only the label */}
        <Badge
          color={color}
          variant="filled"
          rightSection={
            <CloseButton
              variant="subtle"
              color="gray"
              radius="xl"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              style={{ marginLeft: 6 }}
              aria-label={`Remove ${label}`}
            />
          }
        >
          <span {...listeners} style={{ cursor: "grab", userSelect: "none" }}>
            {label}
          </span>
        </Badge>
      </Group>
    </div>
  );
}

function SortableCategory({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginBottom: 12,
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      withBorder
      shadow="xs"
      p="sm"
      radius="md"
    >
      <Group align="center" {...attributes}>
        <Tooltip label="Drag Category" withArrow>
          <ActionIcon variant="light" color="gray" {...listeners}>
            <IconGripVertical size={18} />
          </ActionIcon>
        </Tooltip>
        <div style={{ flex: 1 }}>{children}</div>
      </Group>
    </Paper>
  );
}

export default function ResumeInfo({ data }: ResumeInfoProps) {
  // Create a local cache to save currently working on Draft
  useEffect(() => {
    if (data._id) {
      localStorage.setItem("lastResumeId", data._id);
    }
  }, [data._id]);

  //Flag to decide if a resume is complete
  const [savingContinue, setSavingContinue] = useState(false);

  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor));

  const [isReparseModalOpen, setReparseModalOpen] = useState(false);
  const [reparsing, setReparsing] = useState(false);

  const {
    name,
    first_name,
    last_name,
    contact,
    career_objective,
    skills,
    education,
  } = data;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const [phones, setPhones] = useState(
    contact?.phones?.length ? contact.phones : [""]
  );
  const [phoneErrors, setPhoneErrors] = useState<(string | null)[]>(
    new Array(phones.length).fill(null)
  );

  const [emails, setEmails] = useState(
    contact?.emails?.length ? contact.emails : [""]
  );
  const [emailErrors, setEmailErrors] = useState<(string | null)[]>(
    new Array(emails.length).fill(null)
  );

  const [objective, setObjective] = useState(career_objective || "");
  const [objectiveError, setObjectiveError] = useState<string | null>(null);

  const [skillsState, setSkillsState] = useState(skills || {});
  const [newSkillInputs, setNewSkillInputs] = useState<{
    [category: string]: string;
  }>({});
  const [editingBadge, setEditingBadge] = useState<{
    [category: string]: boolean;
  }>({});
  const [newSkillValues, setNewSkillValues] = useState<{
    [category: string]: string;
  }>({});
  const [newCategory, setNewCategory] = useState("");
  const [newCategorySkill, setNewCategorySkill] = useState("");

  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryError, setNewCategoryError] = useState<string | null>(null);
  const [newCategorySkillError, setNewCategorySkillError] = useState<
    string | null
  >(null);
  const [categoryOrder, setCategoryOrder] = useState(Object.keys(skillsState));
  const [emptiedCategories, setEmptiedCategories] = useState<Set<string>>(
    new Set()
  );
  const categoryInputRef = useRef<HTMLInputElement>(null);

  const [badgeSkillErrors, setBadgeSkillErrors] = useState<{
    [category: string]: string | null;
  }>({});

  type JobEntry = ResumeInfoProps["data"]["jobs"][number];
  const initial = data.jobs.map(canonicalizeJob);
  const [jobsState, setJobsState] = useState<JobEntry[]>(initial);
  const [originalJobs, setOriginalJobs] = useState<JobEntry[]>(initial);
  const [jobDraft, setJobDraft] = useState<JobEntry | null>(null);
  const [savedJobsCount, setSavedJobsCount] = useState(data.jobs?.length ?? 0);
  const [savingJobOrder, setSavingJobOrder] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const isDateInvalid = Boolean(
    jobDraft?.start_date &&
      jobDraft.end_date &&
      jobDraft.end_date !== "Present" &&
      jobDraft.end_date < jobDraft.start_date
  );

  const startFormatError = Boolean(
    jobDraft?.start_date && !/^\d{4}-\d{2}$/.test(jobDraft.start_date)
  );

  const endFormatError = Boolean(
    jobDraft?.end_date && !/^(?:\d{4}-\d{2}|Present)$/i.test(jobDraft.end_date)
  );

  const startDateError = !jobDraft?.start_date
    ? "Start date is required"
    : !/^\d{4}-\d{2}$/.test(jobDraft.start_date)
    ? "Use format YYYY-MM"
    : null;

  const endDateError = !jobDraft?.end_date
    ? "End date is required"
    : !/^(?:\d{4}-\d{2}|present)$/i.test(jobDraft.end_date)
    ? "Use YYYY-MM or “Present”"
    : null;

  const roleSummaryError = !jobDraft?.role_summary?.trim()
    ? "Role summary is required"
    : null;

  const noResponsibilities =
    !jobDraft?.responsibilities?.length ||
    jobDraft.responsibilities.every((r) => !r.trim());
  const noAccomplishments =
    !jobDraft?.accomplishments?.length ||
    jobDraft.accomplishments.every((a) => !a.trim());
  const hasEmptyResponsibilitiesAndAccomplishments =
    noResponsibilities && noAccomplishments;
  const hasNoneAdded =
    (!jobDraft?.responsibilities || jobDraft.responsibilities.length === 0) &&
    (!jobDraft?.accomplishments || jobDraft.accomplishments.length === 0);
  const hasAnyEmptyResponsibility = jobDraft
    ? jobDraft.responsibilities.some((r) => !r.trim())
    : false;
  const hasAnyEmptyAccomplishment = jobDraft
    ? jobDraft.accomplishments.some((a) => !a.trim())
    : false;
  const isJobSaveDisabled =
    !!locationError ||
    !jobDraft?.title?.trim() ||
    !jobDraft?.company?.trim() ||
    !!startDateError ||
    !!endDateError ||
    startFormatError ||
    endFormatError ||
    isDateInvalid ||
    !!roleSummaryError ||
    hasAnyEmptyResponsibility ||
    hasAnyEmptyAccomplishment ||
    hasEmptyResponsibilitiesAndAccomplishments;

  const dragDisabled = editingIndex !== null && isJobSaveDisabled;
  const editFormRef = useRef<HTMLDivElement>(null);

  const initialEdus: EduEntry[] = Array.isArray(data.education)
    ? data.education.map(canonicalizeEdu)
    : [];
  const [edusState, setEdusState] = useState<EduEntry[]>(initialEdus);
  const [originalEdus, setOriginalEdus] = useState<EduEntry[]>(initialEdus);
  const [eduDraft, setEduDraft] = useState<EduEntry | null>(null);
  const [editingEduIndex, setEditingEduIndex] = useState<number | null>(null);
  const [savingEduOrder, setSavingEduOrder] = useState(false);

  const isEduSaveDisabled =
    !eduDraft ||
    !eduDraft.institution?.trim() ||
    !eduDraft.degree?.trim() ||
    !/^\d{4}-\d{2}$/.test(eduDraft.start_date || "") ||
    !/^(\d{4}-\d{2}|Present)$/i.test(eduDraft.end_date || "");

  const [gpaInput, setGpaInput] = useState<string>(
    eduDraft?.GPA != null ? eduDraft.GPA.toFixed(2) : ""
  );

  const blockEduUI = editingEduIndex !== null && isEduSaveDisabled;

  const handleReparse = async () => {
    const notifId = notifications.show({
      loading: true,
      title: "Parsing…",
      message: "Re-running parser on your history",
      autoClose: false,
      withCloseButton: false,
    });

    setReparsing(true);

    try {
      const response = await fetch(
        `http://localhost:5000/api/reparse-history/${data._id}`,
        {
          method: "POST",
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Re-parse failed");
      }
      notifications.update({
        id: notifId,
        loading: false,
        title: "Re-parsed!",
        message: "History was refreshed.",
        color: "teal",
        autoClose: 2000,
        withCloseButton: true,
      });
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      notifications.update({
        id: notifId,
        loading: false,
        title: "Error",
        message,
        color: "red",
        autoClose: 4000,
        withCloseButton: true,
      });
    } finally {
      setReparsing(false);
      setReparseModalOpen(false);
    }
  };

  const [saving, setSaving] = useState({
    emails: false,
    phones: false,
    objective: false,
    skills: false,
    jobs: false,
  });

  const [dirty, setDirty] = useState({
    emails: false,
    phones: false,
    objective: false,
    skills: false,
    jobs: false,
    education: false,
  });

  // For an unsaved category
  function markDirty(section: keyof typeof dirty) {
    setDirty((d) => ({ ...d, [section]: true }));
  }
  function clearDirty(section: keyof typeof dirty) {
    setDirty((d) => ({ ...d, [section]: false }));
  }

  const validateEmails = (emails: string[]) => {
    return emails.map((email) => {
      const trimmed = email.trim();
      if (!trimmed) return "Email is required";
      if (!emailRegex.test(email)) return "Invalid email format";
      return null;
    });
  };

  const updateEmailAtIndex = (index: number, value: string) => {
    markDirty("emails");
    const updated = [...emails];
    updated[index] = value;
    setEmails(updated);
    setEmailErrors(validateEmails(updated));
  };

  const addNewEmail = () => {
    const updated = [...emails, ""];
    setEmails(updated);
    setEmailErrors(validateEmails(updated));
  };

  const removeEmail = (index: number) => {
    if (emails.length === 1) return;
    const updated = emails.filter((_, i) => i !== index);
    setEmails(updated);
    setEmailErrors(validateEmails(updated));
  };

  const saveEmails = async () => {
    if (!data._id) {
      console.error("Missing resume _id");
      return;
    }

    if (emailErrors.some((e) => e !== null)) {
      notifications.show({
        title: "Validation Error",
        message: "Please fix invalid emails before saving.",
        color: "red",
        withCloseButton: true,
        autoClose: 2000,
      });
      return;
    }

    // Allow only valid emails to be saved
    const cleanedEmails = emails.map((e) => e.trim()).filter((e) => e !== "");

    if (cleanedEmails.length === 0) {
      notifications.show({
        title: "Validation Error",
        message: "At least one email is required",
        color: "red",
        withCloseButton: true,
        autoClose: 2000,
      });
      return;
    }

    setSaving((prev) => ({ ...prev, emails: true }));

    try {
      const response = await fetch(
        `http://localhost:5000/resume/${data._id}/update_contact`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: cleanedEmails }),
        }
      );

      const resData = await response.json();

      if (response.ok) {
        clearDirty("emails");
        notifications.show({
          title: "Success",
          message: "Emails saved successfully.",
          color: "teal",
          withCloseButton: true,
        });
      } else {
        notifications.show({
          title: "Error",
          message: resData.error || "Failed to save emails.",
          color: "red",
          withCloseButton: true,
        });
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to save emails.",
        color: "red",
        withCloseButton: true,
      });
    } finally {
      setSaving((prev) => ({ ...prev, emails: false }));
    }
  };

  const validatePhones = (phones: string[]) => {
    return phones.map((phone) => {
      const digitsOnly = phone.replace(/\D/g, "");
      if (!digitsOnly) return "Phone number is required";
      if (digitsOnly.length !== 10)
        return "Invalid phone format, must be exactly 10 digits";
      return null;
    });
  };

  const formatPhone = (input: string) => {
    const digits = input.replace(/\D/g, "").slice(0, 10);
    const parts = [];
    if (digits.length > 0) parts.push(digits.slice(0, 3));
    if (digits.length > 3) parts.push(digits.slice(3, 6));
    if (digits.length > 6) parts.push(digits.slice(6, 10));
    return parts.join("-");
  };

  const updatePhoneAtIndex = (index: number, value: string) => {
    markDirty("phones");

    const formatted = formatPhone(value);
    const updated = [...phones];
    updated[index] = formatted;
    setPhones(updated);
    setPhoneErrors(validatePhones(updated));
  };

  const addNewPhone = () => {
    const updated = [...phones, ""];
    setPhones(updated);
    setPhoneErrors(validatePhones(updated));
  };

  const removePhone = (index: number) => {
    if (phones.length === 1) return;
    const updated = phones.filter((_, i) => i !== index);
    setPhones(updated);
    setPhoneErrors(validatePhones(updated));
  };

  const savePhones = async () => {
    if (!data._id) return;

    if (phoneErrors.some((e) => e !== null)) {
      notifications.show({
        title: "Validation Error",
        message: "Please fix invalid phone numbers before saving.",
        color: "red",
      });
      return;
    }

    const cleanedPhones = phones
      .map((p) => p.replace(/\D/g, "")) // Strip non digits
      .filter((p) => p.length === 10) // only keep valid
      .map((p) => `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`);
    if (cleanedPhones.length === 0) {
      notifications.show({
        title: "Validation Error",
        message: "At least one phone number is required",
        color: "red",
      });
      return;
    }

    setSaving((prev) => ({ ...prev, phones: true }));

    try {
      const response = await fetch(
        `http://localhost:5000/resume/${data._id}/update_phone`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phones: cleanedPhones }),
        }
      );

      const resData = await response.json();
      if (response.ok) {
        clearDirty("phones");
        notifications.show({
          title: "Success",
          message: "Phones saved.",
          color: "teal",
        });
      } else {
        notifications.show({
          title: "Error",
          message: resData.error,
          color: "red",
        });
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Save failed",
        color: "red",
      });
    } finally {
      setSaving((prev) => ({ ...prev, phones: false }));
    }
  };

  const saveCareerObjective = async () => {
    if (!data._id) return;

    const trimmed = objective.trim();
    if (!trimmed) {
      setObjectiveError("Career objective cannot be empty");
      return;
    }

    setSaving((prev) => ({ ...prev, objective: true }));

    try {
      const response = await fetch(
        `http://localhost:5000/resume/${data._id}/update_objective`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ career_objective: trimmed }),
        }
      );

      const resData = await response.json();
      if (response.ok) {
        clearDirty("objective");
        notifications.show({
          title: "Success",
          message: "Career objective saved successfully.",
          color: "teal",
        });
      } else {
        notifications.show({
          title: "Error",
          message: resData.error || "Failed to save career objective.",
          color: "red",
        });
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Request failed while saving.",
        color: "red",
      });
    } finally {
      setSaving((prev) => ({ ...prev, objective: false }));
    }
  };

  const removeSkill = (category: string, skill: string) => {
    markDirty("skills");
    setSkillsState((prev) => {
      const updated = { ...prev };
      updated[category] = updated[category].filter((s) => s !== skill);
      return updated;
    });
  };

  const removeCategory = (category: string) => {
    markDirty("skills");
    setSkillsState((prev) => {
      const updated = { ...prev };
      delete updated[category];
      return updated;
    });
    setCategoryOrder((prev) => prev.filter((cat) => cat !== category));
  };

  const startAddSkill = (category: string) => {
    setEditingBadge((prev) => ({ ...prev, [category]: true }));
    setNewSkillValues((prev) => ({ ...prev, [category]: "" }));
  };

  const saveNewSkill = (category: string) => {
    markDirty("skills");
    const newSkill = newSkillValues[category]?.trim();
    const lowerSkill = newSkill?.toLowerCase() || "";

    const allSkills = getAllSkills(skillsState).map((s) => s.toLowerCase());

    if (!newSkill) {
      setBadgeSkillErrors((prev) => ({
        ...prev,
        [category]: "Skill is required.",
      }));
      return;
    }

    if (allSkills.includes(lowerSkill)) {
      const matched = getAllSkills(skillsState).find(
        (s) => s.toLowerCase() === lowerSkill
      );
      const formatted = matched
        ? `"${matched.toUpperCase()}" already exists.`
        : "Duplicate skill.";
      setBadgeSkillErrors((prev) => ({ ...prev, [category]: formatted }));
      return;
    }

    setSkillsState((prev) => {
      const updated = { ...prev };
      updated[category] = [...(updated[category] || []), newSkill];
      return updated;
    });

    setEditingBadge((prev) => ({ ...prev, [category]: false }));
    setNewSkillValues((prev) => ({ ...prev, [category]: "" }));
    setBadgeSkillErrors((prevErrs) => ({ ...prevErrs, [category]: null }));
  };

  const addNewCategory = () => {
    const trimmedCategory = newCategory.trim();
    const trimmedSkill = newCategorySkill.trim();

    let hasError = false;
    const existingCategories = Object.keys(skillsState).map((c) =>
      c.toLowerCase()
    );
    const allSkills = getAllSkills(skillsState).map((s) => s.toLowerCase());

    if (!trimmedCategory) {
      setNewCategoryError("Category name is required.");
      hasError = true;
    } else if (existingCategories.includes(trimmedCategory.toLowerCase())) {
      setNewCategoryError("This category already exists.");
      hasError = true;
    } else {
      setNewCategoryError(null);
    }

    if (!trimmedSkill) {
      setNewCategorySkillError("At least one skill is required.");
      hasError = true;
    } else if (allSkills.includes(trimmedSkill.toLowerCase())) {
      setNewCategorySkillError(
        `"${trimmedSkill.toUpperCase()}" already exists.`
      );
      hasError = true;
    } else {
      setNewCategorySkillError(null);
    }

    if (hasError) return;

    markDirty("skills");
    setSkillsState((prev) => ({ ...prev, [trimmedCategory]: [trimmedSkill] }));
    setCategoryOrder((prev) => [...prev, trimmedCategory]);

    setNewCategory("");
    setNewCategorySkill("");
    setShowNewCategoryInput(false);
    setNewCategoryError(null);
    setNewCategorySkillError(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    markDirty("skills");

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const category = Object.entries(skillsState).find(([_, skills]) =>
      skills.includes(active.id as string)
    )?.[0];

    if (!category) return;

    const oldIndex = skillsState[category].indexOf(active.id as string);
    const newIndex = skillsState[category].indexOf(over.id as string);

    setSkillsState((prev) => {
      const updated = { ...prev };
      updated[category] = arrayMove(updated[category], oldIndex, newIndex);
      return updated;
    });
  };

  const saveSkills = async () => {
    if (!data._id) return;

    const hasSkills = Object.values(skillsState).some(
      (list) => list.length > 0
    );
    if (!hasSkills) {
      notifications.show({
        title: "Validation Error",
        message: "At least one skill is required before saving.",
        color: "red",
      });
      return;
    }

    const cleanedSkillsState: Record<string, string[]> = {};
    for (const category of categoryOrder) {
      const skills = skillsState[category];
      if (skills && skills.length > 0) {
        cleanedSkillsState[category] = skills;
      }
    }

    if (Object.keys(cleanedSkillsState).length === 0) {
      notifications.show({
        title: "Validation Error",
        message: "At least one skill is required before saving.",
        color: "red",
      });
      return;
    }

    setSaving((prev) => ({ ...prev, skills: true }));

    try {
      const response = await fetch(
        `http://localhost:5000/resume/${data._id}/update_skills`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skills: cleanedSkillsState }),
        }
      );

      const resData = await response.json();

      if (response.ok) {
        clearDirty("skills");
        notifications.show({
          title: "Success",
          message: "Skills saved successfully.",
          color: "teal",
        });
      } else {
        notifications.show({
          title: "Error",
          message: resData.error || "Failed to save skills.",
          color: "red",
        });
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Request failed while saving skills.",
        color: "red",
      });
    } finally {
      setSaving((prev) => ({ ...prev, skills: false }));
    }
  };

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    markDirty("skills");

    const oldIndex = categoryOrder.indexOf(active.id as string);
    const newIndex = categoryOrder.indexOf(over.id as string);

    setCategoryOrder((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const skillSaveValidationMessage = useMemo(() => {
    const allSkills = Object.values(skillsState).flat();
    const hasEmptyCategory = Object.entries(skillsState).some(
      ([_, skills]) => skills.length === 0
    );
    if (allSkills.length === 0) {
      return "At least one skill is required before saving.";
    }
    if (hasEmptyCategory) {
      return "All categories must have at least one skill.";
    }
    return null;
  }, [skillsState]);

  const handleJobDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    markDirty("jobs");

    const oldIndex = Number(active.id);
    const newIndex = Number(over.id);

    // 1) Reorder the live UI list
    setJobsState((prev) => arrayMove(prev, oldIndex, newIndex));

    // 2) Mirror the same reorder into the “last-saved” snapshot
    setOriginalJobs((prev) => arrayMove(prev, oldIndex, newIndex));

    // 3) Send the new order to the backend
    const reorderedJobs = arrayMove(jobsState, oldIndex, newIndex);
    saveJobOrder(reorderedJobs);
  };

  function toggleEdit(idx: number) {
    if (editingIndex === idx) {
      setEditingIndex(null);
      setJobDraft(null);
    } else {
      setEditingIndex(idx);
      // make a fresh copy of that job into draft
      setJobDraft({ ...jobsState[idx] });
    }
  }

  function cancelEdit() {
    clearDirty("jobs");

    if (editingIndex === null) return;

    if (editingIndex >= originalJobs.length) {
      // New job, remove it
      setJobsState((prev) => prev.filter((_, i) => i !== editingIndex));
    } else {
      setJobsState((prev) => {
        const copy = [...prev];
        copy[editingIndex] = originalJobs[editingIndex];
        return copy;
      });
    }
    setEditingIndex(null);
    setJobDraft(null);
    setLocationError(null);
  }

  async function saveJob(idx: number) {
    if (!jobDraft || !data._id) return;

    if (!jobDraft.title?.trim() || !jobDraft.company?.trim()) {
      notifications.show({
        title: "Validation Error",
        message: "Title & Company are required",
        color: "red",
      });
      return;
    }

    setSaving((prev) => ({ ...prev, jobs: true }));

    try {
      const isNewJob = idx >= (data.jobs?.length ?? 0);
      const endpoint = isNewJob
        ? `http://localhost:5000/resume/${data._id}/add_job`
        : `http://localhost:5000/resume/${data._id}/update_job/${idx}`;

      const jobToSave = canonicalizeJob(jobDraft);

      const payload = isNewJob
        ? { newJob: jobToSave }
        : { updatedJob: jobToSave };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (response.ok) {
        clearDirty("jobs");
        notifications.show({
          title: "Success",
          message: isNewJob
            ? "Job added successfully."
            : "Job updated successfully.",
          color: "teal",
        });

        // 1) Update the live UI list
        setJobsState((prev) => {
          const copy = [...prev];
          copy[idx] = jobToSave;
          return copy;
        });

        // 2) Mirror the change into the “last-saved” snapshot
        setOriginalJobs((prev) => {
          const copy = [...prev];
          if (idx < copy.length) {
            // updating an existing row
            copy[idx] = jobToSave;
          } else {
            // saving a brand-new row
            copy.push(jobToSave);
          }
          return copy;
        });

        // 3) Exit edit mode
        setEditingIndex(null);
        setJobDraft(null);
      } else {
        notifications.show({
          title: "Error",
          message: result.error || "Failed to update job.",
          color: "red",
        });
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Network error while saving job.",
        color: "red",
      });
    } finally {
      setSaving((prev) => ({ ...prev, jobs: false }));
    }
  }
  const notifIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (savingJobOrder) {
      notifIdRef.current = notifications.show({
        loading: true,
        title: "Saving...",
        message: "Updating job order.",
        autoClose: false,
        withCloseButton: false,
        color: "blue",
      });
    } else if (notifIdRef.current) {
      notifications.hide(notifIdRef.current);
      notifIdRef.current = null;
    }
  }, [savingJobOrder]);

  const saveJobOrder = async (jobsToSave: JobEntry[]) => {
    if (!data._id) return;

    setSavingJobOrder(true);

    try {
      const res = await fetch(
        `http://localhost:5000/resume/${data._id}/set_jobs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobs: jobsToSave.map(canonicalizeJob) }),
        }
      );
      const resData = await res.json();
      if (!res.ok) {
        notifications.show({
          title: "Error",
          message: resData.error || "Failed to save job order",
          color: "red",
        });
      } else {
        clearDirty("jobs");
        notifications.show({
          title: "Success",
          message: "Job order saved!",
          color: "teal",
          autoClose: 1000,
          withCloseButton: true,
        });
      }
    } catch (e) {
      notifications.show({
        title: "Error",
        message: "Failed to save job order",
        color: "red",
      });
    } finally {
      setSavingJobOrder(false);
    }
  };

  const deleteJob = async (index: number) => {
    markDirty("jobs");

    const isNew = index >= originalJobs.length;
    // If it's a new/unsaved job, just remove from jobsState.
    if (isNew) {
      setJobsState((prev) => prev.filter((_, i) => i !== index));
      // Also exit edit mode if it was editing
      if (editingIndex === index) cancelEdit();
      return;
    }
    // Otherwise, delete from backend
    if (!data._id) return;

    setSaving((prev) => ({ ...prev, jobs: true }));

    try {
      const res = await fetch(
        `http://localhost:5000/resume/${data._id}/delete_job/${index}`,
        {
          method: "DELETE",
        }
      );

      const resData = await res.json();
      if (!res.ok) {
        notifications.show({
          title: "Error",
          message: resData.error || "Failed to delete job",
          color: "red",
        });
      } else {
        clearDirty("jobs");
        notifications.show({
          title: "Success",
          message: "Job deleted!",
          color: "teal",
          autoClose: 1000,
        });

        setJobsState((prev) => prev.filter((_, i) => i !== index));

        setOriginalJobs((prev) => prev.filter((_, i) => i !== index));

        if (editingIndex === index) cancelEdit();
      }
    } catch (e) {
      notifications.show({
        title: "Error",
        message: "Failed to delete job",
        color: "red",
      });
    } finally {
      setSaving((prev) => ({ ...prev, jobs: false }));
    }
  };

  function toggleEduEdit(idx: number) {
    if (editingEduIndex === idx) {
      setEditingEduIndex(null);
      setEduDraft(null);
      setGpaInput("");
    } else {
      const entry = edusState[idx];
      setEditingEduIndex(idx);
      setEduDraft({ ...entry });
      setGpaInput(entry.GPA != null ? entry.GPA.toFixed(2) : "");
    }
  }

  function cancelEduEdit() {
    clearDirty("education");

    if (editingEduIndex === null) return;
    if (editingEduIndex >= originalEdus.length) {
      setEdusState((prev) => prev.filter((_, i) => i !== editingEduIndex));
    } else {
      setEdusState((prev) => {
        const copy = [...prev];
        copy[editingEduIndex] = originalEdus[editingEduIndex];
        return copy;
      });
    }
    setEditingEduIndex(null);
    setEduDraft(null);
  }

  async function saveEdu(idx: number) {
    if (!eduDraft || !data._id) return;
    // basic validation
    if (!eduDraft.institution?.trim() || !eduDraft.degree?.trim()) {
      notifications.show({
        title: "Validation Error",
        message: "Institution & Degree are required",
        color: "red",
      });
      return;
    }
    setSaving((prev) => ({ ...prev, jobs: true }));
    const isNew = idx >= originalEdus.length;
    const endpoint = isNew
      ? `http://localhost:5000/resume/${data._id}/add_education`
      : `http://localhost:5000/resume/${data._id}/update_education/${idx}`;
    const payload = isNew
      ? { newEdu: canonicalizeEdu(eduDraft) }
      : { updatedEdu: canonicalizeEdu(eduDraft) };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (res.ok) {
      // update UI & snapshot
      setEdusState((prev) => {
        const copy = [...prev];
        if (idx < copy.length) copy[idx] = canonicalizeEdu(eduDraft);
        else copy.push(canonicalizeEdu(eduDraft));
        return copy;
      });
      setOriginalEdus((prev) => {
        const copy = [...prev];
        if (idx < copy.length) copy[idx] = canonicalizeEdu(eduDraft);
        else copy.push(canonicalizeEdu(eduDraft));
        return copy;
      });
      setEditingEduIndex(null);
      setEduDraft(null);
      clearDirty("education");
      notifications.show({
        title: "Success",
        message: isNew ? "Education added" : "Education updated",
        color: "teal",
      });
    } else {
      notifications.show({
        title: "Error",
        message: result.error,
        color: "red",
      });
    }
    setSaving((prev) => ({ ...prev, jobs: false }));
  }

  const handleEduDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    markDirty("education");

    const oldIndex = Number(active.id),
      newIndex = Number(over.id);
    setEdusState((prev) => arrayMove(prev, oldIndex, newIndex));
    setOriginalEdus((prev) => arrayMove(prev, oldIndex, newIndex));
    // persist order
    saveEduOrder(arrayMove(edusState, oldIndex, newIndex));
  };

  async function saveEduOrder(toSave: EduEntry[]) {
    if (!data._id) return;
    setSavingEduOrder(true);
    const res = await fetch(
      `http://localhost:5000/resume/${data._id}/set_educations`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ educations: toSave.map(canonicalizeEdu) }),
      }
    );
    const js = await res.json();
    if (!res.ok) {
      notifications.show({ title: "Error", message: js.error, color: "red" });
    } else {
      clearDirty("education");
      notifications.show({
        title: "Success",
        message: "Education order saved",
        color: "teal",
      });
    }
    setSavingEduOrder(false);
  }

  async function deleteEdu(idx: number) {
    markDirty("education");

    const isNew = idx >= originalEdus.length;
    if (isNew) {
      return setEdusState((prev) => prev.filter((_, i) => i !== idx));
    }

    setSaving((prev) => ({ ...prev, jobs: true }));
    try {
      const res = await fetch(
        `http://localhost:5000/resume/${data._id}/delete_education/${idx}`,
        { method: "DELETE" }
      );
      const js = await res.json();
      if (!res.ok) {
        notifications.show({ title: "Error", message: js.error, color: "red" });
      } else {
        clearDirty("education");

        setEdusState((prev) => prev.filter((_, i) => i !== idx));
        setOriginalEdus((prev) => prev.filter((_, i) => i !== idx));
        notifications.show({
          title: "Success",
          message: "Education deleted",
          color: "teal",
        });
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Delete failed",
        color: "red",
      });
    } finally {
      setSaving((prev) => ({ ...prev, jobs: false }));
    }
  }
  function validateJobEntry(job: JobEntry): string | null {
    if (!job.title?.trim()) return "Every job needs a title.";
    if (!job.company?.trim()) return "Every job needs a company.";
    if (!job.location?.trim()) return "Every job needs a location.";
    if (!/^\d{4}-\d{2}$/.test(job.start_date ?? ""))
      return "Start date must be YYYY-MM.";
    if (!/^(?:\d{4}-\d{2}|Present)$/i.test(job.end_date ?? ""))
      return "End date must be YYYY-MM or Present.";
    if (job.end_date !== "Present" && job.start_date! > job.end_date!)
      return "End date must come after start date.";
    if (!job.role_summary?.trim()) return "Every job needs a role summary.";
    if (
      (!job.responsibilities.length ||
        job.responsibilities.every((r) => !r.trim())) &&
      (!job.accomplishments.length ||
        job.accomplishments.every((a) => !a.trim()))
    )
      return "Each job needs at least one responsibility or accomplishment.";
    if (job.responsibilities.some((r) => !r.trim()))
      return "Responsibilities cannot be blank.";
    if (job.accomplishments.some((a) => !a.trim()))
      return "Accomplishments cannot be blank.";
    return null;
  }

  function validateEduEntry(edu: EduEntry): string | null {
    if (!edu.institution?.trim()) return "Each education needs an institution.";
    if (!edu.degree?.trim()) return "Each education needs a degree.";
    if (!/^\d{4}-\d{2}$/.test(edu.start_date ?? ""))
      return "Edu start date must be YYYY-MM.";
    if (!/^(?:\d{4}-\d{2}|Present)$/i.test(edu.end_date ?? ""))
      return "Edu end date must be YYYY-MM or Present.";
    if (edu.end_date !== "Present" && edu.start_date! > edu.end_date!)
      return "Edu end date must come after start.";
    return null;
  }

  async function handleSaveAll() {
    // 1) Check validation errors in each section
    if (emailErrors.some(Boolean)) {
      return notifications.show({
        title: "Cannot save",
        message: "Fix invalid email(s) before saving all.",
        color: "red",
      });
    }
    if (phoneErrors.some(Boolean)) {
      return notifications.show({
        title: "Cannot save",
        message: "Fix invalid phone number(s) before saving all.",
        color: "red",
      });
    }
    if (!objective.trim() || objectiveError) {
      return notifications.show({
        title: "Cannot save",
        message: "Your career objective is empty or invalid.",
        color: "red",
      });
    }
    if (skillSaveValidationMessage) {
      return notifications.show({
        title: "Cannot save",
        message: skillSaveValidationMessage,
        color: "red",
      });
    }
    if (editingIndex !== null) {
      // Dont allow to save while a Job form is open
      const err = validateJobEntry(jobDraft!);
      if (err) {
        return notifications.show({
          title: "Cannot save",
          message: `Your open job entry is invalid: ${err}`,
          color: "red",
        });
      }
    }
    if (editingEduIndex !== null && isEduSaveDisabled) {
      return notifications.show({
        title: "Cannot save",
        message:
          "One of your education entries is invalid—please fix it first.",
        color: "red",
      });
    }
    for (let i = 0; i < jobsState.length; i++) {
      const err = validateJobEntry(jobsState[i]);
      if (err) {
        return notifications.show({
          title: "Cannot save",
          message: `Row ${i + 1} in Job History: ${err}`,
          color: "red",
        });
      }
    }
    for (let i = 0; i < edusState.length; i++) {
      const err = validateEduEntry(edusState[i]);
      if (err) {
        return notifications.show({
          title: "Cannot save",
          message: `Row ${i + 1} in Education: ${err}`,
          color: "red",
        });
      }
    }
    // If no errors save everything
    try {
      await Promise.all([
        saveEmails(),
        savePhones(),
        saveCareerObjective(),
        saveSkills(),
      ]);

      // Save each job entry
      for (let i = 0; i < jobsState.length; i++) {
        const err = validateJobEntry(jobsState[i]);
        await saveJob(i);
      }
      await saveJobOrder(jobsState);

      // Save each education entry
      for (let i = 0; i < edusState.length; i++) {
        await saveEdu(i);
      }
      await saveEduOrder(edusState);

      notifications.show({
        title: "All Saved",
        message: "Everything has been saved successfully!",
        color: "teal",
      });
    } catch (err) {
      // in case any of the saves threw
      notifications.show({
        title: "Error",
        message: "Something went wrong saving—please try again.",
        color: "red",
      });
    }
  }
  // Allow me to press continue button
  const canContinue =
    !emailErrors.some(Boolean) &&
    !phoneErrors.some(Boolean) &&
    !objectiveError &&
    !skillSaveValidationMessage &&
    editingIndex === null &&
    editingEduIndex === null &&
    Object.values(dirty).every((d) => d === false);

  // Define the continue handler:
  async function handleContinue() {
    setSavingContinue(true);
    try {
      await handleSaveAll();
      await fetch(`http://localhost:5000/resume/${data._id}/set_complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isComplete: true }),
      });
      removeFromCache(data._id!); 
      router.push("/home/completed");
    } catch (err) {
      notifications.show({
        title: "Error",
        message: "Could not complete resume.",
        color: "red",
      });
    } finally {
      setSavingContinue(false);
    }
  }

  return (
    <Container size="lg" py="md">
      <Group mb="md">
        <Title order={2} mb="lg">
          Data Overview
        </Title>
        <Button
          onClick={handleSaveAll}
          loading={
            saving.emails ||
            saving.phones ||
            saving.objective ||
            saving.skills ||
            saving.jobs
          }
        >
          {" "}
          Save All
        </Button>
        <Button color="red" onClick={() => setReparseModalOpen(true)}>
          Re-parse History
        </Button>
      </Group>

      <Tabs defaultValue="contact" variant="outline">
        <Tabs.List grow>
          <Tabs.Tab value="contact">
            <Group>
              <IconMail size={16} />
              Contact
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="objective">
            <Group>
              <IconClipboardText size={16} />
              Objective
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="skills">
            <Group>
              <IconBolt size={16} />
              Skills
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="jobs">
            <Group>
              <IconBriefcase size={16} />
              Jobs
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="education">
            <Group>
              <IconSchool size={16} />
              Education
            </Group>
          </Tabs.Tab>
        </Tabs.List>

        <Modal
          opened={isReparseModalOpen}
          onClose={() => setReparseModalOpen(false)}
          title="Re-parse history?"
          centered
        >
          <Text size="sm">
            This will discard any changes made, and re-run the parser. Are you
            sure?
          </Text>
          <Group mt="md">
            <Button
              variant="default"
              onClick={() => setReparseModalOpen(false)}
              disabled={reparsing}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleReparse}
              loading={reparsing}
              disabled={reparsing}
            >
              Re-parse
            </Button>
          </Group>
        </Modal>

        {/* Name */}
        {name && (
          <Card withBorder mb="md" shadow="sm">
            <Title order={3}>Resume Title</Title>
            <Text mt="sm">{name}</Text>
          </Card>
        )}

        {/* Contact Information */}
        <Tabs.Panel value="contact" pt="md">
          {contact && (
            <Card withBorder mb="md" shadow="sm">
              <Title order={3}>Contact Information</Title>

              <Title order={3}>Name</Title>
              <Text mt="sm">
                {first_name || last_name
                  ? [first_name, last_name].filter(Boolean).join(" ")
                  : "—"}
              </Text>

              {/* Email Section */}
              <Indicator
                color="red"
                disabled={!dirty.emails}
                position="top-end"
              >
                <div>
                  {emails.map((email, index) => (
                    <Group
                      key={index}
                      mt={index === 0 ? "sm" : "xs"}
                      align="flex-end"
                    >
                      <Autocomplete
                        style={{ flex: 1 }}
                        label={
                          index === 0 ? "Primary Email" : `Email ${index + 1}`
                        }
                        withAsterisk={index === 0}
                        value={email}
                        onChange={(value) => updateEmailAtIndex(index, value)}
                        placeholder={`Email ${index + 1}`}
                        error={emailErrors[index] || undefined}
                        data={
                          email && email.includes("@")
                            ? []
                            : [
                                "@gmail.com",
                                "@yahoo.com",
                                "@outlook.com",
                                "@njit.edu",
                              ]
                                .map((domain) => {
                                  const prefix = email.trim();
                                  return prefix ? prefix + domain : "";
                                })
                                .filter(Boolean)
                        }
                      />
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={() => removeEmail(index)}
                        disabled={emails.length === 1}
                        title="Remove this email"
                      >
                        <IconTrash size="1rem" />
                      </ActionIcon>
                    </Group>
                  ))}
                  {/* Button to add new emails */}
                  <Group mt="sm">
                    <Button variant="light" onClick={addNewEmail}>
                      + Add Email
                    </Button>
                    <Button
                      onClick={saveEmails}
                      loading={saving.emails}
                      disabled={emailErrors.some((e) => e !== null)}
                    >
                      Save Emails
                    </Button>
                  </Group>
                </div>
              </Indicator>

              {/* Phone Section */}
              <Title order={3} mt="lg">
                Phone Numbers
              </Title>
              <Indicator
                color="red"
                disabled={!dirty.phones}
                position="top-end"
              >
                <div>
                  {phones.map((phone, index) => (
                    <Group key={index} mt="xs" align="flex-end">
                      <TextInput
                        style={{ flex: 1 }}
                        label={
                          index === 0 ? "Primary Phone" : `Phone ${index + 1}`
                        }
                        withAsterisk={index === 0}
                        value={phone}
                        onChange={(e) =>
                          updatePhoneAtIndex(index, e.currentTarget.value)
                        }
                        error={phoneErrors[index] || undefined}
                      />
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={() => removePhone(index)}
                        disabled={phones.length === 1}
                        title="Remove this phone"
                      >
                        <IconTrash size="1rem" />
                      </ActionIcon>
                    </Group>
                  ))}
                  {/* Button to add new phone numbers */}
                  <Group mt="sm">
                    <Button variant="light" onClick={addNewPhone}>
                      + Add Phone
                    </Button>
                    <Button
                      onClick={savePhones}
                      loading={saving.phones}
                      disabled={
                        phoneErrors.some((e) => e !== null) ||
                        phones.every((p) => p.trim() === "")
                      }
                    >
                      Save Phones
                    </Button>
                  </Group>
                </div>
              </Indicator>
            </Card>
          )}
        </Tabs.Panel>

        {/* Career Objective */}
        <Tabs.Panel value="objective" pt="md">
          <Indicator color="red" disabled={!dirty.objective} position="top-end">
            <Card withBorder mb="md" shadow="sm">
              <Title order={3}>Career Objective</Title>
              <Textarea
                mt="sm"
                autosize
                minRows={3}
                label="Career Objective"
                withAsterisk
                placeholder="Enter your career objective"
                value={objective}
                onChange={(e) => {
                  markDirty("objective");
                  const value = e.currentTarget.value;
                  setObjective(value);
                  setObjectiveError(
                    value.trim() ? null : "Career objective is required"
                  );
                }}
                onBlur={() => {
                  if (!objective.trim()) {
                    setObjectiveError("Career objective is required");
                  }
                }}
                error={objectiveError}
              />
              <Group mt="sm">
                <Button
                  onClick={saveCareerObjective}
                  loading={saving.objective}
                  disabled={!objective.trim() || Boolean(objectiveError)}
                >
                  Save Objective
                </Button>
              </Group>
            </Card>
          </Indicator>
        </Tabs.Panel>

        {/* Skills */}
        <Tabs.Panel value="skills" pt="md">
          {skillsState && (
            <Indicator color="red" disabled={!dirty.skills} position="top-end">
              <Card withBorder mb="md" shadow="sm">
                <Title order={3}>Skills</Title>
                <Stack mt="sm">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleCategoryDragEnd}
                  >
                    <SortableContext
                      items={categoryOrder}
                      strategy={verticalListSortingStrategy}
                    >
                      {categoryOrder.map((category) => {
                        const skillList = skillsState[category] || [];

                        return (
                          <SortableCategory key={category} id={category}>
                            <div style={{ marginBottom: "1rem" }}>
                              {/* Category Header */}
                              <Group align="center" mb="xs">
                                <Title order={4} mt="sm">
                                  {category}
                                </Title>
                                <Tooltip
                                  label={
                                    emptiedCategories.has(category)
                                      ? `Click again to delete "${category}"`
                                      : `Remove all skills in "${category}"`
                                  }
                                  withArrow
                                >
                                  <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    radius="xl"
                                    size="xs"
                                    style={{ opacity: 0.7 }}
                                    onClick={() => {
                                      markDirty("skills");

                                      if (
                                        (skillsState[category]?.length ?? 0) > 0
                                      ) {
                                        // Clear the skills
                                        setSkillsState((prev) => ({
                                          ...prev,
                                          [category]: [],
                                        }));
                                        setEmptiedCategories((prev) =>
                                          new Set(prev).add(category)
                                        );
                                      } else {
                                        // Fully remove category
                                        setSkillsState((prev) => {
                                          const updated = { ...prev };
                                          delete updated[category];
                                          return updated;
                                        });
                                        setCategoryOrder((prev) =>
                                          prev.filter((c) => c !== category)
                                        );
                                        setEmptiedCategories((prev) => {
                                          const updated = new Set(prev);
                                          updated.delete(category);
                                          return updated;
                                        });
                                      }
                                    }}
                                  >
                                    <IconX size="0.9rem" stroke={1.5} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>

                              {/* Skills DnD */}
                              <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                              >
                                <SortableContext
                                  items={skillList}
                                  strategy={rectSortingStrategy}
                                >
                                  <Group wrap="wrap" gap={6} align="center">
                                    {skillList.map((skill) => (
                                      <DraggableSkill
                                        key={skill}
                                        id={skill}
                                        category={category}
                                        label={skill}
                                        onRemove={() =>
                                          removeSkill(category, skill)
                                        }
                                        color={getColorFromCategory(category)}
                                      />
                                    ))}

                                    {editingBadge[category] ? (
                                      <ClosableEditableBadge
                                        label={newSkillValues[category] || ""}
                                        isEditing
                                        onChange={(val) => {
                                          const lowerVal = val
                                            .trim()
                                            .toLowerCase();
                                          const allSkills = getAllSkills(
                                            skillsState
                                          ).map((s) => s.toLowerCase());

                                          setNewSkillValues((prev) => ({
                                            ...prev,
                                            [category]: val,
                                          }));

                                          if (!val.trim()) {
                                            setBadgeSkillErrors((prev) => ({
                                              ...prev,
                                              [category]: "Skill is required.",
                                            }));
                                          } else if (
                                            allSkills.includes(lowerVal)
                                          ) {
                                            const matched = getAllSkills(
                                              skillsState
                                            ).find(
                                              (s) =>
                                                s.toLowerCase() === lowerVal
                                            );
                                            const matchUpper = matched
                                              ? matched.toUpperCase()
                                              : val.toUpperCase();
                                            setBadgeSkillErrors((prev) => ({
                                              ...prev,
                                              [category]: `"${matchUpper}" already exists.`,
                                            }));
                                          } else {
                                            setBadgeSkillErrors((prev) => ({
                                              ...prev,
                                              [category]: null,
                                            }));
                                          }
                                        }}
                                        onClose={() => saveNewSkill(category)}
                                        onCancel={() => {
                                          setEditingBadge((prev) => ({
                                            ...prev,
                                            [category]: false,
                                          }));
                                          setNewSkillValues((prev) => ({
                                            ...prev,
                                            [category]: "",
                                          }));
                                          setBadgeSkillErrors((prev) => ({
                                            ...prev,
                                            [category]: null,
                                          }));
                                        }}
                                        color={getColorFromCategory(category)}
                                        error={badgeSkillErrors[category]}
                                      />
                                    ) : (
                                      <ActionIcon
                                        variant="light"
                                        onClick={() => startAddSkill(category)}
                                        color={getColorFromCategory(category)}
                                      >
                                        <IconPlus size="1rem" />
                                      </ActionIcon>
                                    )}
                                  </Group>
                                </SortableContext>
                              </DndContext>
                            </div>
                          </SortableCategory>
                        );
                      })}
                    </SortableContext>
                  </DndContext>
                </Stack>

                {/* Add new Categories */}
                <Group mt="md">
                  <Button
                    variant="light"
                    onClick={() => setShowNewCategoryInput(true)}
                  >
                    + Add New Category
                  </Button>
                </Group>

                <Group mt="md">
                  <Button
                    onClick={saveSkills}
                    loading={saving.skills}
                    disabled={!!skillSaveValidationMessage}
                  >
                    Save Skills
                  </Button>
                </Group>

                {skillSaveValidationMessage && (
                  <Text size="sm" c="red" mt="xs">
                    {skillSaveValidationMessage}
                  </Text>
                )}

                {showNewCategoryInput && (
                  <Card withBorder mt="sm" p="md" radius="md" shadow="xs">
                    <Stack>
                      <TextInput
                        ref={categoryInputRef}
                        label="New Category Name"
                        placeholder="e.g., Languages"
                        withAsterisk
                        value={newCategory}
                        onChange={(e) => {
                          const val = e.currentTarget.value;
                          setNewCategory(val);

                          const lowerVal = val.trim().toLowerCase();
                          const categoryExists = Object.keys(skillsState).some(
                            (cat) => cat.toLowerCase() === lowerVal
                          );

                          if (!val.trim()) {
                            setNewCategoryError("Category name is required.");
                          } else if (categoryExists) {
                            setNewCategoryError(
                              "This category already exists."
                            );
                          } else {
                            setNewCategoryError(null);
                          }
                        }}
                        error={newCategoryError}
                      />
                      <TextInput
                        label="First Skill"
                        placeholder="e.g., C, Java, Python"
                        withAsterisk
                        value={newCategorySkill}
                        onChange={(e) => {
                          const val = e.currentTarget.value;
                          setNewCategorySkill(val);

                          const lowerVal = val.trim().toLowerCase();
                          const allSkills = getAllSkills(skillsState).map((s) =>
                            s.toLowerCase()
                          );

                          if (!val.trim()) {
                            setNewCategorySkillError(
                              "At least one skill is required."
                            );
                          } else if (allSkills.includes(lowerVal)) {
                            const matched = getAllSkills(skillsState).find(
                              (s) => s.toLowerCase() === lowerVal
                            );
                            const formatted = matched
                              ? `"${matched.toUpperCase()}" already exists.`
                              : "Skill already exists.";
                            setNewCategorySkillError(formatted);
                          } else {
                            setNewCategorySkillError(null);
                          }
                        }}
                        error={newCategorySkillError}
                      />
                      <Group>
                        <Button
                          onClick={addNewCategory}
                          disabled={
                            !newCategory.trim() ||
                            !newCategorySkill.trim() ||
                            newCategoryError !== null ||
                            newCategorySkillError !== null
                          }
                        >
                          Add Category
                        </Button>
                        <Button
                          variant="subtle"
                          color="gray"
                          onClick={() => setShowNewCategoryInput(false)}
                        >
                          Cancel
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                )}
              </Card>
            </Indicator>
          )}
        </Tabs.Panel>

        <div style={{ position: "relative" }}>
          {/* Spinner Overlay: show while saving job order */}
          {savingJobOrder && (
            <div
              style={{
                position: "absolute",
                zIndex: 20,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(255,255,255,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Loader size="lg" color="blue" />
            </div>
          )}

          {/* Overlay to block everything except the open edit form */}
          {dragDisabled && (
            <div
              style={{
                position: "absolute",
                zIndex: 15,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(255,255,255,0.25)",
              }}
              onClick={() =>
                notifications.show({
                  color: "red",
                  title: "Cannot Move or Edit Jobs",
                  message:
                    "Finish editing and fix errors before doing anything else.",
                  autoClose: 2500,
                })
              }
            />
          )}

          {/* Job History */}
          <Tabs.Panel value="jobs" pt="md">
            <Indicator color="red" disabled={!dirty.jobs} position="top-end">
              <Card
                withBorder
                mb="md"
                shadow="sm"
                style={{ position: "relative" }}
              >
                <Title order={3}>Job History</Title>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => {
                    if (dragDisabled) {
                      notifications.show({
                        color: "red",
                        title: "Cannot Move or Edit Jobs",
                        message:
                          "Finish editing and fix errors before doing anything else.",
                        autoClose: 2500,
                      });
                      return;
                    }
                    handleJobDragEnd(event);
                  }}
                >
                  <SortableContext
                    items={jobsState.map((_, i) => i.toString())}
                    strategy={verticalListSortingStrategy}
                  >
                    <Stack mt="sm">
                      {jobsState.map((job, index) => (
                        <SortableJobCard
                          key={index}
                          id={index.toString()}
                          job={job}
                        >
                          {/* HEADER BAR */}
                          <UnstyledButton
                            onClick={() => !dragDisabled && toggleEdit(index)}
                            style={{ display: "block", width: "100%" }}
                            tabIndex={dragDisabled ? -1 : undefined}
                            aria-disabled={dragDisabled}
                          >
                            <Group
                              align="center"
                              style={{
                                cursor: dragDisabled
                                  ? "not-allowed"
                                  : "pointer",
                                padding: "8px 16px",
                                justifyContent: "space-between",
                                opacity: dragDisabled ? 0.4 : 1,
                              }}
                            >
                              <Text>
                                {job.title ?? "—"} @ {job.company ?? "—"}
                              </Text>
                              <Tooltip
                                label={
                                  editingIndex === index ? "Collapse" : "Expand"
                                }
                                withArrow
                              >
                                <Text size="sm" c="gray">
                                  {editingIndex === index ? "–" : "+"}
                                </Text>
                              </Tooltip>
                            </Group>
                          </UnstyledButton>

                          {/* DELETE BUTTON */}
                          <Tooltip label="Remove job" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="xs"
                              radius="xl"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!dragDisabled) {
                                  await deleteJob(index);
                                }
                              }}
                              loading={saving.jobs}
                              disabled={dragDisabled}
                              style={{
                                pointerEvents: dragDisabled ? "none" : "auto",
                                opacity: dragDisabled ? 0.5 : 1,
                              }}
                            >
                              <IconX size="1rem" />
                            </ActionIcon>
                          </Tooltip>

                          {/* Inline edit form */}
                          <Collapse in={editingIndex === index}>
                            <div
                              style={
                                dragDisabled
                                  ? {
                                      pointerEvents: "auto",
                                      position: "relative",
                                      zIndex: 16,
                                      background: "white",
                                    }
                                  : {}
                              }
                            >
                              <Stack px="md" pb="md">
                                {/* TITLE */}
                                <TextInput
                                  label="Title"
                                  placeholder="e.g. CEO"
                                  value={jobDraft?.title ?? ""}
                                  error={
                                    jobDraft && !jobDraft.title?.trim()
                                      ? "Title is required"
                                      : null
                                  }
                                  onChange={(e) => {
                                    markDirty("jobs");
                                    const v = e.currentTarget.value;
                                    setJobDraft((d) =>
                                      d ? { ...d, title: v } : d
                                    );
                                  }}
                                  required
                                />

                                {/* COMPANY */}
                                <TextInput
                                  label="Company"
                                  placeholder="e.g. Amazon"
                                  value={jobDraft?.company ?? ""}
                                  error={
                                    jobDraft && !jobDraft.company?.trim()
                                      ? "Company is required"
                                      : null
                                  }
                                  onChange={(e) => {
                                    markDirty("jobs");
                                    const v = e.currentTarget.value;
                                    setJobDraft((d) =>
                                      d ? { ...d, company: v } : d
                                    );
                                  }}
                                  required
                                />

                                {/* LOCATION */}
                                <TextInput
                                  label="Location (City, State)"
                                  placeholder="e.g. Los Angeles, California"
                                  value={jobDraft?.location ?? ""}
                                  error={locationError}
                                  withAsterisk
                                  required
                                  onChange={(e) => {
                                    markDirty("jobs");
                                    const v = e.currentTarget.value;
                                    setJobDraft((d) =>
                                      d ? { ...d, location: v } : d
                                    );

                                    const trimmed = v.trim();
                                    const validLocation =
                                      /^[A-Za-z .'-]+,\s?[A-Za-z .'-]+$/.test(
                                        trimmed
                                      );
                                    setLocationError(
                                      !trimmed
                                        ? "Location is required"
                                        : !validLocation
                                        ? "Please use format: City, State"
                                        : null
                                    );
                                  }}
                                  onBlur={() => {
                                    const trimmed =
                                      jobDraft?.location?.trim() || "";
                                    const validLocation =
                                      /^[A-Za-z .'-]+,\s?[A-Za-z .'-]+$/.test(
                                        trimmed
                                      );
                                    setLocationError(
                                      !trimmed
                                        ? "Location is required"
                                        : !validLocation
                                        ? "Please use format: City, State"
                                        : null
                                    );
                                  }}
                                />

                                {/* DATES */}
                                <Group>
                                  {/* START DATE */}
                                  <TextInput
                                    label="Start Date (YYYY-MM)"
                                    placeholder="2025-06"
                                    withAsterisk
                                    required
                                    value={jobDraft?.start_date ?? ""}
                                    error={startDateError}
                                    onChange={(e) => {
                                      markDirty("jobs");
                                      const raw = e.currentTarget.value;
                                      const digits = raw
                                        .replace(/\D/g, "")
                                        .slice(0, 6);
                                      const masked =
                                        digits.length > 4
                                          ? digits.slice(0, 4) +
                                            "-" +
                                            digits.slice(4)
                                          : digits;
                                      setJobDraft((d) =>
                                        d ? { ...d, start_date: masked } : d
                                      );
                                    }}
                                  />
                                  {/* END DATE */}
                                  <TextInput
                                    label="End Date"
                                    placeholder="YYYY-MM or Present"
                                    withAsterisk
                                    required
                                    value={jobDraft?.end_date ?? ""}
                                    error={endDateError}
                                    onChange={(e) => {
                                      markDirty("jobs");
                                      const raw = e.currentTarget.value;
                                      if (/^present$/i.test(raw)) {
                                        setJobDraft((d) =>
                                          d ? { ...d, end_date: "Present" } : d
                                        );
                                      }
                                      if (/[A-Za-z]/.test(raw)) {
                                        setJobDraft((d) =>
                                          d ? { ...d, end_date: raw } : d
                                        );
                                        return;
                                      }
                                      const digits = raw
                                        .replace(/\D/g, "")
                                        .slice(0, 6);
                                      const masked =
                                        digits.length > 4
                                          ? digits.slice(0, 4) +
                                            "-" +
                                            digits.slice(4)
                                          : digits;
                                      setJobDraft((d) =>
                                        d ? { ...d, end_date: masked } : d
                                      );
                                    }}
                                  />
                                  {/* Date‐order validation */}
                                  {jobDraft?.start_date &&
                                    jobDraft.end_date &&
                                    jobDraft.end_date !== "Present" && (
                                      <Text c="red" size="xs">
                                        {jobDraft.end_date < jobDraft.start_date
                                          ? "End date must be later than start date"
                                          : null}
                                      </Text>
                                    )}
                                </Group>

                                {/* ROLE SUMMARY */}
                                <Textarea
                                  label="Role Summary"
                                  placeholder="A brief summary of your role"
                                  withAsterisk
                                  autosize
                                  minRows={2}
                                  value={jobDraft?.role_summary ?? ""}
                                  error={roleSummaryError}
                                  onChange={(e) => {
                                    markDirty("jobs");
                                    const v = e.currentTarget.value;
                                    setJobDraft((d) =>
                                      d ? { ...d, role_summary: v } : d
                                    );
                                  }}
                                />

                                {/* RESPONSIBILITIES */}
                                <Title order={5}>Responsibilities</Title>
                                {hasNoneAdded && (
                                  <Text size="xs" c="red">
                                    Must have at least one responsibility or
                                    accomplishment
                                  </Text>
                                )}
                                {jobDraft?.responsibilities.map((resp, i) => (
                                  <Group key={i} align="flex-end">
                                    <Textarea
                                      autosize
                                      required
                                      withAsterisk
                                      minRows={1}
                                      value={resp}
                                      error={
                                        !resp.trim() ? "Required" : undefined
                                      }
                                      onChange={(e) => {
                                        markDirty("jobs");
                                        const v = e.currentTarget.value;
                                        setJobDraft((d) => {
                                          if (!d) return d;
                                          const arr = [...d.responsibilities];
                                          arr[i] = v;
                                          return {
                                            ...d,
                                            responsibilities: arr,
                                          };
                                        });
                                      }}
                                    />
                                    <ActionIcon
                                      color="red"
                                      onClick={() => {
                                        markDirty("jobs");
                                        setJobDraft((d) => {
                                          if (!d) return d;
                                          const arr = [...d.responsibilities];
                                          arr.splice(i, 1);
                                          return {
                                            ...d,
                                            responsibilities: arr,
                                          };
                                        });
                                      }}
                                    >
                                      <IconTrash size="1rem" />
                                    </ActionIcon>
                                  </Group>
                                ))}
                                <Button
                                  variant="subtle"
                                  size="xs"
                                  onClick={() => {
                                    markDirty("jobs");
                                    setJobDraft((d) =>
                                      d
                                        ? {
                                            ...d,
                                            responsibilities: [
                                              ...d.responsibilities,
                                              "",
                                            ],
                                          }
                                        : d
                                    );
                                  }}
                                >
                                  + Add Responsibility
                                </Button>

                                {/* ACCOMPLISHMENTS */}
                                <Title order={5}>Accomplishments</Title>
                                {hasNoneAdded && (
                                  <Text size="xs" c="red">
                                    Must have at least one responsibility or
                                    accomplishment
                                  </Text>
                                )}
                                {jobDraft?.accomplishments.map((acc, i) => (
                                  <Group key={i} align="flex-end">
                                    <Textarea
                                      autosize
                                      required
                                      withAsterisk
                                      minRows={1}
                                      value={acc}
                                      error={
                                        !acc.trim() ? "Required" : undefined
                                      }
                                      onChange={(e) => {
                                        markDirty("jobs");
                                        const v = e.currentTarget.value;
                                        setJobDraft((d) => {
                                          if (!d) return d;
                                          const arr = [...d.accomplishments];
                                          arr[i] = v;
                                          return { ...d, accomplishments: arr };
                                        });
                                      }}
                                    />
                                    <ActionIcon
                                      color="red"
                                      onClick={() =>
                                        setJobDraft((d) => {
                                          markDirty("jobs");
                                          if (!d) return d;
                                          const arr = [...d.accomplishments];
                                          arr.splice(i, 1);
                                          return { ...d, accomplishments: arr };
                                        })
                                      }
                                    >
                                      <IconTrash size="1rem" />
                                    </ActionIcon>
                                  </Group>
                                ))}
                                <Button
                                  variant="subtle"
                                  size="xs"
                                  onClick={() => {
                                    markDirty("jobs");
                                    setJobDraft((d) =>
                                      d
                                        ? {
                                            ...d,
                                            accomplishments: [
                                              ...d.accomplishments,
                                              "",
                                            ],
                                          }
                                        : d
                                    );
                                  }}
                                >
                                  + Add Accomplishment
                                </Button>

                                {/* SAVE / CANCEL */}
                                <Group mt="sm">
                                  <Button
                                    size="xs"
                                    onClick={() => saveJob(index)}
                                    disabled={isJobSaveDisabled || saving.jobs}
                                    loading={saving.jobs}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="subtle"
                                    onClick={cancelEdit}
                                  >
                                    Cancel
                                  </Button>
                                </Group>
                              </Stack>
                            </div>
                          </Collapse>
                        </SortableJobCard>
                      ))}
                    </Stack>
                  </SortableContext>
                </DndContext>

                {/* + Add Job button */}
                <Group mb="sm">
                  <Button
                    variant="light"
                    onClick={() => {
                      markDirty("jobs");

                      if (!dragDisabled) {
                        const empty: JobEntry = canonicalizeJob({});
                        setJobsState((prev) => [...prev, empty]);
                        const newIndex = jobsState.length;
                        setEditingIndex(newIndex);
                        setJobDraft(empty);

                        const trimmed = empty.location?.trim() || "";
                        const validLocation =
                          /^[A-Za-z .'-]+,\s?[A-Za-z .'-]+$/.test(trimmed);
                        setLocationError(
                          !trimmed
                            ? "Location is required"
                            : !validLocation
                            ? "Please use format: City, State"
                            : null
                        );
                      }
                    }}
                    disabled={dragDisabled}
                    style={{
                      pointerEvents: dragDisabled ? "none" : "auto",
                      opacity: dragDisabled ? 0.5 : 1,
                    }}
                  >
                    + Add Job
                  </Button>
                </Group>
              </Card>
            </Indicator>
          </Tabs.Panel>
        </div>

        {/* Education */}
        <Tabs.Panel value="education" pt="md">
          <Indicator color="red" disabled={!dirty.education} position="top-end">
            <Card
              withBorder
              mb="md"
              shadow="sm"
              style={{ position: "relative" }}
            >
              <Title order={3}>Education</Title>

              {/* Spinner overlay while saving education order */}
              {savingEduOrder && (
                <div
                  style={{
                    position: "absolute",
                    zIndex: 20,
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(255,255,255,0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Loader size="lg" color="blue" />
                </div>
              )}

              {/* Block UI when form is open and invalid */}
              {blockEduUI && (
                <div
                  style={{
                    position: "absolute",
                    zIndex: 15,
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(255,255,255,0.25)",
                  }}
                  onClick={() =>
                    notifications.show({
                      color: "red",
                      title: "Cannot Move or Edit Education",
                      message:
                        "Finish editing and fix errors before doing anything else.",
                      autoClose: 2500,
                    })
                  }
                />
              )}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleEduDragEnd}
              >
                <SortableContext
                  items={edusState.map((_, i) => i.toString())}
                  strategy={verticalListSortingStrategy}
                >
                  <Stack mt="sm">
                    {edusState.map((edu, idx) => (
                      <SortableEducationCard
                        key={idx}
                        id={idx.toString()}
                        entry={edu}
                      >
                        {/* Header: toggle edit */}
                        <UnstyledButton
                          onClick={() =>
                            editingEduIndex === idx
                              ? cancelEduEdit()
                              : toggleEduEdit(idx)
                          }
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "8px 16px",
                            cursor: "pointer",
                          }}
                        >
                          <Group>
                            <Text>
                              {edu.institution ?? "—"} — {edu.degree ?? "—"}
                            </Text>
                            <Text size="sm" c="gray">
                              {editingEduIndex === idx ? "–" : "+"}
                            </Text>
                          </Group>
                        </UnstyledButton>

                        {/* Delete button */}
                        <Tooltip label="Remove education" withArrow>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="xs"
                            radius="xl"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteEdu(idx);
                            }}
                          >
                            <IconX size="1rem" />
                          </ActionIcon>
                        </Tooltip>

                        {/* Edit form */}
                        <Collapse in={editingEduIndex === idx}>
                          <div
                            style={
                              blockEduUI
                                ? {
                                    pointerEvents: "auto",
                                    position: "relative",
                                    zIndex: 16,
                                    background: "white",
                                  }
                                : {}
                            }
                          >
                            <Stack px="md" pb="md">
                              <TextInput
                                label="Institution"
                                value={eduDraft?.institution ?? ""}
                                onChange={(e) => {
                                  markDirty("education");
                                  const val = e.currentTarget.value;
                                  setEduDraft((d) =>
                                    canonicalizeEdu(d || {}).institution !==
                                    undefined
                                      ? {
                                          ...canonicalizeEdu(d || {}),
                                          institution: val,
                                        }
                                      : null
                                  );
                                }}
                                error={
                                  eduDraft && !eduDraft.institution?.trim()
                                    ? "Institution is required"
                                    : null
                                }
                                required
                              />

                              <TextInput
                                label="Degree"
                                value={eduDraft?.degree ?? ""}
                                onChange={(e) => {
                                  markDirty("education");
                                  const val = e.currentTarget.value;
                                  setEduDraft((d) =>
                                    canonicalizeEdu(d || {}).degree !==
                                    undefined
                                      ? {
                                          ...canonicalizeEdu(d || {}),
                                          degree: val,
                                        }
                                      : null
                                  );
                                }}
                                error={
                                  eduDraft && !eduDraft.degree?.trim()
                                    ? "Degree is required"
                                    : null
                                }
                                required
                              />
                              <Group grow mt="sm">
                                {/* Start Date */}
                                <TextInput
                                  label="Start Date (YYYY-MM)"
                                  placeholder="2021-09"
                                  withAsterisk
                                  required
                                  value={eduDraft?.start_date ?? ""}
                                  error={
                                    !eduDraft?.start_date
                                      ? "Start date is required"
                                      : !/^\d{4}-\d{2}$/.test(
                                          eduDraft.start_date
                                        )
                                      ? "Use format YYYY-MM"
                                      : null
                                  }
                                  onChange={(e) => {
                                    markDirty("education");
                                    const raw = e.currentTarget.value;
                                    const digits = raw
                                      .replace(/\D/g, "")
                                      .slice(0, 6);
                                    const masked =
                                      digits.length > 4
                                        ? digits.slice(0, 4) +
                                          "-" +
                                          digits.slice(4)
                                        : digits;
                                    setEduDraft((d) =>
                                      d
                                        ? {
                                            ...canonicalizeEdu(d),
                                            start_date: masked,
                                          }
                                        : d
                                    );
                                  }}
                                />

                                <TextInput
                                  label="End Date"
                                  placeholder="YYYY-MM or Present"
                                  withAsterisk
                                  required
                                  value={eduDraft?.end_date ?? ""}
                                  error={
                                    !eduDraft?.end_date
                                      ? "End date is required"
                                      : !/^(?:\d{4}-\d{2}|Present)$/i.test(
                                          eduDraft.end_date
                                        )
                                      ? "Use YYYY-MM or exactly “Present”"
                                      : eduDraft.start_date &&
                                        eduDraft.end_date !== "Present" &&
                                        eduDraft.end_date < eduDraft.start_date
                                      ? "End date must be later than start date"
                                      : null
                                  }
                                  onChange={(e) => {
                                    markDirty("education");
                                    const raw = e.currentTarget.value;
                                    let next: string;

                                    // If they type letters at all, just keep what they type
                                    if (/[A-Za-z]/.test(raw)) {
                                      next = raw;
                                    } else {
                                      // Otherwise mask as YYYY-MM
                                      const digits = raw
                                        .replace(/\D/g, "")
                                        .slice(0, 6);
                                      next =
                                        digits.length > 4
                                          ? `${digits.slice(
                                              0,
                                              4
                                            )}-${digits.slice(4)}`
                                          : digits;
                                    }

                                    setEduDraft((d) =>
                                      d
                                        ? {
                                            ...d,
                                            end_date: next,
                                          }
                                        : d
                                    );
                                  }}
                                />
                              </Group>
                              <TextInput
                                label="GPA"
                                placeholder="e.g. 3.75"
                                value={gpaInput}
                                error={
                                  gpaInput &&
                                  !/^\d(?:\.\d{0,2})?$/.test(gpaInput)
                                    ? "Use format X.XX"
                                    : null
                                }
                                onChange={(e) => {
                                  markDirty("education");
                                  let val = e.currentTarget.value;
                                  // If they’ve typed exactly one digit (e.g. "3"), append the dot
                                  if (/^\d$/.test(val)) {
                                    val = `${val}.`;
                                  }
                                  // Only allow:
                                  //  • a single digit + a dot (“3.”)
                                  //  • or digit + dot + up to 2 decimals (“3.7”, “3.75”)
                                  if (
                                    /^\d(?:\.\d{0,2})?$/.test(val) ||
                                    val === ""
                                  ) {
                                    setGpaInput(val);
                                    // don’t update eduDraft here—wait until blur
                                  }
                                }}
                                onBlur={() => {
                                  // Once they leave the field, pad to two decimals and commit to eduDraft
                                  if (
                                    /^\d(?:\.\d{0,2})?$/.test(gpaInput) &&
                                    gpaInput !== ""
                                  ) {
                                    const [intPart, decPart = ""] =
                                      gpaInput.split(".");
                                    const padded =
                                      intPart +
                                      "." +
                                      (decPart + "00").slice(0, 2);
                                    setGpaInput(padded);
                                    setEduDraft((d) =>
                                      d ? { ...d, GPA: parseFloat(padded) } : d
                                    );
                                  }
                                }}
                              />

                              <Group mt="sm">
                                <Button
                                  size="xs"
                                  onClick={() => saveEdu(idx)}
                                  loading={saving.jobs}
                                  disabled={isEduSaveDisabled}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="xs"
                                  variant="subtle"
                                  onClick={cancelEduEdit}
                                >
                                  Cancel
                                </Button>
                              </Group>
                            </Stack>
                          </div>
                        </Collapse>
                      </SortableEducationCard>
                    ))}
                  </Stack>
                </SortableContext>
              </DndContext>

              {/* + Add Education button */}
              <Group mt="md">
                <Button
                  variant="light"
                  onClick={() => {
                    markDirty("education");

                    const blank = canonicalizeEdu({});
                    setEdusState((prev) => [...prev, blank]);
                    setEditingEduIndex(edusState.length);
                    setEduDraft(blank);
                    setGpaInput("");
                  }}
                >
                  + Add Education
                </Button>
              </Group>
            </Card>
          </Indicator>
        </Tabs.Panel>
      </Tabs>
      <Group mt="md">
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          loading={savingContinue}
        >
          Complete Resume
        </Button>
      </Group>
    </Container>
  );
}
