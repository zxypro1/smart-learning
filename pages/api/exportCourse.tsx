import type { NextApiResponse } from 'next';
import { Pool } from 'pg';
import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToStream, Font } from '@react-pdf/renderer';
import Html from 'react-pdf-html';
import { marked } from 'marked';
import { run } from '@mermaid-js/mermaid-cli';
import texsvg from 'texsvg';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { AuthenticatedRequest, authenticateToken } from '../../utils/auth';



const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Clean SVG content for react-pdf compatibility
function cleanSvgForPdf(svgContent: string): string {
  // Remove unsupported SVG style properties
  const unsupportedStyles = [
    'fill',
    'stroke',
    'strokeWidth',
    'strokeDasharray',
    'strokeDashoffset',
    'textAnchor',
    'cursor',
    'clipPath',
    'mask',
    'filter',
    'opacity',
    'fillOpacity',
    'strokeOpacity'
  ];
  
  let cleanedSvg = svgContent;
  
  // Remove style attributes containing unsupported properties
  unsupportedStyles.forEach(style => {
    const styleRegex = new RegExp(`${style}="[^"]*"`, 'g');
    cleanedSvg = cleanedSvg.replace(styleRegex, '');
    
    // Also remove from style attributes
    const inlineStyleRegex = new RegExp(`${style}:[^;]*;?`, 'g');
    cleanedSvg = cleanedSvg.replace(inlineStyleRegex, '');
  });
  
  // Clean up empty style attributes
  cleanedSvg = cleanedSvg.replace(/style="[\s]*"/g, '');
  cleanedSvg = cleanedSvg.replace(/style='[\s]*'/g, '');
  
  return cleanedSvg;
}

// Register Chinese font using direct font file
Font.register({
  family: 'NotoSansSC',
  src: '../../public/fonts/NotoSansSC-Regular.ttf',
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'NotoSansSC',
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
    fontFamily: 'NotoSansSC',
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'NotoSansSC',
  },
  heading: {
    fontSize: 18,
    marginBottom: 10,
    fontFamily: 'NotoSansSC',
  },
  text: {
    fontSize: 12,
    marginBottom: 5,
    fontFamily: 'NotoSansSC',
  },
  html: {
    fontSize: 12,
    marginBottom: 5,
    fontFamily: 'NotoSansSC',
  },
});

interface Chapter {
  charpter: number;
  charpter_title: string;
  content: string;
  type: string;
  score: number;
}

