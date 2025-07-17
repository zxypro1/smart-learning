import type { NextApiResponse } from 'next';
import { marked } from 'marked';
import { Pool } from 'pg';
import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';
import { AuthenticatedRequest, authenticateToken } from '../../utils/auth';

declare const mermaid: any; // Declare mermaid to satisfy TypeScript

async function getBrowser() {
  return puppeteer.launch({
    args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
    executablePath: await chromium.executablePath(
      `https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar`
    ),
    headless: 'shell',
    defaultViewport: {
      width: 1280,
      height: 800,
    }
  });
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
      let browser = null;
      try {
        let markdownContent = `# ${course.name}\n\n`;
        if (course.description) {
          markdownContent += `## 描述\n${course.description}\n\n`;
        }
        if (course.tags && course.tags.length > 0) {
          markdownContent += `## 标签\n${course.tags.map((tag: string) => `\`${tag}\``).join(', ')}\n\n`;
        }

        chapters.forEach((chapter: any) => {
          if (chapter.content) {
            markdownContent += `${chapter.content}\n\n`;
          }
        });

        // Configure marked to handle mermaid blocks
        const customRenderer = new marked.Renderer();
        customRenderer.code = ({ text, lang }: { text: string; lang?: string }) => {
          if (lang === 'mermaid') {
            return `<pre class="mermaid">${text}</pre>`;
          }
          return `<pre><code class="language-${lang}">${text}</code></pre>`; // Default rendering for other code blocks
        };

        marked.setOptions({
          renderer: customRenderer,
          gfm: true, // Enable GitHub Flavored Markdown
        });

        // Convert markdown to HTML
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${course.name}</title>
            <meta charset="utf-8">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.1.0/github-markdown.min.css">
            <style>
              @page {
                margin: 1in;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
                font-size: 12pt;
                line-height: 1.5;
              }
              .markdown-body {
                box-sizing: border-box;
                min-width: 200px;
                max-width: 980px;
                margin: 0 auto;
                padding: 45px;
              }
              @media (max-width: 767px) {
                .markdown-body {
                  padding: 15px;
                }
              }
              h1 {
                margin-top: 2em;
                margin-bottom: 1em;
              }
              h2 {
                margin-top: 1.5em;
                margin-bottom: 0.8em;
              }
              pre {
                page-break-inside: avoid;
              }
            </style>
            <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
          </head>
          <body>
            <article class="markdown-body">
              ${marked(markdownContent)}
            </article>
          </body>
          </html>
        `;

        browser = await getBrowser();
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        // Wait for mermaid to be defined on the window object
        await page.waitForFunction('window.mermaid !== undefined');
        await page.evaluate(() => {
          console.log('Attempting to initialize and run Mermaid...');
          mermaid.initialize({ startOnLoad: false, theme: 'default' }); // Force black text for PDF export
          mermaid.run();
          console.log('Mermaid initialization and run attempted.');
        });
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: `<div style="font-size: 10px; margin-left: 20px;">${course.name}</div>`,
          footerTemplate: `<div style="font-size: 10px; margin-right: 20px; text-align: right; width: 100%;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
          margin: { top: '1in', bottom: '1in', left: '1in', right: '1in' },
        });

        const fileName = `${course.name}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(fileName)}"`
        );
        res.status(200).send(pdfBuffer);
      } catch (error) {
        console.error('PDF generation failed:', error);
        res.status(500).json({ error: 'PDF 导出失败', details: (error as Error).message });
      } finally {
        if (browser) {
          await browser.close();
        }
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
