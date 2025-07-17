import { useState, useEffect, useRef } from 'react';
import { Box, Button, Group, Loader, Paper, Stack, Text, Accordion, Badge, Select, NumberInput, Textarea } from '@mantine/core';

import { useRouter } from 'next/router';
import { useCourseStore, useCourseStore as courseStore } from './courseStore';
import { useAuth } from '../../components/Auth/AuthContext';
import { showAppNotification } from '../NotificationDisplay';

export function SearchInput() {
  const [searchQuery, setSearchQuery] = useState('');
  const [chapterCount, setChapterCount] = useState<number | ''>(5);
  const [difficulty, setDifficulty] = useState<string | null>('初级');
  const setCourseData = useCourseStore((state: any) => state.setCourseData);
  const courseData = useCourseStore((state: any) => state.courseData);
  const isLoading = useCourseStore((state: any) => state.isLoading);
  const setIsLoading = useCourseStore((state: any) => state.setIsLoading);
  const router = useRouter();
  const { token, aiModel, userAiModels, isAuthenticated } = useAuth();
  const [selectedModel, setSelectedModel] = useState<string | null>(aiModel);
  const [modelOptions, setModelOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [hasConfiguredModels, setHasConfiguredModels] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Set default to free trial model if no user-configured AI model exists
    setSelectedModel(aiModel || 'deepseek-chat-free-trial');
    // Check if there's a default model or any custom models
    setHasConfiguredModels(isAuthenticated && (!!aiModel || userAiModels.length > 0 || true)); // Always allow if free trial is available
  }, [aiModel, userAiModels, isAuthenticated]);

  useEffect(() => {
    const options = userAiModels.map(model => ({
      value: String(model.id), // Use model ID as value
      label: `${model.model_name} (${model.provider})`,
    }));
    setModelOptions([
      { value: 'deepseek-chat-free-trial', label: '免费试用' },
      { value: 'auto', label: '默认模型' },
      ...options,
    ]);
  }, [userAiModels]);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      showAppNotification({
        title: '操作已取消',
        message: '课程生成已停止。',
        c: 'yellow',
      });
      // Reset states after stopping generation
      setSearchQuery('');
      setChapterCount(5); // Reset to default
      setDifficulty('初级'); // Reset to default
      setCourseData([]); // Clear course data
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!isAuthenticated) {
      showAppNotification({
        title: '错误',
        message: '请登录后使用课程生成功能。',
        c: 'red',
      });
      router.push('/auth');
      return;
    }

    if (!searchQuery.trim()) {
      return;
    }

    setIsLoading(true);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const outlineRes = await fetch('/api/generateCourseOutline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          searchQuery,
          selectedModelId: selectedModel,
          chapterCount,
          difficulty,
        }),
        signal,
      });
      const outlineData = await outlineRes.json();
      if (!outlineRes.ok) {
        throw new Error(outlineData.error || '生成课程大纲失败');
      }
      const parsedResponse = JSON.parse(outlineData.outline);

      if (!parsedResponse.chapters || !Array.isArray(parsedResponse.chapters)) {
        throw new Error('AI返回的课程大纲不是一个有效的JSON数组。');
      }

      const courseName = parsedResponse.courseName || searchQuery;
      const courseDescription = parsedResponse.description || '';
      const courseTags = parsedResponse.tags || [];
      const selectedModelLabel = modelOptions.find(option => option.value === selectedModel)?.label;
      const finalCourseTags = selectedModelLabel ? [...courseTags, `${selectedModelLabel}`] : courseTags;
      const outline = parsedResponse.chapters;

      // 先初始化 courseData，所有章节 content 为空，并设置状态为 pending
      setCourseData((outline as any[]).map((item: any) => ({ ...item, content: '', status: 'pending' })));

      const generatedChapters: any[] = []; // 用于存储已生成章节的内容，作为后续章节的上下文

      // Function to generate a single chapter content
      const generateChapterContent = async (chapterItem: any) => {
        if (signal.aborted) { throw new Error('Aborted'); }

        const originalIndex = outline.findIndex((o: any) => o.charpter === chapterItem.charpter);
        if (originalIndex === -1) { throw new Error('Chapter not found in original outline.'); }

        // Set status to 'generating' for the current chapter
        const updatedGenerating = [...courseStore.getState().courseData];
        updatedGenerating[originalIndex] = { ...updatedGenerating[originalIndex], status: 'generating' };
        setCourseData(updatedGenerating);

        // Build course context for the current chapter
        const previousChaptersForContext = (chapterItem.type === 1 || chapterItem.type === 2)
          ? generatedChapters.map(ch => ({ charpter: ch.charpter, charpter_title: ch.charpter_title, content: ch.content }))
          : [];

        const courseContext = {
          courseName,
          courseDescription,
          courseTags: finalCourseTags,
          previousChapters: previousChaptersForContext,
        };

        let content = '';
        const response = await fetch('/api/generateChapterContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ chapterInfo: chapterItem, selectedModelId: selectedModel, courseContext }),
          signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to generate chapter content for chapter ${chapterItem.charpter_title}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get reader from response body');
        }

        while (true) {
          if (signal.aborted) {
            reader.cancel();
            throw new Error('Aborted');
          }
          const { done, value } = await reader.read();
          if (done) { break; }
          const chunk = new TextDecoder().decode(value);
          content += chunk;
          // Stream update to UI
          const updatedStream = [...courseStore.getState().courseData];
          updatedStream[originalIndex] = { ...updatedStream[originalIndex], content };
          setCourseData(updatedStream);
        }

        // Set status to 'completed'
        const finalUpdated = [...courseStore.getState().courseData];
        finalUpdated[originalIndex] = { ...finalUpdated[originalIndex], content, status: 'completed' };
        setCourseData(finalUpdated);

        return finalUpdated[originalIndex]; // Return the completed chapter data
      };

      // Separate chapters into independent (type 0) and dependent (type 1, 2)
      const independentChapters = outline.filter((ch: any) => ch.type === 0);
      const dependentChapters = outline.filter((ch: any) => ch.type === 1 || ch.type === 2);

      // 1. Generate independent chapters in parallel
      const independentGenerationPromises = independentChapters.map(generateChapterContent);
      const completedIndependentChapters = await Promise.all(independentGenerationPromises);
      generatedChapters.push(...completedIndependentChapters);

      // 2. Generate dependent chapters sequentially
      for (const chapterItem of dependentChapters) {
        const completedChapter = await generateChapterContent(chapterItem);
        generatedChapters.push(completedChapter);
      }

      // Ensure courseData is fully updated and sorted by charpter for saving
      const finalCourseDataForSave = [...courseStore.getState().courseData].sort((a, b) => a.charpter - b.charpter);

      // 保存到数据库并跳转
      if (!token) {
        throw new Error('User not authenticated. Please log in to save courses.');
      }

      if (signal.aborted) { return; }

      const saveRes = await fetch('/api/saveCourse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ courseName, description: courseDescription, tags: finalCourseTags, chapters: finalCourseDataForSave })
      });
      const saveData = await saveRes.json();
      if (saveRes.ok && saveData.courseId) {
        router.push(`/course?id=${saveData.courseId}`);
        setCourseData([]); // Clear course data after successful save and redirection
      } else {
        throw new Error(saveData.error || '保存课程失败');
      }

      
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message === 'Aborted') {
        console.log('Fetch aborted by user.');
      } else {
        console.error('获取AI回复时出错:', error);
        showAppNotification({
          title: '错误',
          message: error.message || '生成课程时发生未知错误。',
          c: 'red',
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const exampleTags = [
    '机器学习',
    'Web开发',
    '英国文学',
    '人工智能导论',
    '数据结构',
    '操作系统',
    '深度学习',
    'C++基础',
    '经济学原理',
    '世界历史',
    '生物学',
    '心理学',
    '艺术鉴赏',
    '哲学概论',
    '市场营销',
    '法律基础',
    '营养学',
    '音乐理论',
    '体育科学',
  ];

  return (
    <Box p="xl" style={{ maxWidth: '800px', margin: '0 auto', marginTop: '0' }}>
      <Stack gap="xl">
        <Paper shadow="md" p="md" withBorder>
          <Stack gap="md">
            <Group align="flex-end">
              <Textarea
                style={{ flex: '0 0 75%' }}
                placeholder="我想学习现代天体物理学"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                disabled={isLoading || !hasConfiguredModels}
                minRows={1}
                autosize
              />
              {isLoading ? (
                <Button onClick={handleStopGeneration} color="red" style={{ flex: '0 0 20%' }}>
                  停止生成
                </Button>
              ) : (
                <Button onClick={handleSearch} disabled={!searchQuery.trim() || !hasConfiguredModels} style={{ flex: '0 0 20%' }}>
                  生成
                </Button>
              )}
            </Group>
            <Group grow>
              <NumberInput
                label="章节数"
                value={chapterCount}
                onChange={(value) => {
                  if (typeof value === 'number' || value === '') {
                    setChapterCount(value);
                  }
                }}
                min={3}
                max={20}
                disabled={isLoading || !hasConfiguredModels}
                variant="filled"
              />
              <Select
                label="难度"
                placeholder="选择难度"
                data={['初级', '中级', '高级']}
                value={difficulty}
                onChange={setDifficulty}
                disabled={isLoading || !hasConfiguredModels}
              />
              <Select
                label="AI模型"
                placeholder="选择AI模型"
                data={modelOptions}
                value={selectedModel}
                onChange={setSelectedModel}
                disabled={isLoading || !hasConfiguredModels}
              />
            </Group>
          </Stack>
          {!hasConfiguredModels && (
            <Text c="red" size="sm" mt="xs" ta="center">
              请前往个人设置页配置AI模型和API密钥，才能使用AI生成课程功能。
            </Text>
          )}
          {isLoading && (
            <Text c="yellow" size="sm" mt="xs" ta="center">
              在生成期间，请保持在此页面
            </Text>
          )}
          <Group mt="xs" gap="xs">
            {exampleTags.map((tag) => (
              <Badge
                key={tag}
                variant="light"
                color="grape"
                style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 500 }}
                onClick={() => !isLoading && hasConfiguredModels && setSearchQuery(`我想学习${tag}`)}
                data-disabled={isLoading || !hasConfiguredModels || undefined}
              >
                我想学习{tag}
              </Badge>
            ))}
          </Group>
        </Paper>
        {/* 进度条与章节内容展示（折叠栏样式） */}
        {isLoading && (
          <Paper p="lg" withBorder shadow="sm">
            <Text fw={600} size="lg" mb="md" c="white">内容生成进度</Text>
            <Accordion variant="separated" multiple>
              {courseData.length === 0 ? (
                <Accordion.Item value="loading-outline">
                  <Accordion.Control c="white">正在生成课程大纲...</Accordion.Control>
                  <Accordion.Panel>
                    <Group align="center" gap="xs">
                      <Loader size="xs" />
                      <Text c="dimmed">请稍候...</Text>
                    </Group>
                  </Accordion.Panel>
                </Accordion.Item>
              ) : (
                courseData?.map((item: any, idx: number) => (
                  <Accordion.Item key={idx} value={`chapter-${idx}`}>
                    <Accordion.Control>
                      <Group align="center" gap="xs">
                        <Text>第{idx + 1}章：{item.charpter_title}</Text>
                        <Text c="dimmed" size="sm">{item.type === 1 ? '习题' : item.type === 2 ? '考试' : '教学'}</Text>
                        {item.status === 'completed'
                          ? <Text c="green">已完成</Text>
                          : item.status === 'generating'
                          ? <><Loader size="xs" /><Text c="dimmed">生成中...</Text></>
                          : <Text c="dimmed">等待生成...</Text>
                        }
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Text size="sm" mt="xs" style={{ whiteSpace: 'pre-wrap' }}>
                        {item.content ? item.content : '内容生成中...'}
                      </Text>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))
              )}
            </Accordion>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}
