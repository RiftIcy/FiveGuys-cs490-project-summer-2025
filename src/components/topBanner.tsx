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
} from "@mantine/core";
import Image from "next/image";

interface TopBannerProps {
  toggleSidePanel: () => void;
}

export default function TopBanner({ toggleSidePanel }: TopBannerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const user = auth.currentUser;

  const getInitials = (name?: string | null) => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "";
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(user?.displayName);

  const pageTitles: Record<string, string> = {
    "/home": "Home",
    "/home/settings": "Settings",
    "/home/resume_builder": "Upload",
    "/home/database": "Collection",
    "/home/drafts": "Drafts",
    "/home/completed_forms": "Completed Forms",
    "/home/job_posting": "Job Posting",
    "/home/job_ads": "Job Ads",
  };

  const pageTitle =
    pageTitles[pathname] || (pathname.startsWith("/home/resume_editor") ? "Resume Editor" : "Page");

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const theme = useMantineTheme();

  return (
    <Box
      component="header"
      style={{
        height: rem(60),
        padding: theme.spacing.md,
        borderBottom: `1px solid ${theme.colors.gray[2]}`,
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
          color={theme.colors.gray[6]}
        />
        <Title order={4}>{pageTitle}</Title>
      </Group>

      {/* Replace Five Guys text with logo */}
      <Image src="/fulllogo.png" alt="Resume Fox Logo" width={140} height={40} style={{ display: 'block' }} />

      <Group align="center">
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
