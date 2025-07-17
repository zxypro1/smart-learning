import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { MarkdownHooks } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeMermaid from 'rehype-mermaid';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Loader,
  Paper,
  Select,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useAuth } from '../components/Auth/AuthContext';
import { showAppNotification } from '../components/NotificationDisplay';
import { ErrorBoundary } from './course';

export default function CourseStudioPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, token } = useAuth();

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // States for editing course metadata
  const [editedCourseName, setEditedCourseName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // States for editing chapters
  const [editedChapters, setEditedChapters] = useState<any[]>([]);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0); // To manage which chapter is being edited

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

    setLoading(true);

    const fetchCourseDetails = async () => {
      try {
        const res = await fetch(`/api/getCourseDetail?id=${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401 || res.status === 403) {
          showAppNotification({
            title: '错误',
            message: '需要认证或会话已过期。请重新登录。',
            c: 'red',
          });
          router.push('/auth');
          return;
        }
        if (!res.ok) {
          const errorData = await res.json();
          showAppNotification({
            title: '错误',
            message: errorData.error || '加载课程详情失败。',
            c: 'red',
          });
          return;
        }
        const data = await res.json();
        setCourse(data.course);
        setEditedChapters(JSON.parse(JSON.stringify(data.chapters || [])));
        setEditedCourseName(data.course.name);
        setEditedDescription(data.course.description || '');
        setEditedTags(data.course.tags || []);
      } catch (error) {
        console.error('Failed to fetch course details:', error);
        showAppNotification({
          title: '错误',
          message: '网络错误或服务器无法访问。',
          c: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    const fetchAllTags = async () => {
      try {
        const res = await fetch('/api/getAllTags', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          console.error('Failed to fetch all tags');
          return;
        }
        const data = await res.json();
        setAvailableTags(data.tags);
      } catch (error) {
        console.error('Error fetching all tags:', error);
      }
    };

    fetchCourseDetails();
    fetchAllTags();
  }, [id, isAuthenticated, token, router]);

  const handleSaveCourse = async () => {
    if (!id) {
      return;
    }
    try {
      const response = await fetch('/api/updateCourse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: course.id,
          name: editedCourseName,
          description: editedDescription,
          tags: editedTags,
          chapters: editedChapters,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新课程失败。');
      }

      showAppNotification({
        title: '成功',
        message: '课程信息已更新！',
        c: 'green',
      });
      router.push(`/course?id=${id}`); // Go back to course view
    } catch (error: any) {
      console.error('Error saving course:', error);
      showAppNotification({
        title: '错误',
        message: error.message || '保存课程时发生错误。',
        c: 'red',
      });
    }
  };

  const handleAddChapter = () => {
    const newChapter = {
      charpter:
        editedChapters.length > 0 ? Math.max(...editedChapters.map((c: any) => c.charpter)) + 1 : 1,
      charpter_title: '新章节',
      content: '新章节内容',
      type: 0, // Default to regular teaching chapter
    };
    setEditedChapters([...editedChapters, newChapter]);
    setActiveChapterIndex(editedChapters.length); // Select the new chapter
  };

  const handleRemoveChapter = (indexToRemove: number) => {
    const updatedChapters = editedChapters.filter((_, index) => index !== indexToRemove);
    // Re-index chapters to maintain sequential order
    const reindexedChapters = updatedChapters.map((chapter: any, idx: number) => ({
      ...chapter,
      charpter: idx + 1,
    }));
    setEditedChapters(reindexedChapters);
    if (activeChapterIndex >= reindexedChapters.length && reindexedChapters.length > 0) {
      setActiveChapterIndex(reindexedChapters.length - 1);
    } else if (reindexedChapters.length === 0) {
      setActiveChapterIndex(0);
    }
  };

  const handleChapterChange = (index: number, field: string, value: any) => {
    const updatedChapters = [...editedChapters];
    updatedChapters[index] = { ...updatedChapters[index], [field]: value };
    setEditedChapters(updatedChapters);
  };

  if (loading) {
    return (
      <Box p="xl" style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Loader />
      </Box>
    );
  }

  if (!course) {
    return <Text>未找到该课程</Text>;
  }

  const currentChapter = editedChapters[activeChapterIndex];

  return (
    <Box style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
      <Group justify="space-between" mb="md">
        <Title order={2}>编辑课程: {course.name}</Title>
        <Button onClick={handleSaveCourse}>保存课程</Button>
      </Group>

      <Paper p="md" mb="xl" withBorder>
        <Title order={3} mb="md">
          课程信息
        </Title>
        <TextInput
          label="课程名称"
          value={editedCourseName}
          onChange={(event) => setEditedCourseName(event.currentTarget.value)}
          mb="xs"
        />
        <Textarea
          label="课程描述"
          value={editedDescription}
          onChange={(event) => setEditedDescription(event.currentTarget.value)}
          autosize
          minRows={2}
          mb="xs"
        />
        <TagsInput
          label="标签"
          data={availableTags}
          placeholder="选择或创建标签"
          value={editedTags}
          onChange={setEditedTags}
          mb="xs"
        />
      </Paper>

      <Paper p="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>章节内容</Title>
          <Button leftSection={<IconPlus size={14} />} onClick={handleAddChapter}>
            添加章节
          </Button>
        </Group>

        {editedChapters.length === 0 ? (
          <Text c="dimmed">该课程暂无章节。请添加新章节。</Text>
        ) : (
          <Group align="flex-start" grow>
            <Box style={{ flex: 1 }}>
              {editedChapters.map((chapter: any, index: number) => (
                <Paper
                  key={chapter.charpter}
                  p="xs"
                  mb="xs"
                  withBorder
                  style={{
                    cursor: 'pointer',
                    backgroundColor:
                      index === activeChapterIndex ? 'rgba(132, 94, 247, 0.2)' : 'transparent',
                  }}
                  onClick={() => setActiveChapterIndex(index)}
                >
                  <Group justify="space-between">
                    <Text>
                      {chapter.charpter}. {chapter.charpter_title}
                    </Text>
                    <ActionIcon
                      color="red"
                      variant="light"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveChapter(index);
                      }}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Paper>
              ))}
            </Box>

            <Box style={{ flex: 2 }}>
              {currentChapter && (
                <Paper p="md" withBorder>
                  <TextInput
                    label="章节标题"
                    value={currentChapter.charpter_title}
                    onChange={(event) =>
                      handleChapterChange(
                        activeChapterIndex,
                        'charpter_title',
                        event.currentTarget.value
                      )
                    }
                    mb="xs"
                  />
                  <Textarea
                    label="章节内容"
                    value={currentChapter.content}
                    onChange={(event) =>
                      handleChapterChange(activeChapterIndex, 'content', event.currentTarget.value)
                    }
                    autosize
                    minRows={10}
                    mb="xs"
                  />
                  <Select
                    label="章节类型"
                    placeholder="选择章节类型"
                    data={[
                      { value: '0', label: '普通章节' },
                      { value: '1', label: '习题' },
                      { value: '2', label: '考试' },
                    ]}
                    value={String(currentChapter.type)}
                    onChange={(value) =>
                      handleChapterChange(activeChapterIndex, 'type', Number(value))
                    }
                    mb="xs"
                  />
                  <Title order={4} mt="md">
                    内容预览
                  </Title>
                  <Box
                    style={{
                      border: '1px solid #eee',
                      padding: '10px',
                      borderRadius: '4px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                    }}
                  >
                    <ErrorBoundary>
                      <MarkdownHooks
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeRaw, rehypeMermaid, rehypeKatex, rehypeHighlight]}
                      >
                        {currentChapter.content}
                      </MarkdownHooks>
                    </ErrorBoundary>
                  </Box>
                </Paper>
              )}
            </Box>
          </Group>
        )}
      </Paper>
    </Box>
  );
}
