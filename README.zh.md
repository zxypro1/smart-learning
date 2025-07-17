[English](README.md)

# Smart Learning - AI 驱动的智能学习平台

![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)

Smart Learning 是一个由 AI 驱动的在线平台，致力于改变课程的创建、学习和分享方式。用户可以借助强大的 AI 功能，从一个简单的想法开始，快速生成结构完整、内容丰富的在线课程。

## ✨ 主要功能

* **🤖 AI 课程生成**: 输入一个主题，AI 将自动为你生成完整的课程大纲和详细的章节内容。
* **🌐 课程市场与社区**: 你可以将创建的课程发布到市场，与其他用户分享知识，也可以学习他人发布的课程。
* **✍️ 课程工作室**: 在一个功能强大的编辑器中，自由地修改、完善和管理你的课程。
* **👤 个性化学习**: 根据你的学习进度和测验结果，提供个性化的学习建议。

## 🛠️ 技术栈

* **前端**: [Next.js](https://nextjs.org/), [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/)
* **UI 组件库**: [Mantine](https://mantine.dev/)
* **后端**: [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
* **数据库**: [PostgreSQL](https://www.postgresql.org/)
* **ORM**: [Prisma](https://www.prisma.io/)
* **样式**: [PostCSS](https://postcss.org/), [Stylelint](https://stylelint.io/)
* **测试**: [Jest](https://jestjs.io/), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## 🚀 本地开发设置

请按照以下步骤在你的本地环境中设置和运行项目。

### 1. 环境准备

* [Node.js](https://nodejs.org/) (建议使用 `.nvmrc` 文件中指定的版本)
* [npm](https://www.npmjs.com/) (请勿使用 `yarn`)
* [PostgreSQL](https://www.postgresql.org/download/) 数据库

### 2. 克隆项目

```bash
git clone https://github.com/your-username/smart-learning.git
cd smart-learning
```

### 3. 安装依赖

```bash
npm install
```

### 4. 设置环境变量

复制 `.env.example` 文件并重命名为 `.env.local`。

```bash
cp .env.example .env.local
```

然后，根据你的本地环境配置，修改 `.env.local` 文件中的数据库连接字符串 `DATABASE_URL` 和其他必要的环境变量。

### 5. 数据库迁移

Prisma 将根据 `prisma/schema.prisma` 文件来管理数据库结构。运行以下命令来同步数据库结构：

```bash
npx prisma migrate dev
```

### 6. 运行开发服务器

```bash
npm run dev
```

> **注意**: 根据项目提示，`npm run dev` 命令可能会卡住。如果遇到此问题，请尝试重新启动或检查环境配置。

现在，你可以在浏览器中打开 `http://localhost:3000` 来访问项目。

## ✅ 测试

使用以下命令来运行 Jest 测试用例：

```bash
npm test
```

## 🤝 贡献

我们欢迎各种形式的贡献！如果你有任何想法、建议或发现了 Bug，请随时提出 Issue 或提交 Pull Request。

## 📄 开源许可

该项目基于 [MIT License](LICENSE) 开源。
