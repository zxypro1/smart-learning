import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/Auth/AuthContext';
import { showAppNotification } from '../components/NotificationDisplay';
import {
  Box,
  Button,
  Group,
  Loader,
  Text,
  Title,
  Accordion, // Import Accordion
} from '@mantine/core';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import rehypeMermaid from 'rehype-mermaid';
import { MarkdownHooks } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ErrorBoundary } from './course';

export default function FlashcardsPage() {
  const { isAuthenticated, token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const [favoritedContent, setFavoritedContent] = useState<any[]>([]);

  const handleDeleteFavorite = async (favoriteId: number) => {
    try {
      const response = await fetch('/api/removeFavorite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ favoriteId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '删除收藏失败。');
      }

      showAppNotification({
        title: '成功',
        message: '收藏已删除！',
        c: 'green',
      });
      setFavoritedContent((prev) => prev.filter((fav) => fav.favorite_id !== favoriteId));
    } catch (error: any) {
      console.error('Error deleting favorite:', error);
      showAppNotification({
        title: '错误',
        message: error.message || '删除收藏时发生错误。',
        c: 'red',
      });
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      showAppNotification({
        title: '错误',
        message: '需要认证。请登录。',
        c: 'red',
      });
      router.push('/auth');
      return;
    }

    const fetchFavorites = async () => {
      try {
        const favoritesRes = await fetch('/api/getFavorites', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!favoritesRes.ok) {
          throw new Error('Failed to fetch favorites');
        }
        const favoritesData = await favoritesRes.json();
        
        if (favoritesData.favorites.length === 0) {
          showAppNotification({
            title: '提示',
            message: '您还没有收藏任何内容。',
            c: 'yellow',
          });
          setLoading(false);
          return;
        }
        setFavoritedContent(favoritesData.favorites);
      } catch (error) {
        console.error('Error fetching favorites:', error);
        showAppNotification({
          title: '错误',
          message: '加载收藏内容失败。',
          c: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [isAuthenticated, token, router]);

  

  if (loading) {
    return (
      <Box p="xl" style={{ maxWidth: 800, margin: '0 auto' }}>
        <Loader />
      </Box>
    );
  }

  if (favoritedContent.length === 0) {
    return (
      <Box p="xl" style={{ maxWidth: 800, margin: '0 auto' }}>
        <Text>没有可用的收藏内容。</Text>
      </Box>
    );
  }

  return (
    <Box style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title order={2} mb="xl">我的收藏</Title>
      <Accordion variant="separated">
        {favoritedContent.map((fav) => (
          <Accordion.Item key={fav.favorite_id} value={String(fav.favorite_id)}>
            <Accordion.Control c="white">
              <Group justify="space-between">
                <Text fw={700}>{fav.course_name} - {fav.charpter_title}</Text>
                <Text size="sm" c="dimmed">收藏于: {new Date(fav.created_at).toLocaleString()}</Text>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <ErrorBoundary>
                <MarkdownHooks remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeRaw, rehypeKatex, rehypeMermaid, rehypeHighlight]}>
                  {fav.content_snippet}
                </MarkdownHooks>
              </ErrorBoundary>
              <Group mt="md">
                <Button
                  onClick={() => router.push(`/course?id=${fav.course_id}&chapter=${fav.chapter_id}`)}
                  variant="light"
                >
                  查看章节
                </Button>
                <Button
                  onClick={() => handleDeleteFavorite(fav.favorite_id)}
                  color="red"
                  variant="light"
                >
                  删除
                </Button>
              </Group>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Box>
  );
}
