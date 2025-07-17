import React, { useState } from 'react';
import { TextInput, Button, Paper, Title, Text, Anchor } from '@mantine/core';
import { useAuth } from './AuthContext';
import { showAppNotification } from '../NotificationDisplay';

interface LoginFormProps {
  onRegisterClick: () => void;
  onLoginSuccess: () => void;
}

export function LoginForm({ onRegisterClick, onLoginSuccess }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    if (honeypot) {
      // Bot detected
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.token, data.aiModel, data.aiApiKey, data.avatarUrl, data.aiProvider);
        showAppNotification({
          title: '成功',
          message: '登录成功！',
          c: 'green',
        });
        onLoginSuccess();
      } else {
        showAppNotification({
          title: '错误',
          message: data.error || '登录失败',
          c: 'red',
        });
      }
    } catch (error) {
      showAppNotification({
        title: '错误',
        message: '网络错误或服务器无法访问',
        c: 'red',
      });
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper withBorder shadow="md" p={30} radius="md">
      <Title order={2} ta="center" mt="md" mb={30} c="white">
        欢迎回来！
      </Title>
      <form onSubmit={handleSubmit}>
        <TextInput
          label="用户名"
          placeholder="你的用户名"
          value={username}
          onChange={(event) => setUsername(event.currentTarget.value)}
          required
        />
        <TextInput
          label="密码"
          placeholder="你的密码"
          type="password"
          mt="md"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          required
        />
        {/* Honeypot field */}
        <TextInput
          style={{ display: 'none' }}
          aria-hidden="true"
          value={honeypot}
          onChange={(event) => setHoneypot(event.currentTarget.value)}
          tabIndex={-1}
        />
        <Button fullWidth mt="xl" type="submit" loading={loading}>
          登录
        </Button>
      </form>
      <Text ta="center" mt="md" c="white">
        还没有账号？{' '}
        <Anchor<'a'> onClick={onRegisterClick} fw={700} c="grape.5">
          注册
        </Anchor>
      </Text>
    </Paper>
  );
}
