import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Title, Text, Button, Loader, Paper, Group, MultiSelect, Badge } from '@mantine/core';
import { useAuth } from '../components/Auth/AuthContext';
import { showAppNotification } from '../components/NotificationDisplay';

interface PublicCourse {
  id: number;
  name: string;
  author_name: string;
  description: string;
  tags: string[];
  copy_count: number;
}

export default function MarketplacePage() {
  const [publicCourses, setPublicCourses] = useState<PublicCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyingCourseId, setCopyingCourseId] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // New state for selected tags
  const [availableTags, setAvailableTags] = useState<string[]>([]); // New state for all unique tags
  const { isAuthenticated, token } = useAuth();
  const router = useRouter();

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

    const fetchPublicCourses = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (selectedTags.length > 0) {
          queryParams.append('tags', selectedTags.join(','));
        }
        const response = await fetch(`/api/getPublicCourses?${queryParams.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.status === 401 || response.status === 403) {
          showAppNotification({
            title: '错误',
            message: '需要认证或会话已过期。请重新登录。',
            c: 'red',
          });
          router.push('/auth');
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '获取公共课程失败。');
        }

        const data = await response.json();
        setPublicCourses(data.courses);

        // Extract all unique tags from fetched courses
        const allTags = new Set<string>();
        (data.courses || []).forEach((course: any) => {
          if (course.tags && Array.isArray(course.tags)) {
            course.tags.forEach((tag: string) => allTags.add(tag));
          }
        });
        setAvailableTags(Array.from(allTags));

      } catch (error: any) {
        console.error('Failed to fetch public courses:', error);
        showAppNotification({
          title: '错误',
          message: error.message || '网络错误或服务器无法访问。获取公共课程失败。',
          c: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPublicCourses();
  }, [isAuthenticated, token, router, selectedTags]);

  const handleCopyCourse = async (courseId: number) => {
    if (!isAuthenticated) {return};

    setCopyingCourseId(courseId);
    try {
      const response = await fetch('/api/copyCourse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ courseId }),
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
      router.push(`/course?id=${  data.newCourseId}`); // Redirect to the new course
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
    return <Box p="xl" style={{ maxWidth: 1200, margin: '0 auto' }}><Loader /></Box>;
  }

  return (
    <Box style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Group justify="space-between" mb="md">
        <Title order={1}>公共课程市场</Title>
        <Button onClick={() => router.push('/')}>返回我的课程</Button>
      </Group>
      <MultiSelect
        data={availableTags}
        placeholder="按标签筛选课程"
        searchable
        clearable
        value={selectedTags}
        onChange={setSelectedTags}
        mb="lg"
        styles={{
          input: { backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.2)' },
          label: { color: '#fff' },
          // option: { color: '#fff',
          //   '&[data-checked]': { backgroundColor: '#845ef7' },
          //   '&:hover': { backgroundColor: '#845ef7' } },
          // dropdown: { backgroundColor: '#232526' },
          pill: { backgroundColor: '#845ef7', color: '#fff' },
        }}
      />

      {publicCourses.length === 0 ? (
        <Text>目前没有可用的公共课程。</Text>
      ) : (
        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridGap: '24px',
            gridAutoRows: 'minmax(min-content, max-content)',
            alignItems: 'stretch',
          }}
        >
          {publicCourses.map((course) => (
            <Paper
              key={course.id}
              shadow="xs"
              p="md"
              withBorder
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' }}
              onClick={() => router.push(`/public-course-detail?id=${course.id}`)}
            >
              <div style={{ flexGrow: 1 }}>
                <Group justify="space-between" align="center" wrap="nowrap" mb="xs">
                  <Box style={{ flexGrow: 1 }}>
                    <Title order={3} style={{ marginBottom: '4px' }}>{course.name}</Title>
                    <Text c="dimmed" size="sm">作者: {course.author_name}</Text>
                    <Text c="dimmed" size="sm">复制次数: {course.copy_count}</Text>
                  </Box>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent navigating to detail page
                      handleCopyCourse(course.id);
                    }}
                    loading={copyingCourseId === course.id}
                    disabled={copyingCourseId !== null}
                    size="xs"
                  >
                    复制
                  </Button>
                </Group>
                {course.description && <Text c="dimmed" size="sm" style={{ marginBottom: '8px' }}>{course.description}</Text>}
              </div>
              <div>
                <Group gap={4} mt="xs">
                  {course.tags && Array.isArray(course.tags) && course.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline" color="grape" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </Group>
              </div>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}
