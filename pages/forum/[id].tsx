import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { MarkdownHooks } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { Box, Button, Card, Group, Loader, Stack, Text, Textarea, Title } from '@mantine/core';
import { useAuth } from '../../components/Auth/AuthContext';
import { showAppNotification } from '../../components/NotificationDisplay';
import { ErrorBoundary } from '../course';

export default function ForumPostPage() {
  const { isAuthenticated, token } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const isValidId = typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id); // Validate `id` format
  if (!isValidId) {
    showAppNotification({
      title: '错误',
      message: '无效的帖子 ID。',
      c: 'red',
    });
    setLoading(false);
    return;
  }
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<any>(null);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

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

    if (!id) {
      setLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/forum/posts/${encodeURIComponent(id)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            showAppNotification({
              title: '错误',
              message: '需要认证或会话已过期。请重新登录。',
              c: 'red',
            });
            router.push('/auth');
            return;
          }
          throw new Error('Failed to fetch post');
        }
        const data = await res.json();
        setPost(data);
      } catch (error) {
        console.error('Error fetching post:', error);
        showAppNotification({
          title: '错误',
          message: '加载帖子失败。',
          c: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id, isAuthenticated, token, router]);

  const handleSubmitComment = async () => {
    if (!newCommentContent.trim()) {
      showAppNotification({
        title: '提示',
        message: '评论内容不能为空。',
        c: 'yellow',
      });
      return;
    }

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/forum/posts/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newCommentContent,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add comment');
      }

      const newComment = await res.json();
      setPost((prevPost: any) => ({
        ...prevPost,
        comments: [...(prevPost.comments || []), newComment],
      }));
      setNewCommentContent('');
      showAppNotification({
        title: '成功',
        message: '评论发布成功！',
        c: 'green',
      });
    } catch (error: any) {
      console.error('Error submitting comment:', error);
      showAppNotification({
        title: '错误',
        message: error.message || '发布评论失败。',
        c: 'red',
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <Box p="xl" style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Loader />
      </Box>
    );
  }

  if (!post) {
    return (
      <Box p="xl" style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Text>帖子未找到。</Text>
      </Box>
    );
  }

  return (
    <Box p="xl" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Title order={2} mb="md">
        {post.title}
      </Title>
      <Text size="sm" c="dimmed">
        作者: {post.username} | 发布于: {new Date(post.created_at).toLocaleString()}
      </Text>
      <Card shadow="sm" padding="lg" radius="md" withBorder mt="md" mb="xl">
        <ErrorBoundary>
          <MarkdownHooks
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
          >
            {post.content}
          </MarkdownHooks>
        </ErrorBoundary>
      </Card>

      <Title order={3} mb="md">
        评论
      </Title>
      {post.comments && post.comments.length > 0 ? (
        <Stack mb="xl">
          {post.comments.map((comment: any) => (
            <Card key={comment.id} shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text fw={700}>{comment.username}</Text>
                <Text size="xs" c="dimmed">
                  {new Date(comment.created_at).toLocaleString()}
                </Text>
              </Group>
              <ErrorBoundary>
                <MarkdownHooks
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
                >
                  {comment.content}
                </MarkdownHooks>
              </ErrorBoundary>
            </Card>
          ))}
        </Stack>
      ) : (
        <Text mb="xl">目前还没有评论。快来发表第一条评论吧！</Text>
      )}

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">
          添加评论
        </Title>
        <Stack>
          <Textarea
            placeholder="输入你的评论..."
            autosize
            minRows={3}
            value={newCommentContent}
            onChange={(event) => setNewCommentContent(event.currentTarget.value)}
          />
          <Button onClick={handleSubmitComment} loading={isSubmittingComment}>
            发表评论
          </Button>
        </Stack>
      </Card>
    </Box>
  );
}
