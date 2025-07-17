import React, { ErrorInfo, ReactNode, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import ReactMarkdown, { MarkdownHooks } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeMermaid from 'rehype-mermaid';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import {
  ActionIcon,
  Badge,
  Box,
  Burger,
  Button,
  Drawer,
  Group,
  Loader,
  Paper,
  Select,
  Stepper,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAuth } from '../components/Auth/AuthContext'; // Import useAuth
import { showAppNotification } from '../components/NotificationDisplay';

interface ErrorBoundaryProps {
  children: ReactNode; // 明确指定 children 类型
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true, error: _ };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Mermaid 渲染错误:', error, errorInfo);
    
  }

  render() {
    return this.state.hasError ? (
      <div style={{
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        width: '100%',
      }}>
        Markdown渲染失败，请在编辑修改
        <div>
          错误信息：{ this.state.error ? this.state.error.message : '未知错误' }
        </div>
      </div>
    ) : (
      this.props.children
    ); // 现在可以安全访问 children
  }
}

export default function CoursePage() {
  const router = useRouter();
  const { id } = router.query;
  const [active, setActive] = useState(0);
  const [course, setCourse] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, token } = useAuth(); // Get auth state and token
  const [userAnswer, setUserAnswer] = useState('');
  const [scoreFeedback, setScoreFeedback] = useState<string | null>(null);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [availableAiModels, setAvailableAiModels] = useState<any[]>([]);
  const [selectedAiModelId, setSelectedAiModelId] = useState<string | null>(
    'deepseek-chat-free-trial'
  ); // 'auto' for default
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [passStatus, setPassStatus] = useState<boolean | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const abortControllerRefChat = useRef<AbortController | null>(null); // New AbortController for chat

  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Debounce function
  const debounce = (func: (...args: any[]) => void, delay: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  useEffect(() => {
    if (!isAuthenticated) {
      showAppNotification({
        title: '错误',
        message: '需要认证。请登录。',
        c: 'red',
      });
      router.push('/auth'); // Redirect to login if not authenticated
      return;
    }

    setLoading(true); // Set loading to true at the beginning of the effect

    if (!id) {
      setLoading(false); // If no ID, we are done loading, but there's no course to display
      return;
    }

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
        setChapters(data.chapters || []);

        // Set active chapter based on lastCompletedChapterId
        if (data.lastCompletedChapterId && data.chapters) {
          const lastCompletedIndex = data.chapters.findIndex(
            (ch: any) => ch.id === data.lastCompletedChapterId
          );
          if (lastCompletedIndex !== -1 && lastCompletedIndex < data.chapters.length - 1) {
            setActive(lastCompletedIndex); // Jump to the next chapter after the last completed one
          } else if (lastCompletedIndex === data.chapters.length - 1) {
            setActive(lastCompletedIndex); // If last chapter completed, stay on it
          }
        }

        // Fetch user quiz answers
        const quizAnswersRes = await fetch(`/api/getUserQuizAnswers?courseId=${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!quizAnswersRes.ok) {
          console.error('Failed to fetch user quiz answers');
          // Continue without quiz answers if fetch fails
        }
        const quizAnswersData = await quizAnswersRes.json();
        const userQuizAnswers = quizAnswersData.quizAnswers || [];

        // Calculate average score based on all quiz/exam chapters
        const allQuizExamChapters = (data.chapters || []).filter(
          (ch: any) => ch.type === 1 || ch.type === 2
        );

        if (allQuizExamChapters.length > 0) {
          let totalScore = 0;
          // Sum scores from userQuizAnswers for relevant chapters
          userQuizAnswers.forEach((answer: any) => {
            if (answer.score !== null) {
              totalScore += answer.score;
            }
          });

          const avgScore = totalScore / allQuizExamChapters.length;
          setAverageScore(avgScore);
          setPassStatus(avgScore >= 60);
        } else {
          setAverageScore(null);
          setPassStatus(null);
        }
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

    const fetchUserAiModels = async () => {
      try {
        const res = await fetch('/api/userAiModels', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          console.error('Failed to fetch user AI models');
          return;
        }
        const data = await res.json();
        setAvailableAiModels(
          data.models.map((model: any) => ({
            value: `${model.id}`,
            label: `${model.provider} - ${model.model_name}`,
          }))
        );
      } catch (error) {
        console.error('Error fetching user AI models:', error);
      }
    };
    fetchUserAiModels();
    fetchCourseDetails();
  }, [id, isAuthenticated, token, router]);

  useEffect(() => {
    if (id && chapters.length > 0) {
      const currentChapter = chapters[active];
      if (currentChapter) {
        fetch('/api/updateUserProgress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ courseId: id, chapterId: currentChapter.id }),
        });
      }
    }
  }, [active, chapters, id, token]);

  const handleExportCourse = async (format: 'json' | 'markdown' | 'pdf') => {
    if (!id) {
      return;
    }
    setIsExporting(true); // Set loading state to true
    try {
      const res = await fetch(`/api/exportCourse?id=${id}&format=${format}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '导出失败');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const contentDisposition = res.headers.get('content-disposition');
      let fileName = `course.${format}`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?"?([^"\n]*)"?/i);
        if (fileNameMatch && fileNameMatch.length > 1) {
          try {
            fileName = decodeURIComponent(fileNameMatch[1]);
          } catch (e) {
            fileName = fileNameMatch[1];
          }
        }
      }
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showAppNotification({
        title: '成功',
        message: `课程已成功导出为 ${format.toUpperCase()}！`,
        c: 'green',
      });
    } catch (error: any) {
      console.error('Failed to export course:', error);
      showAppNotification({
        title: '错误',
        message: error.message || '导出课程失败。',
        c: 'red',
      });
    } finally {
      setIsExporting(false); // Set loading state to false
    }
  };

  const handleAddFavorite = async () => {
    if (!course || !current) {
      showAppNotification({
        title: '错误',
        message: '课程或章节信息缺失。',
        c: 'red',
      });
      return;
    }

    try {
      const response = await fetch('/api/addFavorite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId: course.id,
          chapterId: current.id,
          contentSnippet: current.content ? current.content.substring(0, 200) : '(无内容)', // Save first 200 chars as snippet, or a placeholder if empty
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '添加收藏失败。');
      }

      const data = await response.json();
      showAppNotification({
        title: '成功',
        message: data.message,
        c: 'green',
      });
    } catch (error: any) {
      console.error('Error adding favorite:', error);
      showAppNotification({
        title: '错误',
        message: error.message || '添加收藏时发生错误。',
        c: 'red',
      });
    }
  };

  const handleStopScoring = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      showAppNotification({
        title: '操作已取消',
        message: '答案评分已停止。',
        c: 'yellow',
      });
    }
  };

  const handleStopChat = () => {
    if (abortControllerRefChat.current) {
      abortControllerRefChat.current.abort();
      showAppNotification({
        title: '操作已取消',
        message: 'AI 问答已停止。',
        c: 'yellow',
      });
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) {
      showAppNotification({
        title: '提示',
        message: '请输入你的问题。',
        c: 'yellow',
      });
      return;
    }

    setIsSendingChatMessage(true);
    const userMessage = { role: 'user', content: chatInput };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');

    abortControllerRefChat.current = new AbortController();
    const signal = abortControllerRefChat.current.signal;

    try {
      const response = await fetch('/api/chatWithCourse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId: course.id,
          chapterContent: current.content,
          userQuestion: chatInput,
          selectedModelId: selectedAiModelId,
        }),
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '发送消息失败。');
      }

      const data = await response.json();
      const aiMessage = { role: 'assistant', content: data.reply };
      setChatMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Chat aborted by user.');
      } else {
        console.error('Error sending chat message:', error);
        showAppNotification({
          title: '错误',
          message: error.message || '发送消息时发生错误。',
          c: 'red',
        });
        setChatMessages((prev) => prev.slice(0, prev.length - 1)); // Remove user message if AI fails
      }
    } finally {
      setIsSendingChatMessage(false);
      abortControllerRefChat.current = null;
    }
  };

  // Function to save draft answer
  const saveDraft = async (answer: string) => {
    if (!course || !current || !token || !answer.trim()) {
      return;
    }

    try {
      await fetch('/api/saveDraftAnswer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId: course.id,
          chapterId: current.id,
          draftAnswer: answer,
        }),
      });
      console.log('Draft saved successfully.');
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  // Debounced version of saveDraft
  const debouncedSaveDraft = debounce(saveDraft, 1000); // Save every 1 second after user stops typing
  const current = chapters[active];
  // Load draft answer when chapter changes
  useEffect(() => {
    const loadDraft = async () => {
      if (course && current && token) {
        try {
          const res = await fetch(
            `/api/getDraftAnswer?courseId=${course.id}&chapterId=${current.id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            setUserAnswer(data.draftAnswer || ''); // Also set userAnswer for display
          } else {
            setUserAnswer('');
          }
        } catch (error) {
          console.error('Failed to load draft:', error);
          setUserAnswer('');
        }
      }
    };
    loadDraft();
  }, [course, current, token]);

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) {
      showAppNotification({
        title: '提示',
        message: '请输入你的答案。',
        c: 'yellow',
      });
      return;
    }

    setIsSubmittingAnswer(true);
    setScoreFeedback(null);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const response = await fetch('/api/scoreAnswer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chapterContent: current.content,
          userAnswer,
          chapterType: current.type,
          courseId: course.id, // Add courseId
          charpter: current.charpter, // Add charpter
          selectedModelId: selectedAiModelId, // Pass selected AI model ID
        }),
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '提交答案失败。');
      }

      const data = await response.json();
      setScoreFeedback(data.feedback);

      // Save quiz answer
      fetch('/api/saveQuizAnswer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId: course.id,
          chapterId: current.id,
          question: current.content, // Assuming the chapter content is the question
          answer: userAnswer,
          score: data.score,
          feedback: data.feedback,
        }),
      });

      // Update chapter score in local state and recalculate average
      setChapters((prevChapters) => {
        const updatedChapters = prevChapters.map((ch) =>
          ch.charpter === current.charpter ? { ...ch, score: data.score } : ch
        );
        const scoredChapters = updatedChapters.filter((ch: any) => ch.type === 1 || ch.type === 2);
        if (scoredChapters.length > 0) {
          const totalScore = scoredChapters.reduce(
            (sum: number, ch: any) => sum + (ch.score || 0),
            0
          );
          const avgScore = totalScore / scoredChapters.length;
          setAverageScore(avgScore);
          setPassStatus(avgScore >= 60);
        } else {
          setAverageScore(null);
          setPassStatus(null);
        }
        return updatedChapters;
      });
      showAppNotification({
        title: '成功',
        message: '答案已提交并评分。',
        c: 'green',
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Scoring aborted by user.');
      } else {
        console.error('Error submitting answer:', error);
        showAppNotification({
          title: '错误',
          message: error.message || '提交答案时发生错误。',
          c: 'red',
        });
      }
    } finally {
      setIsSubmittingAnswer(false);
      abortControllerRef.current = null;
    }
  };

  const handlePreviousChapter = () => {
    if (active > 0) {
      setActive((current) => current - 1);
    } else {
      showAppNotification({
        title: '提示',
        message: '已经是第一章了！',
        c: 'blue',
      });
    }
  };

  const handleNextChapter = () => {
    if (active < chapters.length - 1) {
      setActive((current) => current + 1);
    } else {
      showAppNotification({
        title: '提示',
        message: '已经是最后一章了！',
        c: 'blue',
      });
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
    return <Text>未找到该课程</Text>;
  }

  if (!Array.isArray(chapters) || chapters.length === 0) {
    return <Text>该课程暂无章节</Text>;
  }

  return (
    <Box style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
      <ActionIcon
        variant="transparent"
        size="lg"
        onClick={openDrawer}
        aria-label="Toggle navigation"
        style={{ position: 'fixed', top: '50%', left: 20, transform: 'translateY(-50%)' }}
      >
        <Burger opened={drawerOpened} color="white" />
      </ActionIcon>
      <Group justify="flex-start" mb="md">
        <Title order={2}>{course.name}</Title>
        {averageScore !== null && (
          <Text size="lg" ml="xl">
            平均分: {averageScore.toFixed(2)}
            <Badge color={passStatus ? 'green' : 'red'} ml="sm">
              {passStatus ? '通过' : '未通过'}
            </Badge>
          </Text>
        )}
      </Group>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        position="left"
        size="md"
        styles={{
          header: {
            background: 'transparent',
            color: 'white',
          },
          title: {
            color: 'white',
          },
          close: {
            color: 'white',
          },
        }}
      >
        <Group dir="column" align="flex-start" gap="md">
          <Title order={3}>{course.name}</Title>
          {course.description && (
            <Text size="sm" c="dimmed">
              {course.description}
            </Text>
          )}
          {course.tags && course.tags.length > 0 && (
            <Group gap="xs" mt="xs">
              {course.tags.map((tag: string) => (
                <Badge key={tag} variant="filled">
                  {tag}
                </Badge>
              ))}
            </Group>
          )}
          <Button onClick={() => router.push(`/course-studio?id=${id}`)}>编辑课程</Button>
          <Button variant="outline" onClick={() => handleExportCourse('json')} loading={isExporting}>
            导出为 JSON
          </Button>
          <Button variant="outline" onClick={() => handleExportCourse('markdown')} loading={isExporting}>
            导出为 Markdown
          </Button>
          

          <Stepper active={active} onStepClick={setActive} orientation="vertical" mt="md">
            {chapters.map((item: any, idx: number) => (
              <Stepper.Step key={idx} label={item.charpter_title} />
            ))}
          </Stepper>
        </Group>
      </Drawer>

      <Group align="flex-start" mt="xl" gap="xl">
        <Paper style={{ width: '70%', minHeight: 400, padding: 24, wordBreak: 'break-word' }}>
          <ErrorBoundary>
            <MarkdownHooks
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeMermaid, rehypeRaw, rehypeKatex, rehypeHighlight]}
            >
              {current.content}
            </MarkdownHooks>
          </ErrorBoundary>
          <Button onClick={handleAddFavorite} variant="outline" mt="md">
            收藏本章节
          </Button>
        </Paper>
        <Paper
          style={{
            flex: 1,
            minHeight: 400,
            padding: 24,
            position: 'sticky',
            top: 60,
            right: 20,
            alignSelf: 'flex-start',
            maxHeight: 'calc(100vh - 80px)',
            overflowY: 'auto',
          }}
        >
          {current.type === 1 || current.type === 2 ? (
            <Box>
              <Text fw={600} mb="md">
                {current.type === 1 ? '习题回答' : '考试回答'}
              </Text>
              <Textarea
                placeholder="在此输入你的答案..."
                value={userAnswer}
                onChange={(event) => {
                  setUserAnswer(event.currentTarget.value);
                  debouncedSaveDraft(event.currentTarget.value);
                }}
                mb="md"
                autosize
              />
              <Select
                label="AI 模型"
                placeholder="选择 AI 模型"
                data={[
                  { value: 'auto', label: '自动选择 (默认)' },
                  { value: 'deepseek-chat-free-trial', label: '免费试用模型 (DeepSeek-Chat)' },
                  ...availableAiModels,
                ]}
                value={selectedAiModelId}
                onChange={setSelectedAiModelId}
                mb="xs"
              />
              <Button
                onClick={handleSubmitAnswer}
                disabled={!userAnswer.trim()}
                loading={isSubmittingAnswer}
              >
                提交答案
              </Button>
              {isSubmittingAnswer && (
                <div style={{ marginTop: '10px' }}>
                  <Button onClick={handleStopScoring} variant="filled" color="red">
                    停止评分
                  </Button>
                </div>
              )}
              {scoreFeedback && (
                <Box
                  mt="md"
                  p="sm"
                  style={{ border: '1px solid #845ef7', borderRadius: 4, maxWidth: '700px' }}
                >
                  <Text fw={600}>评分反馈:</Text>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeKatex, rehypeMermaid, rehypeHighlight]}
                  >
                    {scoreFeedback}
                  </ReactMarkdown>
                </Box>
              )}
            </Box>
          ) : null}

          {current.type === 0 && (
            <Box>
              {' '}
              {/* Added margin-top for spacing */}
              <Text fw={600} mb="md">
                课程答疑
              </Text>
              <Box
                style={{
                  height: 300,
                  overflowY: 'auto',
                  border: '1px solid #eee',
                  borderRadius: 4,
                  padding: '10px',
                  marginBottom: '10px',
                }}
              >
                {chatMessages.length === 0 ? (
                  <Text c="dimmed">向AI提问课程相关内容...</Text>
                ) : (
                  chatMessages.map((msg, index) => (
                    <Box
                      key={index}
                      style={{
                        marginBottom: '10px',
                        textAlign: msg.role === 'user' ? 'right' : 'left',
                      }}
                    >
                      <Badge color={msg.role === 'user' ? 'blue' : 'grape'}>
                        {msg.role === 'user' ? '你' : 'AI'}
                      </Badge>
                      <Text style={{ wordBreak: 'break-word' }}>{msg.content}</Text>
                    </Box>
                  ))
                )}
              </Box>
              <Textarea
                placeholder="输入你的问题..."
                value={chatInput}
                onChange={(event) => setChatInput(event.currentTarget.value)}
                autosize
                minRows={2}
                mb="md"
              />
              <Select
                label="AI 模型"
                placeholder="选择 AI 模型"
                data={[
                  { value: 'auto', label: '自动选择 (默认)' },
                  { value: 'deepseek-chat-free-trial', label: '免费试用模型 (DeepSeek-Chat)' },
                  ...availableAiModels,
                ]}
                value={selectedAiModelId}
                onChange={setSelectedAiModelId}
                mb="xs"
              />
              <Button
                onClick={handleSendChatMessage}
                disabled={!chatInput.trim()}
                loading={isSendingChatMessage}
              >
                发送
              </Button>
              {isSendingChatMessage && (
                <div style={{ marginTop: '10px' }}>
                  <Button onClick={handleStopChat} variant="filled" color="red">
                    停止问答
                  </Button>
                </div>
              )}
            </Box>
          )}
        </Paper>
      </Group>

      <Group justify="center" mt="xl">
        {active > 0 && (
          <Button onClick={handlePreviousChapter} size="md" mr="md">
            上一章
          </Button>
        )}
        {active < chapters.length - 1 && (
          <Button onClick={handleNextChapter} size="md">
            下一章
          </Button>
        )}
      </Group>
    </Box>
  );
}
