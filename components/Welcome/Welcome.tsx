import { MarkdownHooks } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { Box, Grid, Paper, Stack, Text, Textarea, Title } from '@mantine/core';
import { ErrorBoundary } from '@/pages/course';
import classes from './Welcome.module.css';

export function Welcome() {
  // 示例 Markdown 内容
  const markdownContent = `
# 习题说明

这里是一些 Markdown 格式的内容，可以包含：

* 列表项
* 代码示例
* 图片等

## 题目要求

请根据上面的内容回答下面的问题...
  `;

  return (
    <Grid gutter="xl" p="md" style={{ width: '100%', height: '100%' }}>
      {/* 左侧 Markdown 内容区 */}
      <Grid.Col span={{ base: 12, md: 6 }} style={{ height: '80vh' }}>
        <Paper p="md" withBorder style={{ height: '100%' }}>
          <Box className={classes.markdownContainer}>
            <ErrorBoundary>
              <MarkdownHooks
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex, rehypeHighlight]}
              >
                {markdownContent}
              </MarkdownHooks>
            </ErrorBoundary>
          </Box>
        </Paper>
      </Grid.Col>

      {/* 右侧答题区 */}
      <Grid.Col span={{ base: 12, md: 6 }} style={{ height: '80vh' }}>
        <Paper p="md" withBorder style={{ height: '100%' }}>
          <Stack>
            <Title order={3}>
              <Text
                inherit
                variant="gradient"
                component="span"
                gradient={{ from: 'pink', to: 'yellow' }}
              >
                请在此作答
              </Text>
            </Title>
            <Text color="dimmed" size="sm">
              请根据左侧内容完成回答
            </Text>
            <Textarea placeholder="在这里输入你的答案..." minRows={10} autosize maxRows={20} />
          </Stack>
        </Paper>
      </Grid.Col>
    </Grid>
  );
}
