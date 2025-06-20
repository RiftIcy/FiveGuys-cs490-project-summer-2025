import { useState, useEffect } from 'react';
import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname  } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  IconDashboard,
  IconFileText,
  IconHistory,
  IconFolder,
  IconAdjustments,
  Icon2fa,
  IconBellRinging,
  IconClipboard,
  IconClipboardCheckFilled,
  IconClipboardData,
  IconClipboardList,
  IconDatabaseImport,
  IconFile,
  IconFileCheck,
  IconFingerprint,
  IconHome,
  IconKey,
  IconLogout,
  IconReceipt2,
  IconSettings,
  IconSwitchHorizontal,
  IconBriefcase,
  IconSpeakerphone 
} from '@tabler/icons-react';
import { Code, Group } from '@mantine/core';
import { MantineLogo } from '@mantinex/mantine-logo';
import classes from '@/styles/sidePanel.module.css';
import { ClipboardCheckIcon } from 'lucide-react';

interface SidePanelProps {
  hidden?: boolean;
}

interface MenuItem {
  link: string;
  label: string;
  icon: React.FC<any>;
  disabled?: boolean;
}

export default function SidePanel({ hidden }: SidePanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState('Main');

  // define the menu items in the desired order
  const menuItems: MenuItem[] = [
    { link: '/home/', label: 'Main', icon: IconHome },
    { link: '/home/resume_builder', label: 'Start New', icon: IconFileText  },
    { link: '/home/drafts', label: 'My Drafts', icon: IconFolder  },
    { link: "/home/completed_forms", label: "Completed Forms", icon: IconFileCheck },
    {link: "/home/job_posting", label: "Job Posting", icon: IconBriefcase},
    {link: "/home/job_ads", label: "Job Ads", icon: IconSpeakerphone},
    { link: "/home/completed_resumes", label: "Completed Resumes", icon: IconClipboardCheckFilled },
    { link: '/home/settings', label: 'Settings', icon: IconSettings },
  ] as const;

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signOut(auth);
      router.push('/'); // or wherever your landing page is
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  

return (
    <nav className={classes.navbar} style={{ display: hidden ? "none" : undefined }}>
      <div className={classes.navbarMain}>
        <Group className={classes.header} justify="space-between">
          <Code fw={700} />
        </Group>

        {menuItems.map(({ link, label, icon: Icon, disabled }) => (
          <Link
            key={label}
            href={disabled ? "#" : link}
            className={classes.link}
            data-active={label === active || undefined}
            onClick={(e) => {
              if (disabled) {
                e.preventDefault();
                return;
              }
              setActive(label);
            }}
            style={disabled ? { pointerEvents: "none", opacity: 0.5 } : {}}
          >
            <Icon className={classes.linkIcon} stroke={1.5} />
            <span>{label}</span>
          </Link>
        ))}
      </div>

      <div className={classes.footer}>
        <a href="#" className={classes.link} onClick={handleLogout}>
          <IconLogout className={classes.linkIcon} stroke={1.5} />
          <span>Logout</span>
        </a>
      </div>
    </nav>
  );
}