import { useEffect, useState } from 'react';
import Link from 'next/link'; // Import Link
import { useRouter } from 'next/router';
import { MarkdownHooks } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useAuth } from '../../components/Auth/AuthContext';
import { showAppNotification } from '../../components/NotificationDisplay';
import { ErrorBoundary } from '../course';

export default function ForumPage() {
  const { isAuthenticated, token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

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

    const fetchPosts = async () => {
      try {
        const res = await fetch('/api/forum/posts', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch posts');
        }
        const data = await res.json();
        setPosts(data);
      } catch (error) {
        console.error('Error fetching posts:', error);
        showAppNotification({
          title: '错误',
          message: '加载论坛帖子失败。',
          c: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [isAuthenticated, token, router]);

  const handleSubmitPost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      showAppNotification({
        title: '提示',
        message: '标题和内容不能为空。',
        c: 'yellow',
      });
      return;
    }

    setIsSubmittingPost(true);
    try {
      const res = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newPostTitle,
          content: newPostContent,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create post');
      }

      const newPost = await res.json();
      setPosts((prevPosts) => [newPost, ...prevPosts]);
      setNewPostTitle('');
      setNewPostContent('');
      showAppNotification({
        title: '成功',
        message: '帖子发布成功！',
        c: 'green',
      });
    } catch (error: any) {
      console.error('Error submitting post:', error);
      showAppNotification({
        title: '错误',
        message: error.message || '发布帖子失败。',
        c: 'red',
      });
    } finally {
      setIsSubmittingPost(false);
    }
  };

  if (loading) {
    return (
      <Box p="xl" style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Loader />
      </Box>
    );
  }

  return (
    <Box p="xl" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Title order={2} mb="xl">
        论坛
      </Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder mb="xl">
        <Title order={3} mb="md">
          创建新帖子
        </Title>
        <Stack>
          <TextInput
            label="标题"
            placeholder="帖子标题"
            value={newPostTitle}
            onChange={(event) => setNewPostTitle(event.currentTarget.value)}
          />
          <Textarea
            label="内容"
            placeholder="帖子内容"
            autosize
            minRows={4}
            value={newPostContent}
            onChange={(event) => setNewPostContent(event.currentTarget.value)}
          />
          <Button onClick={handleSubmitPost} loading={isSubmittingPost}>
            发布帖子
          </Button>
        </Stack>
      </Card>

      <Title order={3} mb="md">
        最新帖子
      </Title>
      {posts.length === 0 ? (
        <Text>目前还没有帖子。快来发布第一个帖子吧！</Text>
      ) : (
        <Stack>
          {posts.map((post) => (
            <Link key={post.id} href={`/forum/${post.id}`} passHref>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between" mb="xs">
                  <Group>
                    <Text fw={700} size="lg">
                      {post.title}
                    </Text>
                    {post.is_pinned && (
                      <Badge color="blue" variant="filled">
                        置顶
                      </Badge>
                    )}
                  </Group>
                  <Text size="sm" c="dimmed">
                    作者: {post.username}
                  </Text>
                </Group>
                <ErrorBoundary>
                  <MarkdownHooks
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
                  >
                    {post.content}
                  </MarkdownHooks>
                </ErrorBoundary>

                <Text size="xs" c="dimmed" mt="xs">
                  发布于: {new Date(post.created_at).toLocaleString()}
                </Text>
              </Card>
            </Link>
          ))}
        </Stack>
      )}
    </Box>
  );
}
