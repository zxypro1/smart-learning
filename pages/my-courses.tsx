import { Box, Card, Text, Title, Loader, ActionIcon, Modal, Group, Button, TextInput, Paper, MultiSelect, Badge, Progress } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { IconTrash, IconEdit } from '@tabler/icons-react';
import { showAppNotification } from '../components/NotificationDisplay';
import { useAuth } from '../components/Auth/AuthContext';

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number|null>(null);
  const [deleteName, setDeleteName] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isPublishingId, setIsPublishingId] = useState<number | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [editedCourseName, setEditedCourseName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [hoveredCourseId, setHoveredCourseId] = useState<number | null>(null);
  const router = useRouter();
  const { isAuthenticated, token, logout } = useAuth();

  const handleImportCourse = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {return};

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/importCourse', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '导入课程失败。');
      }

      await res.json();
      showAppNotification({
        title: '成功',
        message: '课程已成功导入！',
        c: 'green',
      });
      fetchCourses(); // Refresh courses after import
    } catch (error: any) {
      console.error('Failed to import course:', error);
      showAppNotification({
        title: '错误',
        message: error.message || '导入课程失败。',
        c: 'red',
      });
    }
  };

  const fetchCourses = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedTags.length > 0) {
        queryParams.append('tags', selectedTags.join(','));
      }
      const res = await fetch(`/api/getCourses?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.status === 401 || res.status === 403) {
        showAppNotification({
          title: '错误',
          message: '需要认证或会话已过期。请重新登录。',
          c: 'red',
        });
        logout();
        router.push('/auth');
        return;
      }
      if (!res.ok) {
        const errorData = await res.json();
        showAppNotification({
          title: '错误',
          message: errorData.error || '获取课程失败。',
          c: 'red',
        });
        return;
      }
      const data = await res.json();
      setCourses(data.courses || []);

      const allTags = new Set<string>();
      (data.courses || []).forEach((course: any) => {
        if (course.tags && Array.isArray(course.tags)) {
          course.tags.forEach((tag: string) => allTags.add(tag));
        }
      });
      setAvailableTags(Array.from(allTags));

      // showAppNotification({
      //   title: '成功',
      //   message: '课程加载成功！',
      //   c: 'green',
      // });
    } catch (e: any) {
      setCourses([]);
      showAppNotification({
        title: '错误',
        message: e.message || '网络错误或服务器无法访问',
        c: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    fetchCourses();
  }, [isAuthenticated, token, router, selectedTags]);

  const handleDelete = async () => {
    if (!deleteId || !token) {return};
    try {
      const res = await fetch(`/api/getCourses?id=${deleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.status === 401 || res.status === 403) {
        showAppNotification({
          title: '错误',
          message: '需要认证或会话已过期。请重新登录。',
          c: 'red',
        });
        logout();
        router.push('/auth');
        return;
      }
      if (res.ok) {
        setModalOpen(false);
        setDeleteId(null);
        setDeleteName('');
        fetchCourses();
        showAppNotification({
          c: 'green',
          message: '删除成功',
        });
      } else {
        const errorData = await res.json();
        showAppNotification({
          title: 'Error',
          message: errorData.error || '删除失败',
          c: 'red',
        });
      }
    } catch (e: any) {
      showAppNotification({
        title: 'Error',
        message: e.message || '网络错误或服务器无法访问',
        c: 'red',
      });
    }
  };

  const handlePublishToggle = async (courseId: number, isPublic: boolean) => {
    if (!token) {return};
    setIsPublishingId(courseId);
    try {
      const res = await fetch('/api/publishCourse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ courseId, isPublic }),
      });

      if (res.status === 401 || res.status === 403) {
        showAppNotification({
          title: '错误',
          message: '需要认证或会话已过期。请重新登录。',
          c: 'red',
        });
        logout();
        router.push('/auth');
        return;
      }

      if (res.ok) {
        showAppNotification({
          title: '成功',
          message: `课程已成功${isPublic ? '发布' : '取消发布'}！`,
          c: 'green',
        });
        fetchCourses();
      } else {
        const errorData = await res.json();
        showAppNotification({
          title: '错误',
          message: errorData.error || `发布课程失败。`,
          c: 'red',
        });
      }
    } catch (e: any) {
      showAppNotification({
        title: 'Error',
        message: e.message || '网络错误或服务器无法访问',
        c: 'red',
      });
    } finally {
      setIsPublishingId(null);
    }
  };

  const handleSaveName = async (courseId: number, newName: string) => {
    if (!token) {return};
    if (newName.trim() === '') {
      showAppNotification({
        title: '错误',
        message: '课程名称不能为空。',
        c: 'red',
      });
      return;
    }
    if (newName === courses.find(c => c.id === courseId)?.name) {
      setEditingCourseId(null);
      return;
    }

    try {
      const res = await fetch('/api/updateCourseName', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ courseId, newName }),
      });

      if (res.status === 401 || res.status === 403) {
        showAppNotification({
          title: '错误',
          message: '需要认证或会话已过期。请重新登录。',
          c: 'red',
        });
        logout();
        router.push('/auth');
        return;
      }

      if (res.ok) {
        showAppNotification({
        title: '成功',
        message: '课程名称更新成功！',
        c: 'green',
      });
        fetchCourses();
      } else {
        const errorData = await res.json();
        showAppNotification({
          title: '错误',
          message: errorData.error || '更新课程名称失败。',
          c: 'red',
        });
      }
    } catch (e: any) {
      showAppNotification({
        title: '错误',
        message: e.message || '网络错误或服务器无法访问',
        c: 'red',
      });
    } finally {
      setEditingCourseId(null);
    }
  };

  return (
    <Box style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 64px 16px' }}>
      <Title order={2} style={{ fontWeight: 800, fontSize: 32, marginBottom: 16, textAlign: 'left', letterSpacing: -1, color: '#fff' }}>我的课程</Title>
      <Group mb="md">
        <Button component="label" variant="outline">
          导入课程
          <input type="file" hidden onChange={handleImportCourse} accept=".json" />
        </Button>
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
      {loading ? (
        <Loader />
      ) : (
        courses.length === 0 ? (
          <Paper p="xl" shadow="xs" withBorder style={{ background: 'rgba(40,40,60,0.85)', color: '#fff', textAlign: 'center' }}>
            <Title order={3} mb="md">你还没有创建任何课程。</Title>
            <Text mb="lg">你可以通过生成框创建新课程，或者从公共课程市场复制现有课程。</Text>
            <Button onClick={() => router.push('/marketplace')}>前往公共课程市场</Button>
          </Paper>
        ) : (
          <Box
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gridGap: '24px',
              gridAutoRows: 'minmax(min-content, max-content)',
              alignItems: 'stretch',
            }}
          >
            {courses.map((course: any, _) => (
              <Card
                  key={course.id}
                  shadow="md"
                  padding="xl"
                  radius="md"
                  withBorder
                  onClick={() => router.push(`/course?id=${course.id}`)}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px) scale(1.03)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px 0 rgba(80,80,180,0.18)'; setHoveredCourseId(course.id); }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 32px 0 rgba(80,80,180,0.10)'; setHoveredCourseId(null); }}
                  style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                >
                  <div style={{ flexGrow: 1 }}>
                    {hoveredCourseId === course.id && (
                      <Group style={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}>
                        <ActionIcon
                          color="gray"
                          variant="light"
                          style={{ background: 'rgba(255,255,255,0.7)' }}
                          onClick={e => {
                            e.stopPropagation();
                            setEditingCourseId(course.id);
                            setEditedCourseName(course.name);
                          }}
                        >
                          <IconEdit size={20} />
                        </ActionIcon>
                        <ActionIcon
                          color="red"
                          variant="light"
                          style={{ background: 'rgba(255,255,255,0.7)' }}
                          onClick={e => {
                            e.stopPropagation();
                            setDeleteId(course.id);
                            setDeleteName(course.name);
                            setModalOpen(true);
                          }}
                        >
                          <IconTrash size={20} />
                        </ActionIcon>
                        {course.original_course_id === null && (
                          <Button
                            size="xs"
                            variant={course.is_public ? 'filled' : 'outline'}
                            color={course.is_public ? 'green' : 'blue'}
                            loading={isPublishingId === course.id}
                            onClick={e => {
                              e.stopPropagation();
                              handlePublishToggle(course.id, !course.is_public);
                            }}
                          >
                            {course.is_public ? '已发布' : '发布'}
                          </Button>
                        )}
                      </Group>)}
                      {editingCourseId === course.id ? (
                        <TextInput
                          value={editedCourseName}
                          onChange={(event) => setEditedCourseName(event.currentTarget.value)}
                          onBlur={() => handleSaveName(course.id, editedCourseName)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              handleSaveName(course.id, editedCourseName);
                            }
                          }}
                          autoFocus
                          variant="filled"
                          size="xl"
                          style={{ marginBottom: 8 }}
                        />
                      ) : (
                        <Text
                          fw={800}
                          size="xl"
                          style={{ marginBottom: 8, textAlign: 'left', letterSpacing: -0.5 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCourseId(course.id);
                            setEditedCourseName(course.name);
                          }}
                        >
                          {course.name}
                        </Text>
                      )}
                      {course.description && <Text c="dimmed" size="sm" style={{ textAlign: 'left', marginBottom: 8 }}>{course.description}</Text>}
                  </div>
                  <div>
                    <Group gap={4} mt="xs">
                      {course.tags && Array.isArray(course.tags) && course.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" color="grape" size="sm">
                          {tag}
                        </Badge>
                      ))}
                    </Group>
                    
                    {course.average_score !== null && (
                      <Text size="sm" style={{ textAlign: 'left', marginTop: 8 }}>
                      平均分: <Text span fw={700}>{parseFloat(course.average_score).toFixed(2)}</Text>
                    </Text>
                    )}
                    {course.passed !== null && (
                      <Text size="sm" style={{ textAlign: 'left' }}>
                        状态: <Text span fw={700} c={course.passed ? 'green' : 'red'}>
                          {course.passed ? '通过' : '未通过'}
                        </Text>
                      </Text>
                    )}
                    {course.total_chapters > 0 && (
                      <Box mt={8}>
                        <Text size="sm" mb={4}>学习进度 ({course.completed_chapters}/{course.total_chapters})</Text>
                        <Progress
                          value={((course.completed_chapters / course.total_chapters) * 100)}
                          animated
                          size="md"
                          radius="xl"
                          color="grape"
                        />
                      </Box>
                    )}
                  </div>
                </Card>
              ))}
            </Box>
          )
        )}
        <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="删除课程" centered>
          <Text>确定要删除课程“{deleteName}”吗？此操作不可恢复。</Text>
          <Group mt="md" justify="flex-end" gap="md">
            <Button variant="outline" color="gray" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button color="red" onClick={handleDelete}>
              删除
            </Button>
          </Group>
        </Modal>
      </Box>
  );
}