interface Course {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

interface PdfDocumentProps {
  course: Course;
  chapters: Chapter[];
}

const PdfDocument = ({ course, chapters }: PdfDocumentProps) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.title}>{course.name}</Text>
          {course.description && <Text style={styles.text}>{course.description}</Text>}
          {course.tags && course.tags.length > 0 && (
            <Text style={styles.text}>Tags: {course.tags.join(', ')}</Text>
          )}
        </View>
        {chapters.map((chapter) => (
          <View key={chapter.charpter} style={styles.section}>
            <Text style={styles.heading}>{chapter.charpter_title}</Text>
            {chapter.content && (
              <Html style={styles.html} stylesheet={styles.html}>
                {String(chapter.content)}
              </Html>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
};

async function exportCourseHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只允许 GET 请求' });
  }

  const { id, format } = req.query;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (!id) {
    return res.status(400).json({ error: '缺少课程id' });
  }

  const client = await pool.connect();
  try {
    const courseResult = await client.query(
      'SELECT id, name, description, tags FROM courses WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: '未找到该课程或无权访问' });
    }
    const course = courseResult.rows[0];

    const chaptersResult = await client.query(
      'SELECT charpter, charpter_title, content, type, score FROM chapters WHERE course_id = $1 ORDER BY charpter',
      [id]
    );
    const chapters = chaptersResult.rows;

    if (format === 'markdown') {
      let markdownContent = `# ${course.name}

`;
      if (course.description) {
        markdownContent += `## 描述
${course.description}

`;
      }
      if (course.tags && course.tags.length > 0) {
        markdownContent += `## 标签
${course.tags.map((tag: string) => `"${tag}"`).join(', ')}

`;
      }

      chapters.forEach((chapter: any) => {
        if (chapter.content) {
          markdownContent += `${chapter.content}

`;
        }
      });

      const fileName = `${course.name}.md`;
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileName)}"`
      );
      res.status(200).send(markdownContent);
    } else if (format === 'pdf') {
      try {
        // Configure marked options
        marked.setOptions({
          gfm: true,
        });

        // Pre-process chapters to handle Mermaid diagrams and KaTeX
        const processedChapters = await Promise.all(chapters.map(async (chapter: Chapter) => {
          if (chapter.content) {
            let newContent = chapter.content;

            // Process Mermaid diagrams
            const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
            let mermaidMatch;
            const mermaidPromises: Promise<void>[] = [];

            // Reset regex lastIndex before iterating
            mermaidRegex.lastIndex = 0;
            while ((mermaidMatch = mermaidRegex.exec(chapter.content)) !== null) {
              const mermaidCode = mermaidMatch[1];
              const fullMatch = mermaidMatch[0];
              mermaidPromises.push((async () => {
                try {
                  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mermaid-'));
                  const inputFilePath = path.join(tmpDir, 'diagram.mmd');
                  const outputFilePath = path.join(tmpDir, 'diagram.svg');
                  await fs.promises.writeFile(inputFilePath, mermaidCode);

                  await run(inputFilePath, outputFilePath as `${string}.svg`, { outputFormat: 'svg' });
                  const svg = await fs.promises.readFile(outputFilePath, 'utf8');
                  const cleanedSvg = cleanSvgForPdf(svg);
                  newContent = newContent.replace(fullMatch, `<div class="mermaid-diagram">${cleanedSvg}</div>`);
                  await fs.promises.rm(tmpDir, { recursive: true, force: true });
                } catch (error) {
                  console.error('Mermaid rendering failed:', error);
                  newContent = newContent.replace(fullMatch, `<pre><code>${mermaidCode}</code></pre>`);
                }
              })());
            }
            await Promise.all(mermaidPromises);

            // Process KaTeX equations (display math only for now)
            const katexRegex = /\$\$([\s\S]*?)\$\$/g;
            let katexMatch;
            const katexPromises: Promise<void>[] = [];

            // Reset regex lastIndex before iterating
            katexRegex.lastIndex = 0;
            while ((katexMatch = katexRegex.exec(chapter.content)) !== null) {
              const katexCode = katexMatch[1];
              const fullMatch = katexMatch[0];
              katexPromises.push((async () => {
                try {
                  // texsvg expects a LaTeX string, so wrap it with $$. It also needs to be escaped.
                  const svg = await texsvg(`$$${katexCode.replace(/\\/g, '\\\\')} $$`);
                  const cleanedSvg = cleanSvgForPdf(svg);
                  newContent = newContent.replace(fullMatch, `<div class="katex-equation">${cleanedSvg}</div>`);
                } catch (error) {
                  console.error('KaTeX rendering failed:', error);
                  newContent = newContent.replace(fullMatch, `<pre><code>${katexCode}</code></pre>`);
                }
              })());
            }
            await Promise.all(katexPromises);

            return { ...chapter, content: newContent };
          }
          return chapter;
        }));

        const stream = await renderToStream(<PdfDocument course={course} chapters={processedChapters} />);
        const fileName = `${course.name}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(fileName)}"`
        );
        stream.pipe(res);
      } catch (error) {
        console.error('PDF generation failed:', error);
        res.status(500).json({ error: 'PDF 导出失败', details: (error as Error).message });
      }
    } else {
      // Default to JSON export
      const exportData = {
        course,
        chapters,
      };
      const fileName = `${course.name}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileName)}"`
      );
      res.status(200).send(JSON.stringify(exportData, null, 2));
    }
  } catch (error) {
    res.status(500).json({ error: '导出课程失败', details: (error as Error).message });
  } finally {
    client.release();
  }
}

export default authenticateToken(exportCourseHandler);
