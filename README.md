# MoAI Rank

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://rank.mo.ai.kr)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)

**The Claude Code Usage Leaderboard for Korean Developers**

> Track your Claude Code token usage, compete with fellow developers, and showcase your AI-powered development productivity.

[Live Site](https://rank.mo.ai.kr) | [Korean Documentation](README.ko.md)

---

## :star: What is MoAI Rank?

MoAI Rank is an open-source leaderboard platform that tracks Claude Code token usage among Korean developers. It provides:

- **Real-time Rankings** - Daily, weekly, monthly, and all-time leaderboards
- **Usage Analytics** - Detailed token usage statistics and efficiency metrics
- **CLI Integration** - Seamless terminal experience via MoAI-ADK
- **Privacy Controls** - Full control over your data visibility

### Why MoAI Rank?

Claude Code has transformed how developers write code, but there's no way to measure and compare usage patterns across the community. MoAI Rank fills this gap by providing:

- A friendly competitive environment to motivate productive Claude Code usage
- Insights into your own development patterns and token efficiency
- Community benchmarks to understand how others utilize AI coding assistants

---

## :rocket: Getting Started

### 1. Sign Up via GitHub

Visit [rank.mo.ai.kr](https://rank.mo.ai.kr) and sign in with your GitHub account. We use GitHub OAuth for authentication to ensure secure, password-less access.

### 2. Generate Your API Key

After signing in, navigate to your **Dashboard** to generate a personal API key. This key is required for CLI integration and will be displayed only once - save it securely!

> **Important**: Your API key is hashed before storage. We never store your raw API key on our servers.

### 3. Install MoAI-ADK

MoAI Rank integrates with [MoAI-ADK](https://github.com/moai-project/moai-adk), the AI Development Kit that enhances your Claude Code experience.

```bash
# Install MoAI-ADK
pip install moai-adk

# Register with your API key
moai rank register
```

### 4. Start Tracking

Once registered, your Claude Code sessions will be automatically tracked and submitted to the leaderboard!

---

## :computer: CLI Usage Guide

MoAI Rank provides a powerful CLI interface through MoAI-ADK.

### Command Reference

| Command                 | Description                       | Options               |
| ----------------------- | --------------------------------- | --------------------- |
| `moai rank register`    | Register with GitHub OAuth        | -                     |
| `moai rank status`      | Check your current rank and stats | -                     |
| `moai rank leaderboard` | View the leaderboard              | `--period`, `--limit` |
| `moai rank verify`      | Verify your API key is valid      | -                     |
| `moai rank logout`      | Delete stored credentials         | -                     |

### Detailed Command Usage

#### Register

Start the GitHub OAuth flow to register your account and obtain an API key.

```bash
moai rank register
```

This will:

1. Open your browser for GitHub authentication
2. Link your GitHub account to MoAI Rank
3. Generate and store your API key locally

#### Check Status

View your current ranking and usage statistics.

```bash
moai rank status
```

Example output:

```
MoAI Rank Status for @your-username

Rankings:
  Daily:    #12 of 156 participants
  Weekly:   #8 of 342 participants
  Monthly:  #15 of 523 participants
  All-time: #42 of 1,205 participants

Stats:
  Total Tokens:    2,450,000
  Total Sessions:  127
  Input Tokens:    1,200,000
  Output Tokens:   1,250,000
```

#### View Leaderboard

Display the current leaderboard rankings.

```bash
# Default: weekly leaderboard, top 10
moai rank leaderboard

# View daily leaderboard
moai rank leaderboard --period daily

# View monthly leaderboard with custom limit
moai rank leaderboard --period monthly --limit 25

# Available periods: daily, weekly, monthly, all_time
```

#### Verify API Key

Confirm your API key is valid and properly configured.

```bash
moai rank verify
```

#### Logout

Remove your stored credentials from the local machine.

```bash
moai rank logout
```

---

## :shield: Security & Privacy

**Your privacy is our top priority.** MoAI Rank is designed with security and transparency at its core.

### What Data We Collect

| Data              | Purpose                                      | Storage                 |
| ----------------- | -------------------------------------------- | ----------------------- |
| GitHub Username   | Public display (unless privacy mode enabled) | Plain text              |
| GitHub Avatar URL | Profile display                              | Plain text              |
| Token Usage       | Ranking calculation                          | Aggregated numbers only |
| Session Count     | Statistics                                   | Count only              |

### What We Do NOT Collect

- **No Code Content** - We never access your code or conversations
- **No Project Names** - Project identifiers are anonymized
- **No File Paths** - No information about your project structure
- **No Prompt Content** - Your interactions with Claude remain private
- **No Raw API Keys** - Only hashed versions are stored

### Privacy Controls

- **Privacy Mode** - Enable to appear as "User #X" on leaderboards
- **Data Export** - Request a full export of your data anytime
- **Account Deletion** - Permanently delete all your data with one click

### Security Measures

- **HMAC Authentication** - API requests are signed with HMAC-SHA256
- **Hashed Credentials** - API keys are salted and hashed before storage
- **Audit Logging** - All security events are logged for monitoring
- **Rate Limiting** - Protection against abuse and attacks
- **HTTPS Only** - All traffic is encrypted in transit

### Why Open Source?

MoAI Rank is fully open source because **trust requires transparency**. You can:

- Audit every line of code that handles your data
- Self-host your own instance if desired
- Verify our privacy claims through code review
- Contribute improvements and security fixes

---

## :bulb: About MoAI-ADK

[MoAI-ADK](https://github.com/moai-project/moai-adk) (AI Development Kit) is a comprehensive toolkit that enhances your Claude Code development experience. It provides:

- **Intelligent Workflows** - Automated development workflows with AI
- **Agent Orchestration** - Specialized AI agents for different tasks
- **Quality Assurance** - Built-in TDD and code quality tools
- **Documentation Generation** - Automated documentation from code

MoAI Rank is one of many integrations available through MoAI-ADK. Install the full toolkit to unlock its complete potential:

```bash
pip install moai-adk
moai init  # Initialize in your project
```

Learn more at [github.com/moai-project/moai-adk](https://github.com/moai-project/moai-adk)

---

## :wrench: Tech Stack

- **Framework**: Next.js 16 with App Router
- **UI**: React 19, Tailwind CSS, Radix UI
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Authentication**: Clerk (GitHub OAuth)
- **Deployment**: Vercel
- **Package Manager**: Bun
- **Monorepo**: Turborepo

---

## :handshake: Contributing

We welcome contributions from the community! Here's how you can help:

### Development Setup

```bash
# Clone the repository
git clone https://github.com/GoosLab/moai-rank.git
cd moai-rank

# Install dependencies
bun install

# Set up environment variables
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your credentials

# Run database migrations
cd apps/web && bun run db:push

# Start development server
bun run dev
```

### Environment Variables

Required variables for local development:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database
DATABASE_URL=postgresql://...

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Contribution Guidelines

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes with clear messages
4. **Push** to your branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

Please ensure your code:

- Passes all linting checks (`bun run lint`)
- Includes appropriate tests
- Follows the existing code style
- Has clear commit messages

---

## :scroll: License

MoAI Rank is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

### What This Means (Copyleft)

The AGPL-3.0 is a **copyleft** license, which means:

- **Freedom to Use**: Use the software for any purpose
- **Freedom to Study**: Access and modify the source code
- **Freedom to Share**: Distribute copies to others
- **Freedom to Improve**: Distribute your modifications

**The Copyleft Condition**: If you modify MoAI Rank and make it available over a network (like running a modified version as a web service), you **must** also make your source code available under the same AGPL-3.0 license.

This ensures that improvements to MoAI Rank benefit the entire community, and no one can create a closed-source version of the software.

See the [LICENSE](LICENSE) file for the full license text.

---

## :link: Links

- **Live Site**: [rank.mo.ai.kr](https://rank.mo.ai.kr)
- **GitHub**: [github.com/GoosLab/moai-rank](https://github.com/GoosLab/moai-rank)
- **MoAI-ADK**: [github.com/moai-project/moai-adk](https://github.com/moai-project/moai-adk)

---

<p align="center">
  Made with :heart: by the Korean Claude Code Community
</p>
