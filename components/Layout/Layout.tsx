import { AppShell, Burger, Group, UnstyledButton, Box, Button, Avatar, Menu } from '@mantine/core';
import { useCourseStore } from '../Search/courseStore';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/router';
import { useAuth } from '../Auth/AuthContext';
import { IconLogout, IconUser, IconHome, IconBook, IconShoppingCart, IconStar, IconMessages } from '@tabler/icons-react';
import { showAppNotification } from '../NotificationDisplay';

export function Layout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const router = useRouter();
  const { logout, isAuthenticated, avatarUrl } = useAuth();
  const { isLoading } = useCourseStore();

  const handleLogout = () => {
    logout();
    router.push('/auth');
    showAppNotification({
      title: '成功',
      message: '已成功登出！',
      c: 'green',
    });
  };

  const tabs = [
    { label: '主页', path: '/', icon: <IconHome size={18} /> },
    { label: '我的课程', path: '/my-courses', icon: <IconBook size={18} /> },
    { label: '课程市场', path: '/marketplace', icon: <IconShoppingCart size={18} /> },
    { label: '我的收藏', path: '/flashcards', icon: <IconStar size={18} /> },
    { label: '论坛', path: '/forum', icon: <IconMessages size={18} /> },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
    >
      <AppShell.Header style={{ background: 'transparent', borderBottom: '0px' }}>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" color="white" />
          <Group justify="space-between" style={{ flex: 1 }}>
            <UnstyledButton onClick={() => router.push('/')}>
              <img src="/favi3.png" alt="Logo" style={{ height: 30 }} />
            </UnstyledButton>
            <Group ml="xl" gap={0}>
              {tabs.map((tab) => (
                <UnstyledButton
                  key={tab.label}
                  onClick={() => router.push(tab.path)}
                  data-active={router.pathname === tab.path || undefined}
                  style={{
                    padding: '10px 15px',
                    borderBottom: router.pathname === tab.path ? '2px solid #845ef7' : 'none',
                    color: 'white',
                  }}
                  disabled={isLoading}
                >
                  <Group gap={5}>
                    {tab.icon}
                    {tab.label}
                  </Group>
                </UnstyledButton>
              ))}
            </Group>
            {isAuthenticated ? (
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Avatar src={avatarUrl} color="blue" radius="xl" style={{ cursor: 'pointer' }}>
                    {!avatarUrl && <IconUser size={24} />}
                  </Avatar>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconUser size={14} />} onClick={() => router.push('/profile')} disabled={isLoading}>
                    个人设置
                  </Menu.Item>
                  <Menu.Item leftSection={<IconLogout size={14} />} onClick={handleLogout} disabled={isLoading}>
                    登出
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ) : (
              <Button variant="outline" color="white" onClick={() => router.push('/auth')}>
                登录
              </Button>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main style={{ display: 'flex', justifyContent: 'center',  height: '100%' }}>
        <Box style={{ maxWidth: 1200, width: '100%', height: '100%' }}>{children}</Box>
      </AppShell.Main>
    </AppShell>
  );
}
