import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { MarkdownHooks } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeMermaid from 'rehype-mermaid';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { Badge, Box, Button, Group, Loader, Paper, Stepper, Text, Title } from '@mantine/core';
import { useAuth } from '../components/Auth/AuthContext';
import { showAppNotification } from '../components/NotificationDisplay';
import { ErrorBoundary } from './course';

export default function PublicCourseDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [active, setActive] = useState(0);
  const [course, setCourse] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyingCourseId, setCopyingCourseId] = useState<number | null>(null);
  const { isAuthenticated, token } = useAuth();

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
      return;
    }
    setLoading(true);

    fetch(`/api/getPublicCourseDetail?id=${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          showAppNotification({
            title: '错误',
            message: '需要认证或会话已过期。请重新登录。',
            c: 'red',
          });
          router.push('/auth');
          // eslint-disable-next-line prefer-promise-reject-errors
          return Promise.reject('Authentication failed');
        }
        if (!res.ok) {
          const errorData = await res.json();
          showAppNotification({
            title: '错误',
            message: errorData.error || '加载公共课程详情失败。',
            c: 'red',
          });
          return Promise.reject(errorData.error || '加载公共课程详情失败。');
        }
        return res.json();
      })
      .then((data) => {
        setCourse(data.course);
        setChapters(data.chapters || []);
        // showAppNotification({
        //   title: '成功',
        //   message: '公共课程详情加载成功！',
        //   c: 'green',
        // });
      })
      .catch((error) => {
        console.error('Failed to fetch public course details:', error);
        showAppNotification({
          title: '错误',
          message: '网络错误或服务器无法访问。获取公共课程详情失败。',
          c: 'red',
        });
      })
      .finally(() => setLoading(false));
  }, [id, isAuthenticated, token, router]);

  const handleCopyCourse = async () => {
    if (!isAuthenticated || !course) {
      return;
    }

    setCopyingCourseId(course.id);
    try {
      const response = await fetch('/api/copyCourse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ courseId: course.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '复制课程失败。');
      }

      const data = await response.json();
      showAppNotification({
        title: '成功',
        message: '课程已成功复制到您的课程列表！',
        c: 'green',
      });
      router.push(`/course?id=${data.newCourseId}`); // Redirect to the new course
    } catch (error: any) {
      console.error('Failed to copy course:', error);
      showAppNotification({
        title: '错误',
        message: error.message || '复制课程失败。',
        c: 'red',
      });
    } finally {
      setCopyingCourseId(null);
    }
  };

  if (loading) {
    return (
      <Box p="xl" style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Loader />
      </Box>
    );
  }

  if (!course) {
    return <Text>未找到该公共课程</Text>;
  }

  if (!Array.isArray(chapters) || chapters.length === 0) {
    return <Text>该公共课程暂无章节</Text>;
  }

  const current = chapters[active];

  return (
    <Box style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Group justify="space-between" mb="md">
        <Title order={2}>
          {course.name} (作者: {course.author_name})
        </Title>
        {course.description && (
          <Text c="dimmed" size="sm">
            {course.description}
          </Text>
        )}
        {course.tags && Array.isArray(course.tags) && (
          <Group gap={4} mt="xs">
            {course.tags.map((tag: string) => (
              <Badge key={tag} variant="outline" color="grape" size="sm">
                {tag}
              </Badge>
            ))}
          </Group>
        )}
        <Group>
          <Button variant="outline" onClick={() => router.push('/marketplace')}>
            返回公共课程市场
          </Button>
          <Button
            onClick={handleCopyCourse}
            loading={copyingCourseId === course.id}
            disabled={copyingCourseId !== null}
          >
            复制到我的课程
          </Button>
        </Group>
      </Group>
      <Stepper
        active={active}
        onStepClick={setActive}
        styles={{
          root: { background: 'transparent' },
          stepIcon: { background: '#232526', color: '#fff', border: '2px solid #845ef7' },
          step: { color: '#fff' },
          stepLabel: { color: '#fff' },
          separator: { borderColor: '#845ef7' },
        }}
      >
        {chapters.map((item: any, idx: number) => (
          <Stepper.Step key={idx} label={item.charpter_title} />
        ))}
      </Stepper>
      <Group align="flex-start" mt="xl" gap="xl">
        <Paper
          style={{
            width: '70%',
            minHeight: 400,
            padding: 24,
            background: 'rgba(40,40,60,0.85)',
            color: '#fff',
            wordBreak: 'break-word',
          }}
        >
          <ErrorBoundary>
            <MarkdownHooks
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeRaw, rehypeMermaid, rehypeKatex, rehypeHighlight]}
            >
              {current.content}
            </MarkdownHooks>
          </ErrorBoundary>
        </Paper>
        <Paper
          style={{
            flex: 1,
            minHeight: 400,
            padding: 24,
            background: 'rgba(40,40,60,0.85)',
            color: '#fff',
          }}
        >
          <Text c="dimmed">本课程为公共课程，无法直接在此处进行习题或考试。</Text>
          <Text c="dimmed">请复制到您的课程后进行学习和练习。</Text>
        </Paper>
      </Group>
    </Box>
  );
}
