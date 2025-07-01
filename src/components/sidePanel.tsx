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
import { Group, Transition } from '@mantine/core';
import classes from '@/styles/sidePanel.module.css';
import { ClipboardCheckIcon, UploadIcon } from 'lucide-react';
import Image from 'next/image';

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
  const [active, setActive] = useState('Main');

  // define the menu items in the desired order
  const menuItems: MenuItem[] = [
    { link: '/home/', label: 'Main', icon: IconHome },
    { link: '/home/resume_builder', label: 'Start New', icon: IconFileText  },
    { link: '/home/database', label: 'My Collection', icon: IconDatabaseImport },
    { link: '/home/drafts', label: 'My Drafts', icon: IconFolder  },
    { link: "/home/completed_forms", label: "Completed Forms", icon: IconFileCheck },
    {link: "/home/job_posting", label: "Job Posting", icon: IconBriefcase},
    {link: "/home/job_ads", label: "Job Ads", icon: IconSpeakerphone},
    { link: "/home/completed_resumes", label: "Completed Resumes", icon: IconClipboardCheckFilled },
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
    <Transition mounted={!hidden} transition="slide-right" duration={300} timingFunction="ease">
      {(styles) => (
        <nav className={classes.navbar} style={styles}>
          <div className={classes.navbarMain}>
            <Group className={classes.header} justify="space-between">
              <div style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center',
                paddingLeft: '12px', // Match the padding of menu items
                marginBottom: 16,
                marginTop: 8
              }}>
                <Image 
                  src="/logoonly.png" 
                  alt="Resume Fox Logo" 
                  width={50} 
                  height={50} 
                  style={{ 
                    display: 'block',
                    marginRight: '12px' // Match the spacing of icons to text
                  }} 
                />
                <span style={{ fontWeight: 600, fontSize: '14px' }}></span>
              </div>
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
        <Link href="/home/settings" className={classes.link}>
          <IconSettings className={classes.linkIcon} stroke={1.5} />
          <span>Settings</span>
        </Link>
        <a href="#" className={classes.link} onClick={handleLogout}>
          <IconLogout className={classes.linkIcon} stroke={1.5} />
          <span>Logout</span>
        </a>
      </div>
    </nav>
      )}
    </Transition>
  );
}