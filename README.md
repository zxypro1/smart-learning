[简体中文](README.zh.md)

# Smart Learning - AI-Powered Intelligent Learning Platform

![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)

Smart Learning is an AI-driven online platform dedicated to transforming the way courses are created, learned, and shared. Users can leverage powerful AI capabilities to quickly generate well-structured and content-rich online courses from a simple idea.

## ✨ Key Features

*   **🤖 AI Course Generation**: Input a topic, and the AI will automatically generate a complete course outline and detailed chapter content for you.
*   **💻 Interactive Learning Experience**: Provides various learning tools such as Flashcards and Quizzes to reinforce learning outcomes.
*   **🌐 Course Marketplace & Community**: You can publish your created courses to the marketplace to share knowledge with other users, or learn from courses published by others.
*   **✍️ Course Studio**: Freely modify, refine, and manage your courses in a powerful editor.
*   **👤 Personalized Learning**: Offers personalized learning suggestions based on your progress and quiz results.

## 🛠️ Tech Stack

*   **Frontend**: [Next.js](https://nextjs.org/), [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/)
*   **UI Component Library**: [Mantine](https://mantine.dev/)
*   **Backend**: [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
*   **Database**: [PostgreSQL](https://www.postgresql.org/)
*   **ORM**: [Prisma](https://www.prisma.io/)
*   **Styling**: [PostCSS](https://postcss.org/), [Stylelint](https://stylelint.io/)
*   **Testing**: [Jest](https://jestjs.io/), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## 🚀 Local Development Setup

Follow these steps to set up and run the project in your local environment.

### 1. Prerequisites

*   [Node.js](https://nodejs.org/) (It is recommended to use the version specified in the `.nvmrc` file)
*   [npm](https://www.npmjs.com/) (Please do not use `yarn`)
*   [PostgreSQL](https://www.postgresql.org/download/) Database

### 2. Clone the Project

```bash
git clone https://github.com/your-username/smart-learning.git
cd smart-learning
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Set Up Environment Variables

Copy the `.env.example` file and rename it to `.env.local`.

```bash
cp .env.example .env.local
```

Then, modify the `DATABASE_URL` connection string and other necessary environment variables in the `.env.local` file according to your local setup.

### 5. Database Migration

Prisma manages the database schema based on the `prisma/schema.prisma` file. Run the following command to sync your database schema:

```bash
npx prisma migrate dev
```

### 6. Run the Development Server

```bash
npm run dev
```

> **Note**: According to the project's context, the `npm run dev` command might get stuck. If you encounter this issue, try restarting it or checking your environment configuration.

Now, you can open `http://localhost:3000` in your browser to access the project.

## ✅ Testing

Use the following command to run the Jest test suite:

```bash
npm test
```

## 🤝 Contributing

We welcome all forms of contributions! If you have any ideas, suggestions, or have found a bug, please feel free to open an Issue or submit a Pull Request.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
