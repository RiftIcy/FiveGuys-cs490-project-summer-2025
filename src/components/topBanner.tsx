import { useState } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import {
  Group,
  Burger,
  Title,
  Avatar,
  Menu,
  UnstyledButton,
  rem,
  useMantineTheme,
  Box,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { IconSun, IconMoon, IconMoon2, IconStars, IconSparkles, IconMoonStars } from "@tabler/icons-react";
import { useTheme } from "@/context/themeContext";
import Image from "next/image";

interface TopBannerProps {
  toggleSidePanel: () => void;
}

export default function TopBanner({ toggleSidePanel }: TopBannerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { theme: currentTheme, setTheme } = useTheme();

  const user = auth.currentUser;

  const getInitials = (name?: string | null) => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "";
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(user?.displayName);

  // Theme cycling logic
  const themeOrder = ["light", "dark", "night-sky"] as const;
  const getNextTheme = () => {
    const currentIndex = themeOrder.indexOf(currentTheme as any);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    return themeOrder[nextIndex];
  };

  // Icon mapping for themes
  const getThemeIcon = () => {
    switch (currentTheme) {
      case "light":
        return <IconSun size={18} />;
      case "dark":
        return <IconMoon size={18} />;
      case "night-sky":
        return <IconMoonStars size={18} />;
      default:
        return <IconSun size={18} />;
    }
  };

  const getThemeLabel = () => {
    switch (currentTheme) {
      case "light":
        return "Light Theme";
      case "dark":
        return "Dark Theme";
      case "night-sky":
        return "Night Sky Theme";
      default:
        return "Toggle Theme";
    }
  };

  const pageTitles: Record<string, string> = {
    "/home": "Home",
    "/home/settings": "Settings",
    "/home/resume_builder": "Upload",
    "/home/database": "Collection",
    "/home/drafts": "Drafts",
    "/home/completed_forms": "Completed Forms",
    "/home/job_posting": "Job Posting",
    "/home/job_ads": "Job Ads",
    "/home/completed_resumes": "Job Applications",
  };

  const pageTitle =
    pageTitles[pathname] || 
    (pathname.startsWith("/home/resume_editor") ? "Resume Editor" : 
     pathname.startsWith("/home/job_ads/") ? "Job Details" :
     pathname.startsWith("/home/completed_resumes/") && pathname.includes("/format") ? "Resume Format" :
     pathname.startsWith("/home/completed_resumes/") ? "Resume Details" :
     "Page");

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const mantineTheme = useMantineTheme();

  return (
    <Box
      component="header"
      style={{
        height: rem(60),
        padding: mantineTheme.spacing.md,
        borderBottom: `1px solid ${mantineTheme.colors.gray[2]}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Group align="center">
        <Burger
          opened={false}
          onClick={toggleSidePanel}
          size="sm"
          color={mantineTheme.colors.gray[6]}
        />
        <Title order={4}>{pageTitle}</Title>
      </Group>

      {/* Replace Five Guys text with logo */}
      <Image src="/fulllogo.png" alt="Resume Fox Logo" width={140} height={40} style={{ display: 'block' }} />

      <Group align="center">
        {/* Theme Toggle Button */}
        <Tooltip label={getThemeLabel()} position="bottom">
          <ActionIcon
            onClick={() => setTheme(getNextTheme())}
            variant="subtle"
            size="lg"
            radius="md"
            aria-label="Toggle theme"
          >
            {getThemeIcon()}
          </ActionIcon>
        </Tooltip>

        <Menu withArrow withinPortal position="bottom-end">
          <Menu.Target>
            <UnstyledButton>
              <Avatar color="blue" radius="xl">
                {initials || "?"}
              </Avatar>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item onClick={() => router.push("/home/settings")}>Settings</Menu.Item>
            <Menu.Item color="red" onClick={handleLogout}>Logout</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Box>
  );
}
